// scripts/build-privacy-page.mjs
// Gizlilik politikasının web sayfasını uygulamadaki metinden üretir.
// Kaynak: src/privacy/policy.json → Çıktı: docs/privacy/index.html
// Kullanım: node scripts/build-privacy-page.mjs   (policy.json her değiştiğinde çalıştırın)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const policy = JSON.parse(readFileSync(new URL('src/privacy/policy.json', root), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Uygulamadaki Inline bileşeniyle aynı kurallar: **kalın**, https://… ve e-posta bağlantıları
const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s]+[^\s.,;:)]|[\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi;
const inline = (text) =>
  text
    .split(TOKEN)
    .map((part, i) => {
      if (i % 2 === 0) return esc(part);
      if (part.startsWith('**')) return `<strong>${esc(part.slice(2, -2))}</strong>`;
      const href = part.includes('@') && !part.startsWith('http') ? `mailto:${part}` : part;
      return `<a href="${esc(href)}">${esc(part)}</a>`;
    })
    .join('');

const block = (b) => {
  if (b.h2) return `<h2>${esc(b.h2)}</h2>`;
  if (b.h3) return `<h3>${esc(b.h3)}</h3>`;
  if (b.list) return `<ul>${b.list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`;
  if (b.table) {
    const [head, ...rows] = b.table;
    return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  }
  return `<p>${inline(b.p ?? '')}</p>`;
};

const article = (lang) => {
  const p = policy[lang];
  return `<article id="${lang}" lang="${lang}"${lang === 'en' ? ' hidden' : ''}>
<h1>${esc(p.title)}</h1>
<p>${p.meta.map(([k, v]) => `<strong>${esc(k)}:</strong> ${inline(v)}`).join('<br>\n')}</p>
${p.blocks.map(block).join('\n')}
</article>`;
};

const html = `<!doctype html>
<!-- Bu dosya scripts/build-privacy-page.mjs ile src/privacy/policy.json'dan üretilir; elle düzenlemeyin. -->
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gizlilik Politikası · Privacy Policy — Sinyal Ölçer</title>
<meta name="description" content="Sinyal Ölçer (Signal Strength) Android uygulamasının gizlilik politikası.">
<style>
  :root { --bg:#F1F5F9; --card:#FFFFFF; --text:#0F172A; --muted:#475569; --line:#E2E8F0; --accent:#15803D; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0F172A; --card:#1E293B; --text:#F1F5F9; --muted:#94A3B8; --line:#334155; --accent:#22C55E; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:760px; margin:0 auto; padding:24px 16px 48px; }
  .bar { display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px; }
  .bar button { border:1px solid var(--line); background:var(--card); color:var(--text); padding:6px 14px; border-radius:999px; font:inherit; font-weight:600; cursor:pointer; }
  .bar button[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#fff; }
  article { overflow-wrap:anywhere; background:var(--card); border-radius:16px; padding:8px 20px 20px; }
  article[hidden] { display:none; }
  h1 { font-size:1.5rem; line-height:1.3; }
  h2 { font-size:1.15rem; margin-top:1.8em; padding-top:1em; border-top:1px solid var(--line); }
  h3 { font-size:1rem; }
  a { color:var(--accent); }
  table { width:100%; border-collapse:collapse; font-size:.95rem; }
  th, td { text-align:left; padding:8px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
</style>
</head>
<body>
<main>
  <div class="bar">
    <button type="button" data-lang="tr">TR</button>
    <button type="button" data-lang="en">EN</button>
  </div>
${article('tr')}
${article('en')}
</main>
<script>
  // Dil: ?lang=tr|en → yoksa tarayıcı dili (tr* → Türkçe, diğerleri İngilizce)
  function show(lang) {
    document.getElementById('tr').hidden = lang !== 'tr';
    document.getElementById('en').hidden = lang !== 'en';
    document.documentElement.lang = lang;
    document.querySelectorAll('.bar button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
  }
  var q = new URLSearchParams(location.search).get('lang');
  show(q === 'tr' || q === 'en' ? q : (navigator.language || '').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en');
  document.querySelectorAll('.bar button').forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.lang); });
  });
</script>
</body>
</html>
`;

mkdirSync(new URL('docs/privacy/', root), { recursive: true });
writeFileSync(new URL('docs/privacy/index.html', root), html);
console.log('docs/privacy/index.html güncellendi');
