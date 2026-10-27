/* ==========================================================================
   EcoVecinos · main.js — Arranque de la aplicación
   Selector de rol, pestañas accesibles (teclado), notificaciones y
   actualización automática de las vistas cuando cambian los datos.
   ========================================================================== */
EV.app = (function () {
  const S = EV.store, U = EV.util, esc = U.esc;
  const ROLES = { vecino: 'Vecino', dirigente: 'Dirigente de junta', municipal: 'Municipalidad' };
  let role = localStorage.getItem('ecovecinos.role');
  if (!ROLES[role]) role = 'vecino';
  let tabId = null, current = {};
  const $ = id => document.getElementById(id);

  function tabsOf(r) { return EV.views[r].tabs; } 

  function renderTabs() {
    const list = $('tablist');
    list.innerHTML = tabsOf(role).map(t => `<button role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="false" aria-controls="tabpanel" tabindex="-1">${t.label}</button>`).join('');
  }
  function selectTab(id, focus) {
    if (current.destroy) current.destroy();
    EV.camera.stopAll();
    tabId = id;
    document.querySelectorAll('#tablist .tab').forEach(b => {
      const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus();
    });
    const panel = $('tabpanel'); panel.setAttribute('aria-labelledby', 'tab-' + id);
    panel.innerHTML = '';
    const view = document.createElement('div'); view.className = 'view'; panel.appendChild(view);   // contenedor nuevo: evita listeners duplicados
    const tab = tabsOf(role).find(t => t.id === id);
    current = tab.render(view) || {};
  }
  function setRole(r, silent) {
    role = r; localStorage.setItem('ecovecinos.role', r); $('userRole').value = r;
    renderTabs();
    if (EV.views[r].checkAlerts) EV.views[r].checkAlerts();       // alertas al ingresar (HU-20, HU-44)
    selectTab(tabsOf(r)[0].id);
    updateBell();
    if (!silent) EV.ui.toast(`Vista de ${ROLES[r]}.`, 'info');
  }
  function goTab(id) { selectTab(id, true); window.scrollTo({ top: $('demo').offsetTop - 10, behavior: 'smooth' }); }

  /* ---------- Notificaciones ---------- */
  function mineNotifs() { return S.s.notifications.filter(n => n.to === role); }
  function updateBell() {
    const n = mineNotifs().filter(x => !x.read).length;
    $('bellCount').textContent = n; $('bellCount').hidden = !n;
    $('bell').setAttribute('aria-label', `Notificaciones${n ? `: ${n} sin leer` : ''}`);
  }
  function openNotifs() {
    const list = mineNotifs();
    const body = EV.ui.openDialog('Notificaciones', list.length ? `<ul class="thread">${list.map(n => `<li class="msg ${n.read ? '' : 'msg--new'}">${esc(n.text)}<br><span class="text-muted">${U.fmtDateTime(n.ts)}</span>
      ${n.photo ? `<br><img class="thumb thumb--lg" src="${n.photo}" alt="Evidencia fotográfica de la limpieza">` : ''}
      ${role === 'dirigente' && n.text.startsWith('Seguimiento pendiente') ? `<br><button class="btn btn-primary btn-sm" data-remind="${esc(n.ref)}">Reenviar recordatorio</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">No tienes notificaciones.</p>');
    EV.ui.currentDetail = null;
    body.onclick = e => { const b = e.target.closest('[data-remind]'); if (b) { EV.views.dirigente.remind(b.dataset.remind); b.disabled = true; b.textContent = 'Recordatorio enviado'; } };
    if (list.some(n => !n.read)) { list.forEach(n => n.read = true); S.save(); }
  }

  function init() {
    $('userRole').value = role;
    $('userRole').addEventListener('change', e => setRole(e.target.value));
    $('bell').addEventListener('click', openNotifs);
    $('dialogClose').addEventListener('click', EV.ui.closeDialog);
    const dlg = $('dialog');
    dlg.addEventListener('close', () => {
      EV.ui.currentDetail = null; if (EV.ui.currentCleanup) { EV.ui.currentCleanup(); EV.ui.currentCleanup = null; }
      if (dlg._onClose) dlg._onClose();
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) EV.ui.closeDialog(); });   // clic en el fondo cierra

    // Pestañas: clic y navegación con flechas / Inicio / Fin
    const tl = $('tablist');
    tl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab); });
    tl.addEventListener('keydown', e => {
      const tabs = [...tl.querySelectorAll('.tab')], i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(tabs[n].dataset.tab, true); }
    });

    // Actualización automática (HU-06, HU-17, HU-29): cada cambio de datos refresca la vista activa
    document.addEventListener('ev:data', () => {
      updateBell();
      if (current.refresh) current.refresh();
      if (EV.ui.isDialogOpen() && EV.ui.currentDetail) EV.ui.currentDetail();
    });

    $('resetDemo').addEventListener('click', () => {
      if (confirm('¿Restablecer todos los datos de demostración? Se perderán los reportes que creaste.')) { S.reset(); setRole(role, true); EV.ui.toast('Datos de demostración restablecidos.', 'success'); }
    });
    setRole(role, true);
  }
  document.addEventListener('DOMContentLoaded', init);
  return { goTab, setRole };
})();


document.addEventListener('DOMContentLoaded', () => {
  // Seleccionamos TODAS las tarjetas que tengan la clase 'tarjeta-interactiva'
  const tarjetas = document.querySelectorAll('.tarjeta-interactiva');

  tarjetas.forEach(tarjeta => {
    tarjeta.addEventListener('click', (event) => {
      // (Opcional) Si quieres que al abrir una se cierren las demás automáticamente:
      tarjetas.forEach(t => { 
        if (t !== tarjeta) t.classList.remove('activa'); 
      });

      // Alterna el estado abierto/cerrado de la tarjeta a la que le diste clic
      tarjeta.classList.toggle('activa');
      event.stopPropagation(); // Evita que el clic se propague al documento
    });
  });

  // Cerrar todas las tarjetas al hacer clic en cualquier otra parte de la página
  document.addEventListener('click', () => {
    tarjetas.forEach(tarjeta => {
      tarjeta.classList.remove('activa');
    });
  });
});