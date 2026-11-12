package expo.modules.signalstrength

import java.io.ByteArrayOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.URL
import kotlin.random.Random

/**
 * Ağ teşhis araçları (Bağlantı Bilgisi sekmesi). Hepsi arka plan iş parçacığında çağrılır.
 * Ölçüm native tarafta yapılır; JS köprüsünün gecikmesi sonuca eklenmez.
 */
internal object NetTools {

  /**
   * Tek bir DNS sorgusunun yanıt süresi (ms). Sunucuya doğrudan UDP 53 ile "host" için A kaydı
   * sorulur (telefonun DNS ayarı kullanılmaz; her sunucu ayrı ölçülür). Zaman aşımı / hata → null.
   * server bir IP adresi olmalıdır (ad çözümlemesi yapılmaz).
   */
  fun dnsQueryMs(server: String, host: String, timeoutMs: Int): Double? = try {
    val id = Random.nextInt(0, 0x10000)
    val q = ByteArrayOutputStream().apply {
      write(id shr 8); write(id and 0xff)
      write(0x01); write(0x00) // standart sorgu, özyineleme istenir (RD)
      write(0); write(1) // 1 soru
      repeat(6) { write(0) } // yanıt / yetki / ek kayıt sayıları
      for (label in host.trim('.').split('.')) {
        val b = label.toByteArray(Charsets.US_ASCII)
        write(b.size); write(b, 0, b.size)
      }
      write(0)
      write(0); write(1) // tür A
      write(0); write(1) // sınıf IN
    }.toByteArray()
    DatagramSocket().use { socket ->
      socket.soTimeout = timeoutMs
      val address = InetAddress.getByName(server) // IP verildiği için ağa çıkmaz
      val buf = ByteArray(512)
      val reply = DatagramPacket(buf, buf.size)
      val t0 = System.nanoTime()
      socket.send(DatagramPacket(q, q.size, address, 53))
      socket.receive(reply)
      val t1 = System.nanoTime()
      val sameId = ((buf[0].toInt() and 0xff) shl 8 or (buf[1].toInt() and 0xff)) == id
      val isAnswer = (buf[2].toInt() and 0x80) != 0
      if (sameId && isAnswer) (t1 - t0) / 1_000_000.0 else null
    }
  } catch (e: Exception) {
    null
  }

  /**
   * Bir web servisine gecikme (ms): önce bağlantı kurulur (TCP + TLS, sayılmaz), sonra aynı
   * bağlantı üzerinden "count" kez küçük bir HEAD isteği gönderilir. Yönlendirme izlenmez;
   * 500'den küçük her yanıt başarılı sayılır. Zaman aşımı / hata → listede null.
   */
  fun httpLatencyMs(url: String, count: Int, timeoutMs: Int): List<Double?> {
    fun once(): Double? = try {
      val conn = URL(url).openConnection() as HttpURLConnection
      conn.requestMethod = "HEAD"
      conn.instanceFollowRedirects = false
      conn.connectTimeout = timeoutMs
      conn.readTimeout = timeoutMs
      conn.useCaches = false
      val t0 = System.nanoTime()
      val code = conn.responseCode
      val t1 = System.nanoTime()
      // Akışı kapat: bağlantı havuzda açık kalsın, sonraki istek aynı bağlantıyı kullansın
      runCatching { (if (code >= 400) conn.errorStream else conn.inputStream)?.close() }
      val ms = (t1 - t0) / 1_000_000.0
      if (code in 100..499 && ms <= timeoutMs) ms else null
    } catch (e: Exception) {
      null
    }
    once() // bağlantı kurulumu
    return List(count) { once() }
  }
}