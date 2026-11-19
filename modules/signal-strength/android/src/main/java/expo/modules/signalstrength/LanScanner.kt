package expo.modules.signalstrength

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import expo.modules.kotlin.Promise
import java.net.ConnectException
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Wi-Fi ağındaki cihazları bulur ("Ağdaki cihazlar"). Yalnızca kullanıcı "Ağı tara"ya dokununca çalışır.
 *
 * Android 10+ uygulamalara MAC adreslerini ve ARP tablosunu vermez; bu yüzden cihazlar şöyle bulunur:
 * 1. Alt ağdaki (en fazla 254) her adrese birkaç yaygın porta kısa TCP bağlantısı denenir. Bağlantı
 *    kurulursa ya da cihaz "reddedildi" yanıtı verirse (port kapalı ama cihaz açık) cihaz var sayılır.
 * 2. Aynı anda ağdaki duyurular (mDNS / NSD: Chromecast, AirPlay, yazıcı…) dinlenir; cihaz adı ve türü
 *    buradan gelir.
 * 3. Bulunan adresler için modemin DNS'inden ad sorulur (ör. "android-…", "iPhone").
 * Güvenlik duvarı olan ya da uyuyan cihazlar görünmeyebilir.
 *
 * İzin: yalnızca INTERNET (targetSdk 36). targetSdk 37'ye (Android 17) geçildiğinde yerel ağ erişimi
 * ACCESS_LOCAL_NETWORK çalışma zamanı iznine bağlanır; o zaman bu izin manifest'e eklenip
 * taramadan önce istenmelidir.
 */
object LanScanner {
  private val PORTS = intArrayOf(80, 443, 62078, 445, 8008, 22, 554, 9100, 8080, 5000)
  private const val CONNECT_TIMEOUT_MS = 220
  private const val THREADS = 48
  private const val MAX_HOSTS = 254
  private const val NSD_LISTEN_MS = 5000L
  private const val NAME_TIMEOUT_MS = 1500L

  // Ad ve tür için dinlenen duyurular
  private val SERVICE_TYPES = listOf(
    "_googlecast._tcp.", "_airplay._tcp.", "_raop._tcp.", "_spotify-connect._tcp.",
    "_ipp._tcp.", "_printer._tcp.", "_pdl-datastream._tcp.", "_hap._tcp.",
    "_smb._tcp.", "_companion-link._tcp.", "_androidtvremote2._tcp.", "_http._tcp.",
  )

  private data class Found(val openPorts: MutableSet<Int> = ConcurrentHashMap.newKeySet())

  fun scan(context: Context, promise: Promise) {
    val app = context.applicationContext
    val cm = app.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
    val wifi = cm?.let { findWifi(it) }
    if (cm == null || wifi == null) {
      promise.resolve(mapOf("status" to "noWifi"))
      return
    }
    val lp = cm.getLinkProperties(wifi)
    val link = lp?.linkAddresses?.firstOrNull { it.address is Inet4Address }
    if (link == null) {
      promise.resolve(mapOf("status" to "noWifi"))
      return
    }
    val self = link.address as Inet4Address
    val gateway = lp.routes.filter { it.isDefaultRoute }.mapNotNull { it.gateway }
      .firstOrNull { it is Inet4Address && !it.isAnyLocalAddress }?.hostAddress

    Thread {
      try {
        val (hosts, truncated) = hostsOf(self, link.prefixLength)
        val services = ConcurrentHashMap<String, MutableList<Map<String, String>>>()
        val stopNsd = startNsd(app, services)

        // 1) Adres taraması (bu ağa bağlı soketlerle; VPN açıksa da Wi-Fi üzerinden)
        val found = ConcurrentHashMap<String, Found>()
        val pool = Executors.newFixedThreadPool(THREADS)
        for (host in hosts) {
          if (host == self.hostAddress) continue
          pool.execute { probe(wifi, host)?.let { found[host] = it } }
        }
        pool.shutdown()
        pool.awaitTermination(60, TimeUnit.SECONDS)

        // 2) Duyuruların tamamlanması için kısa bir bekleme, sonra dinlemeyi bırak
        Thread.sleep(500)
        stopNsd()

        // Duyurusu olup taramada yanıt vermeyen cihazlar da listeye girer
        for (ip in services.keys) if (ip != self.hostAddress) found.putIfAbsent(ip, Found())
        if (gateway != null) found.putIfAbsent(gateway, Found())

        // 3) Adlar (paralel, süre sınırlı)
        val names = ConcurrentHashMap<String, String>()
        val namePool = Executors.newFixedThreadPool(16)
        for (ip in found.keys) {
          namePool.execute {
            runCatching {
              val n = InetAddress.getByName(ip).canonicalHostName
              if (n != null && n != ip) names[ip] = n
            }
          }
        }
        namePool.shutdown()
        namePool.awaitTermination(NAME_TIMEOUT_MS * 2, TimeUnit.MILLISECONDS)
        namePool.shutdownNow()

        val devices = found.map { (ip, f) ->
          mapOf(
            "ip" to ip,
            "hostname" to names[ip],
            "openPorts" to f.openPorts.sorted(),
            "services" to (services[ip] ?: emptyList<Map<String, String>>()),
            "isGateway" to (ip == gateway),
            "isSelf" to false,
          )
        } + mapOf(
          "ip" to self.hostAddress,
          "hostname" to Build.MODEL,
          "openPorts" to emptyList<Int>(),
          "services" to emptyList<Map<String, String>>(),
          "isGateway" to false,
          "isSelf" to true,
        )
        promise.resolve(
          mapOf(
            "status" to "ok",
            "selfIp" to self.hostAddress,
            "prefix" to link.prefixLength,
            "gateway" to gateway,
            "truncated" to truncated,
            "devices" to devices,
          )
        )
      } catch (e: Throwable) {
        promise.resolve(mapOf("status" to "error", "message" to e.toString()))
      }
    }.start()
  }

  private fun findWifi(cm: ConnectivityManager): Network? {
    @Suppress("DEPRECATION")
    return cm.allNetworks.firstOrNull { n ->
      cm.getNetworkCapabilities(n)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    }
  }

  /** Taranacak adresler: alt ağ /24'ten büyükse yalnızca telefonun bulunduğu /24 */
  private fun hostsOf(self: Inet4Address, prefix: Int): Pair<List<String>, Boolean> {
    val p = prefix.coerceIn(24, 30)
    val ip = self.address.fold(0L) { acc, b -> (acc shl 8) or (b.toLong() and 0xff) }
    val mask = (0xffffffffL shl (32 - p)) and 0xffffffffL
    val net = ip and mask
    val count = (1L shl (32 - p)) - 2
    val hosts = (1..count.coerceAtMost(MAX_HOSTS.toLong())).map { i ->
      val a = net + i
      "${(a shr 24) and 0xff}.${(a shr 16) and 0xff}.${(a shr 8) and 0xff}.${a and 0xff}"
    }
    return hosts to (prefix < 24)
  }

  /** Bir adrese yaygın portlarla bağlanmayı dener; cihaz varsa açık portlarıyla döner */
  private fun probe(network: Network, host: String): Found? {
    val f = Found()
    var alive = false
    for (port in PORTS) {
      val socket = runCatching { network.socketFactory.createSocket() as Socket }.getOrNull() ?: Socket()
      try {
        socket.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
        f.openPorts.add(port)
        alive = true
      } catch (e: ConnectException) {
        // "Bağlantı reddedildi": port kapalı ama cihaz orada
        if (e.message?.contains("ECONNREFUSED") == true || e.message?.contains("refused", true) == true) alive = true
      } catch (_: Exception) {
        // Zaman aşımı: bu portta yanıt yok
      } finally {
        runCatching { socket.close() }
      }
      // Cihaz bulunduysa yalnızca birkaç port daha denenir (tür tahmini için), süre uzamasın
      if (alive && f.openPorts.size >= 2) break
    }
    return if (alive) f else null
  }

  /** Ağdaki duyuruları dinler; IP → [{type, name}] doldurur. Dönen fonksiyon dinlemeyi durdurur. */
  private fun startNsd(context: Context, out: ConcurrentHashMap<String, MutableList<Map<String, String>>>): () -> Unit {
    val nsd = context.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return {}
    val listeners = mutableListOf<NsdManager.DiscoveryListener>()
    val resolveQueue = java.util.concurrent.LinkedBlockingQueue<NsdServiceInfo>()
    val running = AtomicBoolean(true)

    // Eski Android'lerde aynı anda tek çözümleme yapılabildiği için sırayla
    val resolver = Thread {
      while (running.get()) {
        val info = resolveQueue.poll(200, TimeUnit.MILLISECONDS) ?: continue
        val done = CountDownLatch(1)
        runCatching {
          @Suppress("DEPRECATION")
          nsd.resolveService(info, object : NsdManager.ResolveListener {
            override fun onResolveFailed(s: NsdServiceInfo?, code: Int) = done.countDown()
            override fun onServiceResolved(s: NsdServiceInfo?) {
              @Suppress("DEPRECATION")
              val ip = (s?.host as? Inet4Address)?.hostAddress
              if (ip != null) {
                out.getOrPut(ip) { java.util.Collections.synchronizedList(mutableListOf()) }
                  .add(mapOf("type" to (s?.serviceType ?: ""), "name" to (s?.serviceName ?: "")))
              }
              done.countDown()
            }
          })
        }.onFailure { done.countDown() }
        done.await(1500, TimeUnit.MILLISECONDS)
      }
    }
    resolver.start()

    for (type in SERVICE_TYPES) {
      val l = object : NsdManager.DiscoveryListener {
        override fun onServiceFound(info: NsdServiceInfo) {
          if (running.get()) resolveQueue.offer(info)
        }
        override fun onServiceLost(info: NsdServiceInfo) {}
        override fun onDiscoveryStarted(t: String) {}
        override fun onDiscoveryStopped(t: String) {}
        override fun onStartDiscoveryFailed(t: String, code: Int) {}
        override fun onStopDiscoveryFailed(t: String, code: Int) {}
      }
      runCatching {
        nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, l)
        listeners.add(l)
      }
    }
    val started = System.currentTimeMillis()
    return {
      // Duyurular için en az NSD_LISTEN_MS dinlenmiş olsun
      val left = NSD_LISTEN_MS - (System.currentTimeMillis() - started)
      if (left > 0) Thread.sleep(left)
      running.set(false)
      listeners.forEach { runCatching { nsd.stopServiceDiscovery(it) } }
      runCatching { resolver.join(2000) }
    }
  }
}