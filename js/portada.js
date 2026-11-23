EV.portada = (function () {
  const PINES = [
    { x: 9, y: 24, mx: 12, my: 12, v: 2 },
    { x: 88, y: 18, mx: 86, my: 9, v: 0 },
    { x: 15, y: 74, mx: 14, my: 87, v: 5 },
    { x: 84, y: 78, mx: 88, my: 84, v: 3 },
    { x: 94, y: 48, mx: 58, my: 15, v: 6 },
    { x: 5, y: 50, mx: 33, my: 7, v: 1 },
    { x: 26, y: 90, mx: 40, my: 92, v: 7 },
    { x: 72, y: 12, mx: 66, my: 89, v: 4 }
  ];
  const PIN = `<svg viewBox="0 0 32 40" focusable="false">
    <circle class="pin-onda" cx="16" cy="16.5" r="12"/>
    <path class="pin-cuerpo" d="M16 38c-1.2-1-12-11-12-21.5a12 12 0 0 1 24 0C28 27 17.2 37 16 38z"/>
    <circle class="pin-centro" cx="16" cy="16.5" r="5.5"/>
    <path class="pin-check" pathLength="1" d="M13.4 16.7l1.8 1.8 3.6-3.8"/>
  </svg>`;

  const hero = document.querySelector('.hero');
  const logo = document.querySelector('.hero-logo');
  const texto = document.querySelector('.hero-texto');
  const pines = document.querySelector('.hero-pines');
  const encabezado = document.querySelector('.header');
  const marca = document.querySelector('.brand');
  let base = null;
  let pendiente = false;

  function suavizar(p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  function crearPines() {
    pines.innerHTML = PINES.map((p, i) =>
      `<span class="hero-pin" style="--x: ${p.x}%; --y: ${p.y}%; --mx: ${p.mx}%; --my: ${p.my}%; --i: ${i}; --v: ${p.v}">${PIN}</span>`
    ).join('');
  }

  function medir() {
    document.documentElement.style.setProperty('--alto-encabezado', encabezado.offsetHeight + 'px');
    logo.style.transform = '';
    const l = logo.getBoundingClientRect();
    const b = marca.getBoundingClientRect();
    base = {
      izquierda: l.left,
      centro: l.top + window.scrollY + l.height / 2,
      destinoIzquierda: b.left,
      destinoCentro: b.top + b.height / 2,
      escala: b.height / l.height,
      recorrido: hero.offsetHeight
    };
    actualizar();
  }

  function actualizar() {
    pendiente = false;
    if (!base) return;
    const s = window.scrollY;
    const p = Math.min(1, Math.max(0, s / base.recorrido));
    const e = suavizar(p);
    const centro = base.centro + (base.destinoCentro - base.centro) * e;
    const dx = (base.destinoIzquierda - base.izquierda) * e;
    const dy = centro - (base.centro - s);
    const escala = 1 + (base.escala - 1) * e;
    const llego = p >= 1;

    logo.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
    logo.style.visibility = llego ? 'hidden' : '';
    marca.style.opacity = llego ? '' : '0';
    texto.style.opacity = Math.max(0, 1 - p * 2.2);
    texto.style.transform = `translateY(${dy}px)`;
    pines.style.opacity = Math.max(0, 1 - p * 1.5);
  }

  function alMover() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizar);
  }

  function iniciar() {
    if (!hero) return;
    crearPines();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    medir();
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', medir);
    window.addEventListener('load', medir);
    if (document.fonts) document.fonts.ready.then(medir);
  }

  iniciar();
  return { medir };
})();
