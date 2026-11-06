/* EcoVecinos · util.js
   Utilidades (escape, fechas, distancias, almacenamiento) y componentes de UI
   compartidos: toast, diálogo modal, confirmación, insignias y errores de campo. */
window.EV = window.EV || {};

EV.util = {
  /** Escapa texto del usuario antes de insertarlo con innerHTML. */
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtDate(ts) {
    return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fmtDateTime(ts) {
    return new Date(ts).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },
  hoursSince(ts) { return (Date.now() - ts) / 36e5; },
  /** Fecha local YYYY-MM-DD, el formato de los <input type="date">. */
  todayISO() { return EV.util.isoFromOffset(0); },
  isoFromOffset(days) {
    const d = new Date(Date.now() + days * 864e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  /** Inicio de una faena a partir de { date: 'YYYY-MM-DD', time: 'HH:MM' }. */
  startOf(f) { return new Date(`${f.date}T${f.time || '00:00'}`).getTime(); },
  /** Distancia en metros entre dos puntos { lat, lng } (Haversine). */
  dist(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },
  fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; },
  fmtCoords(lat, lng) { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; },

  reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
  /** Desplaza hasta el elemento; el desfase del header lo da scroll-margin-top en CSS. */
  scrollToEl(el, block = 'start') {
    if (el) el.scrollIntoView({ behavior: EV.util.reducedMotion() ? 'auto' : 'smooth', block });
  },

  /** localStorage puede lanzar excepciones (modo privado, almacenamiento bloqueado). */
  storage: {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* sin almacenamiento disponible */ } }
  }
};

EV.ui = {
  STATUS: {
    pending:  { label: 'Pendiente',   icon: '○' },
    active:   { label: 'En atención', icon: '◐' },
    resolved: { label: 'Resuelto',    icon: '✔' }
  },
  /** Pictograma decorativo: los lectores de pantalla lo ignoran. */
  icon(ch) { return `<span class="ico" aria-hidden="true">${ch}</span>`; },
  /** El estado se comunica con icono y texto, nunca solo con color. */
  badge(status) {
    const s = EV.ui.STATUS[status] || EV.ui.STATUS.pending;
    return `<span class="badge badge--${status}">${EV.ui.icon(s.icon)} ${s.label}</span>`;
  },

  toast(message, type = 'info') {
    const box = document.getElementById('toasts');
    if (!box) return;
    while (box.children.length >= 3) box.firstElementChild.remove();
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('toast--out'); setTimeout(() => t.remove(), 300); }, 4200);
  },

  /** Muestra un error bajo un campo y lo marca como inválido. Devuelve true si no hay error. */
  fieldError(root, errId, msg) {
    const el = root.querySelector('#' + errId);
    if (el) el.textContent = msg || '';
    const field = root.querySelector(`[aria-describedby~="${errId}"]`);
    if (field) {
      if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    }
    return !msg;
  },

  /** Estado de carga de un botón mientras dura una operación asíncrona. */
  setBusy(btn, busy, busyLabel) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${busyLabel || 'Procesando…'}`;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    } else if (btn.dataset.label !== undefined) {
      btn.innerHTML = btn.dataset.label; delete btn.dataset.label;
      btn.disabled = false; btn.removeAttribute('aria-busy');
    }
  },

  /* Diálogo principal. currentDetail redibuja su contenido cuando cambian los datos;
     currentCleanup libera recursos (p. ej. la cámara) al cerrarlo o reemplazarlo. */
  currentDetail: null,
  currentCleanup: null,
  resetDialogHooks() {
    if (EV.ui.currentCleanup) EV.ui.currentCleanup();
    EV.ui.currentCleanup = null;
    EV.ui.currentDetail = null;
  },
  /** <dialog> nativo: atrapa el foco y se cierra con Esc. */
  openDialog(title, html, onClose) {
    const dlg = document.getElementById('dialog');
    EV.ui.resetDialogHooks();
    document.getElementById('dialogTitle').textContent = title;
    const body = document.getElementById('dialogBody');
    body.innerHTML = html;
    dlg._onClose = onClose || null;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    return body;
  },
  closeDialog() {
    const dlg = document.getElementById('dialog');
    if (dlg.open) dlg.close();
  },
  isDialogOpen() { return document.getElementById('dialog').open; },

  /** Confirmación accesible para acciones destructivas. Resuelve true si se acepta. */
  confirm(message, { title = '¿Confirmas esta acción?', ok = 'Confirmar' } = {}) {
    const dlg = document.getElementById('confirmDialog');
    if (!dlg || !dlg.showModal) return Promise.resolve(window.confirm(message));
    dlg.querySelector('#confirmTitle').textContent = title;
    dlg.querySelector('#confirmText').textContent = message;
    dlg.querySelector('[data-confirm=ok]').textContent = ok;
    dlg.returnValue = '';
    dlg.showModal();
    dlg.querySelector('[data-confirm=cancel]').focus();
    return new Promise(resolve => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true }));
  },

  /** Cierra un <dialog> al pulsar fuera de su caja (el padding interno no cuenta). */
  closeOnBackdrop(dlg) {
    dlg.addEventListener('click', e => {
      if (e.target !== dlg) return;
      const r = dlg.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
    });
  }
};
