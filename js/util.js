window.EV = window.EV || {};

const HORA = 3600000;
const DIA = 86400000;

// Funciones generales: texto, fechas y distancias

EV.util = {
  esc(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  fmtDate(ts) {
    return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fmtDateTime(ts) {
    return new Date(ts).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },
  hoursSince(ts) {
    return (Date.now() - ts) / HORA;
  },
  fechaISO(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return fecha.getFullYear() + '-' + mes + '-' + dia;
  },
  horaTexto(fecha) {
    return String(fecha.getHours()).padStart(2, '0') + ':' + String(fecha.getMinutes()).padStart(2, '0');
  },
  todayISO() {
    return EV.util.fechaISO(new Date());
  },
  isoFromOffset(dias) {
    return EV.util.fechaISO(new Date(Date.now() + dias * DIA));
  },
  startOf(faena) {
    return new Date(faena.date + 'T' + (faena.time || '00:00')).getTime();
  },

  dist(a, b) {
    const R = 6371000;
    const rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  },
  fmtDist(metros) {
    if (metros < 1000) return Math.round(metros) + ' m';
    return (metros / 1000).toFixed(1) + ' km';
  },
  fmtCoords(lat, lng) {
    return lat.toFixed(5) + ', ' + lng.toFixed(5);
  }
};

EV.ui = {
  STATUS: {
    pending: 'Pendiente',
    active: 'En atención',
    resolved: 'Resuelto'
  },
  origen: null,

  badge(status) {
    const texto = EV.ui.STATUS[status] || EV.ui.STATUS.pending;
    return `<span class="badge badge--${status}">${texto}</span>`;
  },

  prioridad(p, manual) {
    const nivel = p.eff.toLowerCase();
    const texto = manual ? 'Prioridad ' + p.eff + ' (manual)' : 'Prioridad ' + p.eff + ' - ' + p.score;
    return `<span class="prio prio--${nivel}"><span class="prio-barras" aria-hidden="true"><i></i><i></i><i></i></span>${texto}</span>`;
  },

  toast(mensaje, tipo) {
    const caja = document.getElementById('toasts');
    if (!caja) return;
    while (caja.children.length >= 2) {
      caja.firstElementChild.remove();
    }
    const t = document.createElement('div');
    t.className = 'toast toast--' + (tipo || 'info');
    t.textContent = mensaje;
    caja.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast--out');
      setTimeout(() => t.remove(), 300);
    }, 4000);
  },

  avisoUbicacionDemo() {
    if (!EV.geo.fueraDeZona()) return '';
    return `<div class="notice notice--warn">
      <p><strong>Estás fuera de las zonas de la demo.</strong> Los reportes y faenas de ejemplo están en Lima, por eso aquí no aparece nada cerca de ti.</p>
      <div class="form-actions"><button type="button" class="btn btn-secondary" data-ubicacion-demo>Usar ubicación de demostración</button></div>
    </div>`;
  },

  setError(root, idError, mensaje) {
    const error = root.querySelector('#' + idError);
    const campo = root.querySelector('[aria-describedby="' + idError + '"]');
    if (error) error.textContent = mensaje || '';
    if (campo) {
      if (mensaje) {
        campo.setAttribute('aria-invalid', 'true');
        campo.classList.remove('temblar');
        void campo.offsetWidth;
        campo.classList.add('temblar');
      } else {
        campo.removeAttribute('aria-invalid');
      }
    }
    return !mensaje;
  },

  movimientoReducido() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  colapsar(el, despues) {
    const terminar = () => {
      el.remove();
      if (despues) despues();
    };
    if (EV.ui.movimientoReducido()) {
      terminar();
      return;
    }
    const estilo = getComputedStyle(el);
    const anim = el.animate(
      [
        { height: el.offsetHeight + 'px', opacity: 1, marginTop: estilo.marginTop, marginBottom: estilo.marginBottom, paddingTop: estilo.paddingTop, paddingBottom: estilo.paddingBottom },
        { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px' }
      ],
      { duration: 320, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );
    el.style.overflow = 'hidden';
    anim.onfinish = terminar;
  },

  selectorDe(el) {
    if (!el || !el.attributes) return null;
    for (const atributo of el.attributes) {
      if (atributo.name.startsWith('data-')) return '[' + atributo.name + '="' + CSS.escape(atributo.value) + '"]';
    }
    if (el.id) return '#' + CSS.escape(el.id);
    return null;
  },

  transformHacia(dlg, el) {
    if (!el || !el.isConnected) return null;
    const o = el.getBoundingClientRect();
    if (!o.width || !o.height || o.bottom < 0 || o.top > window.innerHeight) return null;
    const d = dlg.getBoundingClientRect();
    const escala = Math.max(0.06, Math.min(o.width / d.width, o.height / d.height));
    const dx = (o.left + o.width / 2) - (d.left + d.width / 2);
    const dy = (o.top + o.height / 2) - (d.top + d.height / 2);
    return 'translate(' + dx + 'px, ' + dy + 'px) scale(' + escala + ')';
  },

  animarFondo(dlg, desde, hasta, duracion) {
    try {
      return dlg.animate([{ opacity: desde }, { opacity: hasta }], { duration: duracion, pseudoElement: '::backdrop', fill: 'forwards' });
    } catch (e) {
      return null;
    }
  },

  detenerAnimaciones(dlg) {
    if (dlg._animacion) dlg._animacion.cancel();
    if (dlg._fondo) dlg._fondo.cancel();
    dlg._animacion = null;
    dlg._fondo = null;
    dlg._cerrando = false;
  },

  mostrarDialogo(dlg) {
    const origen = EV.ui.origen;
    EV.ui.detenerAnimaciones(dlg);
    if (dlg.open) return;
    dlg.showModal();
    dlg._origen = origen;
    dlg._selector = EV.ui.selectorDe(origen);
    if (EV.ui.movimientoReducido()) return;
    const desde = EV.ui.transformHacia(dlg, origen) || 'translateY(16px) scale(0.97)';
    dlg._animacion = dlg.animate(
      [{ transform: desde, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'none', opacity: 1 }],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    dlg._animacion.onfinish = () => { dlg._animacion = null; };
    const fondo = EV.ui.animarFondo(dlg, 0, 1, 300);
    if (fondo) fondo.onfinish = () => fondo.cancel();
  },

  ocultarDialogo(dlg, despues) {
    if (!dlg.open || dlg._cerrando) return;
    EV.ui.detenerAnimaciones(dlg);
    if (EV.ui.movimientoReducido()) {
      dlg.close();
      if (despues) despues();
      return;
    }
    dlg._cerrando = true;
    let destino = dlg._origen;
    if ((!destino || !destino.isConnected) && dlg._selector) destino = document.querySelector(dlg._selector);
    const hasta = EV.ui.transformHacia(dlg, destino);
    const duracion = hasta ? 340 : 200;
    const marcos = hasta
      ? [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.6 }, { transform: hasta, opacity: 0 }]
      : [{ transform: 'none', opacity: 1 }, { transform: 'scale(0.96)', opacity: 0 }];
    const anim = dlg.animate(marcos, { duration: duracion, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    dlg._animacion = anim;
    dlg._fondo = EV.ui.animarFondo(dlg, 1, 0, duracion);
    anim.onfinish = () => {
      dlg.close();
      EV.ui.detenerAnimaciones(dlg);
      if (despues) despues();
    };
  },

  openDialog(titulo, html) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialogTitle').textContent = titulo;
    const body = document.getElementById('dialogBody');
    body.innerHTML = html;
    body.onclick = null;
    EV.ui.mostrarDialogo(dlg);
    return body;
  },

  closeDialog() {
    EV.ui.ocultarDialogo(document.getElementById('dialog'));
  },

  isDialogOpen() {
    return document.getElementById('dialog').open;
  },

  confirmar(pregunta, textoBoton, alAceptar) {
    const dlg = document.getElementById('confirmDialog');
    document.getElementById('confirmText').textContent = pregunta;
    const ok = document.getElementById('confirmOk');
    ok.textContent = textoBoton;
    ok.onclick = () => {
      EV.ui.ocultarDialogo(dlg);
      alAceptar();
    };
    document.getElementById('confirmNo').onclick = () => EV.ui.ocultarDialogo(dlg);
    EV.ui.mostrarDialogo(dlg);
    document.getElementById('confirmNo').focus();
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('button, a, [role=tab], [data-open]') || e.target : null;
  EV.ui.origen = el;
}, true);

document.addEventListener('cancel', e => {
  if (e.target.tagName !== 'DIALOG') return;
  e.preventDefault();
  EV.ui.ocultarDialogo(e.target);
}, true);

EV.selector = (function () {
  let contador = 0;
  const abiertos = new Set();

  function sincronizar(select) {
    const caja = select._caja;
    if (!caja) return;
    const elegida = select.options[select.selectedIndex];
    caja.querySelector('.selector-texto').textContent = elegida ? elegida.textContent : '';
    caja.querySelectorAll('[role=option]').forEach((li, i) => {
      li.setAttribute('aria-selected', i === select.selectedIndex ? 'true' : 'false');
    });
  }

  function marcarActiva(caja, indice) {
    const items = caja.querySelectorAll('[role=option]');
    if (!items.length) return;
    indice = Math.max(0, Math.min(items.length - 1, indice));
    items.forEach((li, i) => li.classList.toggle('activa', i === indice));
    caja._activa = indice;
    caja.querySelector('[role=listbox]').setAttribute('aria-activedescendant', items[indice].id);
    items[indice].scrollIntoView({ block: 'nearest' });
  }

  function abrir(caja) {
    if (caja.classList.contains('abierto')) return;
    abiertos.forEach(otra => { if (otra !== caja) cerrar(otra, false); });
    const panel = caja.querySelector('.selector-panel');
    const boton = caja.querySelector('.selector-boton');
    const lista = caja.querySelector('[role=listbox]');
    const inicio = panel.hidden ? 0 : panel.getBoundingClientRect().height;
    if (caja._animacion) caja._animacion.cancel();
    panel.hidden = false;
    caja.classList.add('abierto');
    boton.setAttribute('aria-expanded', 'true');
    abiertos.add(caja);
    marcarActiva(caja, caja._select.selectedIndex);
    lista.focus({ preventScroll: true });

    if (EV.ui.movimientoReducido()) return;
    const alto = panel.scrollHeight;
    caja._animacion = panel.animate(
      [{ height: inicio + 'px', opacity: inicio ? 1 : 0.4 }, { height: alto + 'px', opacity: 1 }],
      { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    caja._animacion.onfinish = () => { caja._animacion = null; };
    if (!inicio) {
      caja.querySelectorAll('[role=option]').forEach((li, i) => {
        li.animate(
          [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, delay: 40 + i * 30, easing: 'ease-out', fill: 'backwards' }
        );
      });
    }
  }

  function cerrar(caja, devolverFoco) {
    if (!caja.classList.contains('abierto')) return;
    const panel = caja.querySelector('.selector-panel');
    const boton = caja.querySelector('.selector-boton');
    caja.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
    abiertos.delete(caja);
    if (devolverFoco) boton.focus();

    if (EV.ui.movimientoReducido()) {
      panel.hidden = true;
      return;
    }
    const alto = panel.getBoundingClientRect().height;
    if (caja._animacion) caja._animacion.cancel();
    caja._animacion = panel.animate(
      [{ height: alto + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 240, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );
    caja._animacion.onfinish = () => {
      panel.hidden = true;
      caja._animacion.cancel();
      caja._animacion = null;
    };
  }

  function elegir(caja, indice) {
    const select = caja._select;
    if (select.selectedIndex !== indice) {
      select.selectedIndex = indice;
      sincronizar(select);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    cerrar(caja, true);
  }

  function mejorar(select) {
    if (select.dataset.mejorado) return;
    select.dataset.mejorado = 'si';
    contador++;
    const id = select.id || 'sel' + contador;
    const etiqueta = select.id ? document.querySelector('label[for="' + select.id + '"]') : null;
    if (etiqueta && !etiqueta.id) etiqueta.id = id + '-etiqueta';

    const caja = document.createElement('div');
    caja.className = 'selector';
    const lista = Array.from(select.options).map((op, i) =>
      `<li role="option" id="${id}-op${i}" data-i="${i}">${EV.util.esc(op.textContent)}</li>`).join('');
    caja.innerHTML = `
      <button type="button" class="selector-boton" aria-haspopup="listbox" aria-expanded="false" id="${id}-boton"
        ${etiqueta ? 'aria-labelledby="' + etiqueta.id + ' ' + id + '-boton"' : ''}>
        <span class="selector-texto"></span>
      </button>
      <div class="selector-panel" hidden>
        <ul class="selector-lista" role="listbox" tabindex="-1" ${etiqueta ? 'aria-labelledby="' + etiqueta.id + '"' : ''}>${lista}</ul>
      </div>`;
    select.parentNode.insertBefore(caja, select);
    caja.appendChild(select);
    select.classList.add('selector-nativo');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select._caja = caja;
    caja._select = select;

    if (etiqueta) {
      etiqueta.addEventListener('click', e => {
        e.preventDefault();
        caja.querySelector('.selector-boton').focus();
      });
    }

    const boton = caja.querySelector('.selector-boton');
    const listbox = caja.querySelector('[role=listbox]');

    boton.addEventListener('click', () => {
      if (caja.classList.contains('abierto')) cerrar(caja, true);
      else abrir(caja);
    });
    boton.addEventListener('keydown', e => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir(caja);
      }
    });
    listbox.addEventListener('click', e => {
      const li = e.target.closest('[role=option]');
      if (li) elegir(caja, Number(li.dataset.i));
    });
    listbox.addEventListener('keydown', e => {
      const total = select.options.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); marcarActiva(caja, caja._activa + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcarActiva(caja, caja._activa - 1); }
      else if (e.key === 'Home') { e.preventDefault(); marcarActiva(caja, 0); }
      else if (e.key === 'End') { e.preventDefault(); marcarActiva(caja, total - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(caja, caja._activa); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(caja, true); }
      else if (e.key === 'Tab') { cerrar(caja, false); }
    });
    listbox.addEventListener('mousemove', e => {
      const li = e.target.closest('[role=option]');
      if (li && Number(li.dataset.i) !== caja._activa) marcarActiva(caja, Number(li.dataset.i));
    });
    select.addEventListener('change', () => sincronizar(select));
    sincronizar(select);
  }

  function mejorarTodos(raiz) {
    (raiz || document).querySelectorAll('select:not([data-mejorado])').forEach(mejorar);
  }

  function sincronizarTodos(raiz) {
    (raiz || document).querySelectorAll('select[data-mejorado]').forEach(sincronizar);
  }

  document.addEventListener('click', e => {
    abiertos.forEach(caja => { if (!caja.contains(e.target)) cerrar(caja, false); });
  });

  document.addEventListener('reset', e => {
    setTimeout(() => sincronizarTodos(e.target), 0);
  }, true);

  return { mejorarTodos, sincronizarTodos };
})();
