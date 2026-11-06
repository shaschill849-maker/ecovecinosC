/* EcoVecinos · main.js
   Arranque: selector de rol, pestañas accesibles, notificaciones, enlaces de la
   landing hacia la demo y refresco automático de las vistas al cambiar los datos. */
EV.app = (function () {
  const S = EV.store, U = EV.util, esc = U.esc;
  const ROLES = { vecino: 'Vecino', dirigente: 'Dirigente de junta', municipal: 'Municipalidad' };
  const ROLE_KEY = 'ecovecinos.role';
  const $ = id => document.getElementById(id);
  const mobileBar = window.matchMedia('(max-width: 639px)');

  let role = U.storage.get(ROLE_KEY);
  if (!ROLES[role]) role = 'vecino';
  let current = {};

  const tabsOf = r => EV.views[r].tabs;

  function renderTabs() {
    $('tablist').innerHTML = tabsOf(role).map(t => {
      const icon = t.icon ? `<img class="tab-icon" src="${t.icon}" alt="" width="22" height="22">`
        : t.glyph ? `<span class="tab-icon" aria-hidden="true">${t.glyph}</span>` : '';
      return `<button type="button" role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="false" aria-controls="tabpanel" tabindex="-1">${icon}<span class="tab-label">${t.label}</span></button>`;
    }).join('');
  }

  function selectTab(id, focus) {
    const tab = tabsOf(role).find(t => t.id === id) || tabsOf(role)[0];
    if (current.destroy) current.destroy();
    EV.camera.stopAll();
    document.querySelectorAll('#tablist .tab').forEach(b => {
      const on = b.dataset.tab === tab.id;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    const panel = $('tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + tab.id);
    // Un contenedor nuevo por vista: los listeners delegados de la vista anterior se descartan con él.
    const view = document.createElement('div');
    view.className = 'view';
    panel.replaceChildren(view);
    current = tab.render(view) || {};
  }

  function setRole(r, silent, tabId) {
    role = r; U.storage.set(ROLE_KEY, r); $('userRole').value = r;
    renderTabs();
    if (EV.views[r].checkAlerts) EV.views[r].checkAlerts();       // HU-20, HU-44
    selectTab(tabId || tabsOf(r)[0].id);
    updateBell();
    if (!silent) EV.ui.toast(`Vista de ${ROLES[r]}.`, 'info');
  }

  function goTab(id) { selectTab(id, true); U.scrollToEl($('demo')); }

  /** En móvil las pestañas son una barra fija: si el panel no está a la vista, se lleva al usuario a él. */
  function revealPanel() {
    if (!mobileBar.matches) return;
    const top = $('tabpanel').getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) U.scrollToEl($('demo'));
  }

  /* ---------- Notificaciones ---------- */
  const mineNotifs = () => S.s.notifications.filter(n => n.to === role);
  function updateBell() {
    const n = mineNotifs().filter(x => !x.read).length;
    $('bellCount').textContent = n > 99 ? '99+' : n; $('bellCount').hidden = !n;
    $('bell').setAttribute('aria-label', `Notificaciones${n ? `: ${n} sin leer` : ''}`);
  }
  function openNotifs() {
    const list = mineNotifs(), view = EV.views[role];
    const canOpen = n => n.ref && view.openRef && (view.refTypes || []).includes(n.ref.split('-')[0]);
    const html = list.length ? `<ul class="thread">${list.map(n => `<li class="msg ${n.read ? '' : 'msg--new'}">
        ${n.read ? '' : '<span class="sr-only">Nueva: </span>'}${esc(n.text)}<br><span class="text-muted">${U.fmtDateTime(n.ts)}</span>
        ${n.photo ? `<br><img class="thumb thumb--lg" src="${n.photo}" alt="Evidencia fotográfica de la limpieza">` : ''}
        <div class="msg-actions">
          ${canOpen(n) ? `<button type="button" class="btn btn-secondary btn-sm" data-ref="${esc(n.ref)}">Ver ${esc(n.ref)}</button>` : ''}
          ${role === 'dirigente' && n.text.startsWith('Seguimiento pendiente') ? `<button type="button" class="btn btn-primary btn-sm" data-remind="${esc(n.ref)}">Reenviar recordatorio</button>` : ''}
        </div></li>`).join('')}</ul>` : '<p class="empty">No tienes notificaciones.</p>';
    const body = EV.ui.openDialog('Notificaciones', html);
    body.onclick = e => {
      const rem = e.target.closest('[data-remind]');
      if (rem) { EV.views.dirigente.remind(rem.dataset.remind); rem.disabled = true; rem.textContent = 'Recordatorio enviado'; return; }
      const ref = e.target.closest('[data-ref]');
      if (ref) { EV.ui.closeDialog(); view.openRef(ref.dataset.ref); }
    };
    if (list.some(n => !n.read)) { list.forEach(n => n.read = true); S.save(); }
  }

  /* ---------- Refresco sin perder lo que el usuario está escribiendo ----------
     Las vistas se redibujan con innerHTML cuando cambian los datos (incluso desde
     otra pestaña). Se guardan y restauran los valores de los campos y el foco,
     salvo los del formulario que acaba de enviarse, que deben quedar limpios. */
  // Se marca en fase de captura y se limpia con setTimeout (no con una microtarea:
  // esas se ejecutan entre listeners, antes de que el handler del formulario guarde).
  let submittedForm = null;
  document.addEventListener('submit', e => {
    submittedForm = e.target;
    setTimeout(() => { submittedForm = null; }, 0);
  }, true);

  function preserving(container, redraw) {
    const fields = [...container.querySelectorAll('input[id], textarea[id], select[id]')]
      .filter(el => !(submittedForm && submittedForm.contains(el)))
      .map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]);
    const active = document.activeElement;
    const hadFocus = !!active && container.contains(active);
    const focusId = hadFocus && active.id ? active.id : null;
    const dialog = container.closest('dialog'), scrollTop = dialog ? dialog.scrollTop : 0;

    redraw();

    fields.forEach(([id, v]) => {
      const el = container.querySelector('#' + CSS.escape(id));
      if (!el || el.disabled) return;
      if (el.type === 'checkbox') el.checked = v; else if (el.value !== v) el.value = v;
    });
    if (dialog) dialog.scrollTop = scrollTop;
    if (hadFocus && !active.isConnected) {
      const again = focusId && container.querySelector('#' + CSS.escape(focusId));
      (again || container.closest('[tabindex="-1"]') || container).focus({ preventScroll: true });
    }
  }

  function wireLanding() {
    // Tarjetas de «Cómo funciona»: llevan a la pestaña de la demo correspondiente.
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-goto]');
      if (!a) return;
      e.preventDefault();
      const [r, tab] = a.dataset.goto.split(':');
      if (r !== role) setRole(r, false, tab); else selectTab(tab);
      U.scrollToEl($('demo'));
      $('tab-' + tab)?.focus({ preventScroll: true });
    });

    // Enlace activo del menú según la sección visible.
    const links = [...document.querySelectorAll('.nav-list a[href^="#"]')];
    if (!('IntersectionObserver' in window) || !links.length) return;
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.toggleAttribute('aria-current', l.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(l => { const s = document.querySelector(l.getAttribute('href')); if (s) io.observe(s); });
  }

  function init() {
    $('userRole').value = role;
    $('userRole').addEventListener('change', e => setRole(e.target.value));
    $('bell').addEventListener('click', openNotifs);
    $('dialogClose').addEventListener('click', EV.ui.closeDialog);
    const dlg = $('dialog');
    dlg.addEventListener('close', () => {
      EV.ui.resetDialogHooks();
      if (dlg._onClose) dlg._onClose();
    });
    EV.ui.closeOnBackdrop(dlg);
    const cdlg = $('confirmDialog');
    if (cdlg) EV.ui.closeOnBackdrop(cdlg);

    // Pestañas: clic y teclado (flechas, Inicio, Fin) según el patrón ARIA de tabs.
    const tl = $('tablist');
    tl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { selectTab(b.dataset.tab); revealPanel(); } });
    tl.addEventListener('keydown', e => {
      const tabs = [...tl.querySelectorAll('.tab')], i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(tabs[n].dataset.tab, true); }
    });

    // HU-06, HU-17, HU-29: cada cambio de datos refresca la vista activa y el diálogo abierto.
    document.addEventListener('ev:data', () => {
      updateBell();
      if (current.refresh) preserving($('tabpanel'), current.refresh);
      if (EV.ui.isDialogOpen() && EV.ui.currentDetail) preserving($('dialogBody'), EV.ui.currentDetail);
    });

    $('resetDemo').addEventListener('click', async () => {
      const ok = await EV.ui.confirm('Se borrarán los reportes, faenas y mensajes que creaste y se cargarán de nuevo los datos de ejemplo.',
        { title: '¿Restablecer los datos de demostración?', ok: 'Restablecer' });
      if (!ok) return;
      S.reset(); setRole(role, true); EV.ui.toast('Datos de demostración restablecidos.', 'success');
    });

    wireLanding();
    setRole(role, true);
  }
  document.addEventListener('DOMContentLoaded', init);
  return { goTab, setRole };
})();
