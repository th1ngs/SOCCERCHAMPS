// Utilitários gerais do modo Manager.
window.SCM = window.SCM || {};
(function (M) {
  const U = (M.U = {});

  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
  U.avg = (arr, f) => (arr.length ? U.sum(arr, f) / arr.length : 0);

  U.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  U.shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Escolha ponderada: wfn(item) >= 0.
  U.weighted = (items, wfn) => {
    let total = 0;
    const ws = items.map((it) => { const w = Math.max(0, wfn(it)); total += w; return w; });
    if (total <= 0) return items.length ? U.pick(items) : null;
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };

  // Valores em reais. Ex.: 1.5e6 -> "R$ 1,5 mi"
  U.money = (v) => {
    const neg = v < 0 ? '-' : '';
    const a = Math.abs(v);
    let s;
    if (a >= 1e9) s = (a / 1e9).toFixed(1) + ' bi';
    else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + ' mi';
    else if (a >= 1e3) s = Math.round(a / 1e3) + ' mil';
    else s = Math.round(a).toString();
    return neg + 'R$ ' + s.replace('.', ',');
  };

  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.stars = (v, max = 5) => {
    const full = Math.floor(v), half = v - full >= 0.5;
    return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(Math.max(0, max - full - (half ? 1 : 0)));
  };

  U.ordinal = (n) => n + 'º';
})(window.SCM);
