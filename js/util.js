/* ==========================================================================
   EcoVecinos · util.js
   Utilidades generales (escape de HTML, fechas, distancias) y componentes UI
   compartidos (toast, diálogo modal, insignias de estado).
   ========================================================================== */
window.EV = window.EV || {};

EV.util = {
  /** Escapa texto del usuario antes de insertarlo con innerHTML (evita XSS). */
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
  /** Fecha local YYYY-MM-DD de hoy (para inputs type="date"). */
  todayISO() { return EV.util.isoFromOffset(0); },
  isoFromOffset(days) {
    const d = new Date(Date.now() + days * 864e5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  /** Timestamp de inicio de una faena a partir de {date:'YYYY-MM-DD', time:'HH:MM'}. */
  startOf(f) { return new Date(`${f.date}T${f.time || '00:00'}`).getTime(); },
  /** Distancia en metros entre dos puntos {lat,lng} (fórmula de Haversine). */
  dist(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  },
  fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; },
  fmtCoords(lat, lng) { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
};

EV.ui = {
  STATUS: {
    pending:  { label: 'Pendiente',   icon: '○' },
    active:   { label: 'En atención', icon: '◐' },
    resolved: { label: 'Resuelto',    icon: '✔' }
  },
  /** Insignia de estado: usa texto + icono, nunca solo color (accesibilidad). */
  badge(status) {
    const s = EV.ui.STATUS[status] || EV.ui.STATUS.pending;
    return `<span class="badge badge--${status}"><span aria-hidden="true">${s.icon}</span> ${s.label}</span>`;
  },

  /** Mensaje temporal anunciado por lectores de pantalla (aria-live="polite"). */
  toast(message, type = 'info') {
    const box = document.getElementById('toasts');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('toast--out'); setTimeout(() => t.remove(), 300); }, 4200);
  },

  /** Abre el diálogo modal nativo (<dialog>), que atrapa el foco y cierra con Esc. */
  openDialog(title, html, onClose) {
    const dlg = document.getElementById('dialog');
    document.getElementById('dialogTitle').textContent = title;
    const body = document.getElementById('dialogBody');
    body.innerHTML = html;
    dlg._onClose = onClose || null;
    if (!dlg.open) dlg.showModal();
    return body;
  },
  closeDialog() {
    const dlg = document.getElementById('dialog');
    if (dlg.open) dlg.close();
  },
  isDialogOpen() { return document.getElementById('dialog').open; }
};
