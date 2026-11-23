EV.app = (function () {
  const S = EV.store;
  const U = EV.util;
  const esc = U.esc;
  const ROLES = { vecino: 'Vecino', dirigente: 'Dirigente de junta', municipal: 'Municipalidad' };
  const $ = id => document.getElementById(id);

  let role = localStorage.getItem('ecovecinos.role');
  if (!ROLES[role]) role = 'vecino';
  let current = {};
  let sinLeerAntes = 0;

  function tabsDe(rol) {
    return EV.views[rol].tabs;
  }

  function renderTabs() {
    $('tablist').innerHTML = tabsDe(role).map(t => `
      <button role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="false" aria-controls="tabpanel" tabindex="-1">
        <img src="${t.icon}" alt="" aria-hidden="true" width="22" height="22"><span>${t.label}</span>
      </button>`).join('');
  }

  function cerrarVista() {
    if (current.destroy) current.destroy();
    current = {};
    EV.camera.stopAll();
  }

  function selectTab(id, conFoco, porUsuario) {
    cerrarVista();
    document.querySelectorAll('#tablist .tab').forEach(b => {
      const activa = b.dataset.tab === id;
      b.setAttribute('aria-selected', activa);
      b.tabIndex = activa ? 0 : -1;
      if (activa && conFoco) b.focus();
    });
    const panel = $('tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + id);
    panel.innerHTML = '';
    const vista = document.createElement('div');
    vista.className = 'view entrando';
    panel.appendChild(vista);
    const tab = tabsDe(role).find(t => t.id === id);
    current = tab.render(vista, { porUsuario: Boolean(porUsuario) }) || {};
    setTimeout(() => vista.classList.remove('entrando'), 700);
  }

  function goTab(id) {
    selectTab(id, true, true);
    window.scrollTo({ top: $('demo').offsetTop - 10, behavior: 'smooth' });
  }

  function marcarRol() {
    document.querySelectorAll('[data-role]').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.role === role ? 'true' : 'false');
    });
  }

  function setRole(nuevoRol) {
    cerrarVista();
    role = nuevoRol;
    localStorage.setItem('ecovecinos.role', nuevoRol);
    marcarRol();
    renderTabs();
    sinLeerAntes = Infinity;
    if (EV.views[nuevoRol].checkAlerts) EV.views[nuevoRol].checkAlerts();
    selectTab(tabsDe(nuevoRol)[0].id);
    updateBell();
  }

  function irA(destino) {
    const partes = destino.split(':');
    if (partes[0] !== role) setRole(partes[0]);
    goTab(partes[1]);
  }

  function misNotificaciones() {
    return S.s.notifications.filter(n => n.to === role);
  }

  function updateBell() {
    const sinLeer = misNotificaciones().filter(n => !n.read).length;
    const contador = $('bellCount');
    contador.textContent = sinLeer > 99 ? '99+' : sinLeer;
    contador.hidden = !sinLeer;
    $('bell').setAttribute('aria-label', sinLeer ? 'Notificaciones: ' + sinLeer + ' sin leer' : 'Notificaciones');
    if (sinLeer > sinLeerAntes) {
      $('bell').classList.remove('bell--nueva');
      contador.classList.remove('bell-count--pop');
      void $('bell').offsetWidth;
      $('bell').classList.add('bell--nueva');
      contador.classList.add('bell-count--pop');
    }
    sinLeerAntes = sinLeer;
  }

  // HU-05 Notificaciones del vecino y HU-44 reenviar recordatorio desde la notificación
  function abrirNotificaciones() {
    const lista = misNotificaciones();
    let html = '<p class="empty">No tienes notificaciones.</p>';
    if (lista.length) {
      html = '<ul class="thread">' + lista.map(n => {
        const foto = n.photo ? `<br><img class="thumb thumb--lg" src="${n.photo}" alt="Evidencia fotográfica de la limpieza">` : '';
        const recordar = role === 'dirigente' && n.tipo === 'seguimiento'
          ? `<br><button class="btn btn-primary btn-sm" data-remind="${esc(n.ref)}">Reenviar recordatorio</button>`
          : '';
        return `<li class="msg ${n.read ? '' : 'msg--new'}">${esc(n.text)}<br><span class="text-muted">${U.fmtDateTime(n.ts)}</span>${foto}${recordar}</li>`;
      }).join('') + '</ul>';
    }
    const body = EV.ui.openDialog('Notificaciones', html);
    EV.ui.currentDetail = null;
    body.onclick = e => {
      const b = e.target.closest('[data-remind]');
      if (b) {
        EV.views.dirigente.remind(b.dataset.remind);
        b.disabled = true;
        b.textContent = 'Recordatorio enviado';
      }
    };
    if (lista.some(n => !n.read)) {
      lista.forEach(n => { n.read = true; });
      S.save();
    }
  }

  function mostrarPagina() {
    document.body.classList.add('listo');
    revelarAlBajar();
  }

  function revelarAlBajar() {
    const elementos = document.querySelectorAll('.revelar:not(.visible)');
    if (!('IntersectionObserver' in window) || EV.ui.movimientoReducido()) {
      elementos.forEach(el => el.classList.add('visible'));
      return;
    }
    const observador = new IntersectionObserver(entradas => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible');
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    elementos.forEach(el => observador.observe(el));
  }

  function init() {
    document.querySelectorAll('[data-role]').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.role !== role) setRole(b.dataset.role);
      });
    });
    document.querySelectorAll('[data-ir]').forEach(enlace => {
      enlace.addEventListener('click', e => {
        e.preventDefault();
        irA(enlace.dataset.ir);
      });
    });

    $('bell').addEventListener('click', abrirNotificaciones);
    $('bell').addEventListener('animationend', e => {
      if (e.animationName === 'campana') $('bell').classList.remove('bell--nueva');
      if (e.animationName === 'pop') $('bellCount').classList.remove('bell-count--pop');
    });

    $('dialogClose').addEventListener('click', EV.ui.closeDialog);
    const dlg = $('dialog');
    dlg.addEventListener('close', () => {
      EV.ui.currentDetail = null;
      if (EV.ui.currentCleanup) {
        EV.ui.currentCleanup();
        EV.ui.currentCleanup = null;
      }
    });
    dlg.addEventListener('click', e => {
      if (e.target === dlg) EV.ui.closeDialog();
    });

    const tabs = $('tablist');
    tabs.addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (b) selectTab(b.dataset.tab, false, true);
    });
    tabs.addEventListener('keydown', e => {
      const lista = Array.from(tabs.querySelectorAll('.tab'));
      const i = lista.indexOf(document.activeElement);
      if (i < 0) return;
      let siguiente = null;
      if (e.key === 'ArrowRight') siguiente = (i + 1) % lista.length;
      else if (e.key === 'ArrowLeft') siguiente = (i - 1 + lista.length) % lista.length;
      else if (e.key === 'Home') siguiente = 0;
      else if (e.key === 'End') siguiente = lista.length - 1;
      if (siguiente !== null) {
        e.preventDefault();
        selectTab(lista[siguiente].dataset.tab, true, true);
      }
    });

    // HU-06 y HU-17 Actualizar la vista cuando cambian los datos
    document.addEventListener('ev:data', () => {
      updateBell();
      if (current.refresh) current.refresh();
      if (EV.ui.isDialogOpen() && EV.ui.currentDetail) EV.ui.currentDetail();
    });

    document.addEventListener('input', e => {
      const campo = e.target;
      if (campo.getAttribute('aria-invalid') !== 'true') return;
      campo.removeAttribute('aria-invalid');
      const error = document.getElementById(campo.getAttribute('aria-describedby'));
      if (error) error.textContent = '';
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('[data-ubicacion-demo]')) return;
      EV.geo.usarDemo();
      EV.ui.toast('Se usará la ubicación de demostración (Lima).', 'info');
      if (current.refresh) current.refresh();
    });

    $('resetDemo').addEventListener('click', () => {
      EV.ui.confirmar('¿Restablecer todos los datos de demostración? Se perderán los reportes que creaste.', 'Sí, restablecer', () => {
        S.reset();
        setRole(role);
        EV.ui.toast('Datos de demostración restablecidos.', 'success');
      });
    });

    EV.selector.mejorarTodos(document);
    const observador = new MutationObserver(() => EV.selector.mejorarTodos(document));
    observador.observe(document.body, { childList: true, subtree: true });

    setRole(role);
    mostrarPagina();
  }

  document.addEventListener('DOMContentLoaded', init);
  return { goTab };
})();
