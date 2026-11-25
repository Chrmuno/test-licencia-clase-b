// Licencia: demo gratis / versión completa con pago único en Google Play.
// Dentro de la app de Google Play (TWA) usa la Digital Goods API + Payment Request.
// En el navegador web no hay pago: se ofrece descargar la app.
(function () {
  const PRODUCT = 'version_completa';
  const PLAY_BILLING = 'https://play.google.com/billing';
  const PLAY_URL = 'https://play.google.com/store/apps/details?id=app.vercel.test_licencia_clase_b_7l3z.twa';
  const KEY = 'lic_full', DEMO = 'lic_demo';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
  const today = () => new Date().toLocaleDateString('sv-SE');

  if (document.referrer.startsWith('android-app://')) ls.set('lic_twa', '1');
  const L = {
    inApp: ls.get('lic_twa') === '1',
    full: ls.get(KEY) === '1',
    price: '$2.990',
    billing: false,
    service: null,
    ready: null,
    LIMITS: { testsPerDay: 1, simFreeSecs: 300, practicePerDay: 10 },
    async init() {
      if (!('getDigitalGoodsService' in window)) return;
      try {
        const s = await window.getDigitalGoodsService(PLAY_BILLING);
        if (!s) return;
        this.service = s; this.billing = true;
        try { const d = await s.getDetails([PRODUCT]); if (d && d[0] && d[0].price) this.price = new Intl.NumberFormat('es-CL', { style: 'currency', currency: d[0].price.currency }).format(d[0].price.value); } catch (e) { }
        await this.check();
      } catch (e) { console.warn('Pagos no disponibles', e); }
    },
    async check() {
      if (!this.service) return this.full;
      try {
        const list = await this.service.listPurchases();
        const has = (list || []).some(p => p.itemId === PRODUCT);
        this.setFull(has);
      } catch (e) { }
      return this.full;
    },
    setFull(v) { const ch = v !== this.full; this.full = v; ls.set(KEY, v ? '1' : '0'); if (ch) document.dispatchEvent(new CustomEvent('licencia', { detail: v })); },
    async buy() {
      if (!this.billing) { location.href = PLAY_URL; return false; }
      try {
        const req = new PaymentRequest([{ supportedMethods: PLAY_BILLING, data: { sku: PRODUCT } }], { total: { label: 'Total', amount: { currency: 'CLP', value: '0' } } });
        const res = await req.show();
        await res.complete('success');
        await this.check();
        if (!this.full && res.details && res.details.purchaseToken) this.setFull(true);
        return this.full;
      } catch (e) { console.warn('Compra cancelada o fallida', e); await this.check(); return this.full; }
    },
    // ---- límites de la demo ----
    testsLeftToday() { if (this.full) return Infinity; let d; try { d = JSON.parse(ls.get(DEMO) || '{}'); } catch (e) { d = {}; } return d.day === today() ? Math.max(0, this.LIMITS.testsPerDay - (d.n || 0)) : this.LIMITS.testsPerDay; },
    useTest() { if (this.full) return; let d; try { d = JSON.parse(ls.get(DEMO) || '{}'); } catch (e) { d = {}; } if (d.day !== today()) d = { day: today(), n: 0 }; d.n++; ls.set(DEMO, JSON.stringify(d)); },
    practiceLeft() { if (this.full) return Infinity; let d; try { d = JSON.parse(ls.get('lic_prac') || '{}'); } catch (e) { d = {}; } return d.day === today() ? Math.max(0, this.LIMITS.practicePerDay - (d.n || 0)) : this.LIMITS.practicePerDay; },
    usePractice() { if (this.full) return; let d; try { d = JSON.parse(ls.get('lic_prac') || '{}'); } catch (e) { d = {}; } if (d.day !== today()) d = { day: today(), n: 0 }; d.n++; ls.set('lic_prac', JSON.stringify(d)); },
    simLeft() { if (this.full) return Infinity; let d; try { d = JSON.parse(ls.get('lic_sim') || '{}'); } catch (e) { d = {}; } return d.day === today() ? Math.max(0, this.LIMITS.simFreeSecs - (d.s || 0)) : this.LIMITS.simFreeSecs; },
    addSim(dt) { if (this.full) return; this._acc = (this._acc || 0) + dt; if (this._acc < 2) return; let d; try { d = JSON.parse(ls.get('lic_sim') || '{}'); } catch (e) { d = {}; } if (d.day !== today()) d = { day: today(), s: 0 }; d.s += this._acc; this._acc = 0; ls.set('lic_sim', JSON.stringify(d)); },
    // ---- pantalla de compra ----
    paywall(reason, onUnlock) {
      const old = document.getElementById('lic-pw'); if (old) old.remove();
      const el = document.createElement('div'); el.id = 'lic-pw';
      el.innerHTML = `<style>
#lic-pw{position:fixed;inset:0;z-index:9999;background:rgba(8,15,25,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;touch-action:pan-y}
#lic-pw .b{background:#fff;color:#1b2430;border-radius:18px;max-width:420px;width:100%;padding:20px 18px;max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.35)}
#lic-pw h3{margin:0 0 6px;font-size:21px;color:#1f4e79}#lic-pw p{margin:6px 0;line-height:1.4}
#lic-pw ul{padding-left:0;list-style:none;margin:12px 0}#lic-pw li{margin:7px 0;padding-left:26px;position:relative}#lic-pw li:before{content:"✓";position:absolute;left:4px;color:#1e7d4f;font-weight:800}
#lic-pw .why{background:#fff4dc;color:#8a5a00;border-radius:10px;padding:8px 10px;font-size:14px}
#lic-pw button,#lic-pw a.btn{display:block;width:100%;border:0;border-radius:12px;padding:14px;font:600 17px system-ui,sans-serif;margin-top:10px;cursor:pointer;text-align:center;text-decoration:none}
#lic-pw .buy{background:#1f4e79;color:#fff}#lic-pw .sec{background:#eef2f6;color:#1f4e79}#lic-pw .lnk{background:none;color:#5b6675;font-size:14px;padding:8px}
#lic-pw .pr{font-size:28px;font-weight:800;color:#1b2430}#lic-pw .pr small{font-size:14px;color:#5b6675;font-weight:500}
</style><div class="b" role="dialog" aria-modal="true">
<h3>⭐ Versión completa</h3>
${reason ? `<p class="why">${reason}</p>` : ''}
<ul><li>Tests ilimitados todos los días</li><li>Modo "Estudiar mis errores" con explicaciones</li><li>Práctica por tema sin límite (la demo da 10 preguntas al día)</li><li>Examen práctico completo en el simulador 3D</li><li>Conducción libre sin límite de tiempo (la demo da 5 minutos al día)</li><li>Pago único: sin suscripción ni anuncios</li></ul>
<p class="pr">${this.price} <small>pago único</small></p>
${this.billing ? `<button class="buy" id="lic-buy">Comprar versión completa</button><button class="lnk" id="lic-rest">Ya la compré: restaurar compra</button>`
          : this.inApp ? `<p style="font-size:14px;color:#5b6675">La compra todavía no está disponible en esta versión de la app. Actualiza la app desde Google Play.</p><a class="btn buy" href="${PLAY_URL}">Abrir Google Play</a>`
          : `<a class="btn buy" href="${PLAY_URL}" target="_blank" rel="noopener">Descargar la app en Google Play</a><p style="font-size:13px;color:#5b6675">La compra se hace dentro de la app de Google Play.</p>`}
<button class="sec" id="lic-close">Seguir con la demo</button></div>`;
      document.body.appendChild(el);
      const close = () => el.remove();
      el.querySelector('#lic-close').onclick = close;
      el.addEventListener('click', e => { if (e.target === el) close(); });
      const done = ok => { if (ok) { el.querySelector('.b').innerHTML = '<h3>🎉 ¡Gracias por tu compra!</h3><p>Ya tienes la versión completa.</p><button class="buy" id="lic-ok">Continuar</button>'; el.querySelector('#lic-ok').onclick = () => { close(); onUnlock && onUnlock(); }; } };
      const b = el.querySelector('#lic-buy'); if (b) b.onclick = async () => { b.disabled = true; b.textContent = 'Abriendo Google Play…'; const ok = await this.buy(); b.disabled = false; b.textContent = 'Comprar versión completa'; done(ok); };
      const r = el.querySelector('#lic-rest'); if (r) r.onclick = async () => { r.textContent = 'Revisando…'; const ok = await this.check(); if (ok) done(true); else r.textContent = 'No encontramos una compra con esta cuenta de Google'; };
    },
  };
  L.ready = L.init();
  window.Licencia = L;
})();
