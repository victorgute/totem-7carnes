// Service worker do totem: guarda o app para abrir mesmo sem internet.
// Estratégia: tenta a rede primeiro (para pegar a versão nova); se falhar ou demorar, usa a cópia guardada.
const CACHE = "totem-7carnes";
const ESSENCIAIS = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/versao.txt")) return;          // sempre direto da rede
  if (req.headers.has("range")) return;                       // vídeos: o navegador cuida
  e.respondWith(
    new Promise((resolve) => {
      let respondeu = false;
      const daCache = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html"));
      const limite = setTimeout(() => { if (!respondeu) { respondeu = true; daCache().then(resolve); } }, 4000);
      fetch(req).then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        if (!respondeu) { respondeu = true; clearTimeout(limite); resolve(r); }
      }).catch(() => {
        if (!respondeu) { respondeu = true; clearTimeout(limite); daCache().then((r) => resolve(r || Response.error())); }
      });
    })
  );
});
