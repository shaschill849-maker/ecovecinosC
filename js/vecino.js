EV.views = EV.views || {};

EV.views.vecino = (function () {
  const S = EV.store;
  const U = EV.util;
  const esc = U.esc;
  const me = () => S.USER;
  const FROM = { vecino: 'Tú', municipal: 'Municipalidad', dirigente: 'Junta vecinal' };

  // HU-06 Ver estado del reporte y HU-10 Comentar un reporte enviado
  function openDetail(id) {
    const r0 = S.s.reports.find(x => x.id === id);
    const body = EV.ui.openDialog('Reporte ' + r0.id, '');

    function draw() {
      const r = S.s.reports.find(x => x.id === id);
      if (!r) return;
      const mio = r.reporterId === me();
      const zona = S.zoneById(r.zone);

      let comentarios = '<p class="text-muted">Aún no hay comentarios.</p>';
      if (r.thread.length) {
        comentarios = '<ul class="thread">' + r.thread.map(m =>
          `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`
        ).join('') + '</ul>';
      }

      let resuelto = '';
      if (r.status === 'resolved' && r.after) {
        resuelto = `<h3>Reporte resuelto</h3><p>Cerrado el ${U.fmtDate(r.closedAt)} tras validar la evidencia.</p>
          <div class="before-after">
            <figure><img src="${r.photo.dataUrl}" alt="Foto de antes"><figcaption>Antes</figcaption></figure>
            <figure><img src="${r.after.photo.dataUrl}" alt="Foto de después, con la limpieza validada"><figcaption>Después</figcaption></figure>
          </div>`;
      }

      let formulario = '';
      if (mio && r.status !== 'resolved') {
        formulario = `<form id="cmtForm" class="form-group" novalidate>
          <label for="cmt">Agregar un comentario (ej.: la situación empeoró)</label>
          <textarea id="cmt" rows="3" maxlength="280" aria-describedby="cmtErr"></textarea>
          <p class="field-error" id="cmtErr" role="alert"></p>
          <button class="btn btn-primary" type="submit">Enviar comentario</button>
        </form>`;
      } else if (mio) {
        formulario = '<p class="text-muted">Los reportes resueltos ya no admiten comentarios.</p>';
      }

      body.innerHTML = `
        <img class="detail-photo" src="${r.photo.dataUrl}" alt="Foto del foco de basura del reporte ${esc(r.id)}">
        <dl class="dl">
          <dt>Estado</dt><dd aria-live="polite">${EV.ui.badge(r.status)} <span class="text-muted">Se actualiza automáticamente.</span></dd>
          <dt>Zona</dt><dd>${esc(zona.name)} (${U.fmtCoords(r.lat, r.lng)})</dd>
          <dt>Enviado</dt><dd>${U.fmtDateTime(r.createdAt)}${r.reserved && mio ? ', reporte reservado' : ''}</dd>
          ${r.tipo ? `<dt>Tipo</dt><dd>${esc(S.TIPOS[r.tipo].label)}</dd>` : ''}
          ${r.tamano ? `<dt>Tamaño</dt><dd>${esc(S.TAMANOS[r.tamano].label)}</dd>` : ''}
          ${r.supporters.length ? `<dt>Apoyos</dt><dd>${r.supporters.length} vecino(s) más reportaron este punto</dd>` : ''}
        </dl>
        ${resuelto}
        <h3>Comentarios</h3>
        ${comentarios}
        ${formulario}`;

      const form = body.querySelector('#cmtForm');
      if (form) {
        form.addEventListener('submit', e => {
          e.preventDefault();
          const texto = body.querySelector('#cmt').value.trim();
          if (!EV.ui.setError(body, 'cmtErr', texto ? '' : 'Escribe un comentario antes de enviar.')) return;
          S.addMessage(r.thread, 'vecino', texto);
          S.notify('municipal', 'Nuevo comentario del vecino en ' + r.id + '.', r.id);
          S.save();
          EV.ui.toast('Comentario enviado.', 'success');
        });
      }
    }

    EV.ui.currentDetail = draw;
    draw();
  }

  function reportar(root) {
    let step = 1;
    let photo = null;
    let pin = null;
    let cam = null;
    let mapCtl = null;
    let created = null;
    let dismissed = false;
    const draft = { tipo: '', tamano: '', reserved: false, radius: 250 };

    function pasosHtml() {
      const nombres = ['Foto', 'Ubicación', 'Confirmación'];
      return '<ol class="steps" aria-label="Progreso del reporte">' + nombres.map((nombre, i) => {
        const numero = i + 1;
        const actual = numero === step ? 'aria-current="step"' : '';
        const hecho = numero < step ? 'done' : '';
        let linea = '';
        if (numero < nombres.length) {
          const llena = numero < step - 1 ? 100 : 0;
          linea = `<span class="steps-linea" aria-hidden="true"><span style="width: ${llena}%" ${numero === step - 1 ? 'data-llenar' : ''}></span></span>`;
        }
        return `<li ${actual} class="${hecho}"><span class="steps-n">${numero}</span><span class="steps-nombre">${nombre}</span>${linea}</li>`;
      }).join('') + '</ol>';
    }

    function cleanup() {
      if (cam) cam.destroy();
      if (mapCtl) mapCtl.destroy();
      cam = null;
      mapCtl = null;
    }

    function draw() {
      cleanup();
      if (step === 1) step1();
      else if (step === 2) step2();
      else step3();
      const linea = root.querySelector('[data-llenar]');
      if (linea) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          linea.style.width = '100%';
        }));
      }
    }

    // HU-01 Capturar foto desde cámara
    function step1() {
      photo = null;
      root.innerHTML = `<div class="card card--paso">${pasosHtml()}
        <div class="paso-intro">
          <h2>Toma la foto del foco de basura</h2>
          <p class="text-muted">Se toma con la cámara en el momento para que la evidencia sea real y reciente. La foto guarda la fecha, la hora y la ubicación.</p>
        </div>
        <div id="camBox"></div>
        <div class="paso-pie acciones-fijas">
          <p class="paso-aviso" id="hint1">Necesitas una foto para continuar.</p>
          <button type="button" class="btn btn-primary" id="next1" disabled>Continuar</button>
        </div>
      </div>`;
      cam = EV.camera.mount(root.querySelector('#camBox'), {
        onChange: p => {
          photo = p;
          root.querySelector('#next1').disabled = !p;
          root.querySelector('#hint1').textContent = p ? 'Foto lista. Ya puedes continuar.' : 'Necesitas una foto para continuar.';
        }
      });
      root.querySelector('#next1').addEventListener('click', () => {
        step = 2;
        draw();
      });
    }

    // HU-02 Adjuntar ubicación GPS, HU-03 Enviar reporte rápido, HU-04 Ver reportes cercanos y HU-39 Reporte reservado
    function step2() {
      const yaPregunto = S.s.settings.geoConsent;
      if (!pin) pin = { lat: EV.geo.get().lat, lng: EV.geo.get().lng };

      let avisoPermiso = '';
      if (!yaPregunto) {
        avisoPermiso = `<div class="notice" role="region" aria-label="Permiso de ubicación">
          <h3>Usaremos tu ubicación</h3>
          <p>EcoVecinos usa tu ubicación solo para marcar dónde está el foco de basura y derivarlo a la municipalidad y a la junta de la zona. Si no la permites, puedes marcar el punto en el mapa.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-primary" id="geoAllow">Permitir ubicación</button>
            <button type="button" class="btn btn-secondary" id="geoDeny">Ahora no, marcaré el punto en el mapa</button>
          </div>
        </div>`;
      }

      const estadoUbicacion = EV.geo.get().exact
        ? 'Ubicación GPS obtenida automáticamente.'
        : 'Ubicación aproximada: mueve el pin si no es exacta.';

      const opcionesTipo = Object.keys(S.TIPOS).map(k => `<option value="${k}">${S.TIPOS[k].label}</option>`).join('');
      const opcionesTamano = Object.keys(S.TAMANOS).map(k => `<option value="${k}">${S.TAMANOS[k].label}</option>`).join('');

      root.innerHTML = `<div class="card card--paso">${pasosHtml()}
        <div class="paso-intro">
          <h2>Confirma la ubicación y envía</h2>
          <p class="text-muted">Revisa que el pin esté sobre el foco de basura. El resto de datos es opcional.</p>
        </div>
        ${avisoPermiso}
        ${EV.ui.avisoUbicacionDemo()}
        <p class="status-text" role="status">${estadoUbicacion}</p>
        <div id="pinMap" class="map map--sm" role="region" aria-label="Mapa para ajustar la ubicación del reporte"></div>
        <p class="text-muted">Arrastra el pin o toca el mapa para corregir la ubicación.</p>
        <div id="routeInfo" class="notice notice--soft" aria-live="polite"></div>
        <div class="form-row">
          <label for="radius">Mostrar reportes activos a menos de</label>
          <select id="radius">
            <option value="100">100 m</option>
            <option value="250">250 m</option>
            <option value="500">500 m</option>
            <option value="1000">1 km</option>
          </select>
        </div>
        <div id="nearby" aria-live="polite"></div>
        <fieldset class="form-group">
          <legend>Datos opcionales (ayudan a priorizar)</legend>
          <div class="form-row"><label for="tipo">Tipo de residuo</label>
            <select id="tipo"><option value="">No sé / prefiero no indicar</option>${opcionesTipo}</select></div>
          <div class="form-row"><label for="tamano">Tamaño aproximado</label>
            <select id="tamano"><option value="">No sé / prefiero no indicar</option>${opcionesTamano}</select></div>
        </fieldset>
        <div class="form-group checkbox-group">
          <input type="checkbox" id="reserved">
          <label for="reserved"><strong>Reporte reservado:</strong> mi nombre no se mostrará a otros vecinos.</label>
        </div>
        <p class="text-muted">EcoVecinos nunca pide nombres ni datos de otras personas: el reporte registra solo el punto geográfico.</p>
        <div class="paso-pie acciones-fijas">
          <button type="button" class="btn btn-ghost" id="back2">Volver a la foto</button>
          <button type="button" class="btn btn-primary" id="send">Enviar reporte</button>
        </div>
      </div>`;

      const $ = selector => root.querySelector(selector);
      $('#radius').value = String(draft.radius);
      $('#tipo').value = draft.tipo;
      $('#tamano').value = draft.tamano;
      $('#reserved').checked = draft.reserved;

      mapCtl = EV.map.create('pinMap', pin, 17);
      if (mapCtl) {
        const marcador = L.marker([pin.lat, pin.lng], { draggable: true, keyboard: true, title: 'Ubicación del reporte' }).addTo(mapCtl.map);
        marcador.on('dragend', () => {
          const p = marcador.getLatLng();
          moverPin(p.lat, p.lng);
        });
        mapCtl.map.on('click', e => {
          marcador.setLatLng(e.latlng);
          moverPin(e.latlng.lat, e.latlng.lng);
        });
      }

      function moverPin(lat, lng) {
        pin = { lat: lat, lng: lng };
        dismissed = false;
        mostrarCercanos();
      }

      function mostrarCercanos() {
        const zona = S.zoneFor(pin.lat, pin.lng);
        const junta = S.juntaOfZone(zona.id);
        $('#routeInfo').innerHTML = `Tu reporte se derivará a <strong>${esc(S.MUNI)}</strong> y a la <strong>${esc(junta ? junta.name : 'junta de la zona')}</strong> (${esc(zona.name)}). No necesitas elegirlas.`;

        const cercanos = S.s.reports
          .filter(r => r.status !== 'resolved')
          .map(r => ({ r: r, d: U.dist(pin, r) }))
          .filter(x => x.d <= draft.radius)
          .sort((a, b) => a.d - b.d);
        if (mapCtl) mapCtl.setMarkers(cercanos.map(x => x.r));

        const repetido = cercanos.find(x => x.d <= 30);
        let html = '';
        if (repetido && !dismissed) {
          html += `<div class="notice notice--warn" role="alert">
            <p><strong>Ya existe un reporte aquí (${esc(repetido.r.id)}, a ${U.fmtDist(repetido.d)}).</strong> ${EV.ui.badge(repetido.r.status)}<br>Para evitar duplicados, puedes sumarte a ese reporte.</p>
            <div class="form-actions">
              <button type="button" class="btn btn-primary" data-join="${repetido.r.id}">Sumarme al reporte existente</button>
              <button type="button" class="btn btn-secondary" id="notSame">Es otro punto, continuar</button>
            </div>
          </div>`;
        }
        if (cercanos.length) {
          html += `<p class="status-text">${cercanos.length} reporte(s) activo(s) a menos de ${U.fmtDist(draft.radius)}:</p><ul class="plain-list">` +
            cercanos.slice(0, 5).map(x => `<li>${esc(x.r.id)} - ${EV.ui.badge(x.r.status)} a ${U.fmtDist(x.d)}</li>`).join('') + '</ul>';
        } else {
          html += '<p class="text-muted">No hay reportes activos cerca de este punto.</p>';
        }
        $('#nearby').innerHTML = html;

        const otroPunto = $('#notSame');
        if (otroPunto) {
          otroPunto.addEventListener('click', () => {
            dismissed = true;
            mostrarCercanos();
          });
        }
        root.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', () => sumarse(b.dataset.join)));
      }
      mostrarCercanos();

      const permitir = $('#geoAllow');
      if (permitir) {
        permitir.addEventListener('click', async () => {
          const resultado = await EV.geo.request();
          S.s.settings.geoConsent = true;
          S.save();
          if (resultado.ok) {
            const g = EV.geo.get();
            pin = { lat: g.lat, lng: g.lng };
            EV.ui.toast('Ubicación obtenida.', 'success');
          } else {
            EV.ui.toast('No pudimos obtener tu ubicación. Marca el punto en el mapa.', 'warn');
          }
          draw();
        });
        $('#geoDeny').addEventListener('click', () => {
          S.s.settings.geoConsent = true;
          S.save();
          draw();
        });
      }

      const demo = root.querySelector('[data-ubicacion-demo]');
      if (demo) {
        demo.addEventListener('click', () => {
          EV.geo.usarDemo();
          const g = EV.geo.get();
          pin = { lat: g.lat, lng: g.lng };
          draw();
        });
      }

      $('#radius').addEventListener('change', e => {
        draft.radius = Number(e.target.value);
        mostrarCercanos();
      });
      $('#tipo').addEventListener('change', e => { draft.tipo = e.target.value; });
      $('#tamano').addEventListener('change', e => { draft.tamano = e.target.value; });
      $('#reserved').addEventListener('change', e => { draft.reserved = e.target.checked; });
      $('#back2').addEventListener('click', () => {
        step = 1;
        draw();
      });
      $('#send').addEventListener('click', enviar);
    }

    function sumarse(id) {
      const r = S.s.reports.find(x => x.id === id);
      if (!r.supporters.includes(me()) && r.reporterId !== me()) r.supporters.push(me());
      S.notify('vecino', 'Te sumaste al reporte ' + r.id + '. Recibirás avisos de su estado.', r.id);
      S.notify('municipal', 'Un vecino más reportó el punto ' + r.id + '.', r.id);
      marcarVisto(r);
      S.save();
      created = { report: r, joined: true };
      step = 3;
      draw();
    }

    // HU-05 Confirmar reporte con código único
    function enviar() {
      if (!photo) {
        EV.ui.toast('Falta la foto del reporte.', 'error');
        step = 1;
        draw();
        return;
      }
      const zona = S.zoneFor(pin.lat, pin.lng);
      const r = {
        id: S.nextId('REP', 'rep'), createdAt: Date.now(), zone: zona.id, lat: pin.lat, lng: pin.lng,
        tipo: draft.tipo || null, tamano: draft.tamano || null, reserved: draft.reserved, reporterId: me(), source: 'vecino',
        status: 'pending', photo: photo, supporters: [], thread: [], after: null, override: null, closedAt: null, closedBy: null
      };
      S.s.reports.push(r);
      marcarVisto(r);
      S.notify('vecino', 'Tu reporte ' + r.id + ' fue registrado correctamente.', r.id);
      S.notify('municipal', 'Nuevo reporte ' + r.id + ' en ' + zona.name + '.', r.id);
      if (!S.save()) {
        S.s.reports.pop();
        return;
      }
      created = { report: r, joined: false };
      step = 3;
      draw();
    }

    function step3() {
      const r = created.report;
      const zona = S.zoneById(r.zone);
      const junta = S.juntaOfZone(zona.id);
      root.innerHTML = `<div class="card card--paso">${pasosHtml()}
        <div class="confirm" role="status">
          <svg class="check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg>
          <h2>${created.joined ? 'Te sumaste al reporte' : 'Reporte enviado'}</h2>
          <p>Tu código de seguimiento es:</p>
          <p class="code">${esc(r.id)}</p>
          <p class="text-muted">Quedó en tu historial y fue derivado a ${esc(S.MUNI)} y a la ${esc(junta ? junta.name : 'junta de la zona')}.</p>
          ${r.reserved && !created.joined ? '<p class="text-muted">Reporte reservado: tu nombre no se muestra a otros vecinos.</p>' : ''}
        </div>
        <div class="form-actions confirm-acciones">
          <button type="button" class="btn btn-primary" id="goMine">Ver mis reportes</button>
          <button type="button" class="btn btn-secondary" id="again">Hacer otro reporte</button>
        </div>
      </div>`;
      root.querySelector('#goMine').addEventListener('click', () => EV.app.goTab('mis'));
      root.querySelector('#again').addEventListener('click', () => {
        step = 1;
        photo = null;
        pin = null;
        dismissed = false;
        draft.tipo = '';
        draft.tamano = '';
        draft.reserved = false;
        draw();
      });
    }

    draw();
    return { destroy: cleanup };
  }

  // HU-04 Ver reportes activos cercanos
  function cerca(root) {
    let radio = 500;
    let circulo = null;
    root.innerHTML = `<div class="card"><h2>Reportes activos cerca de mí</h2>
      <p class="text-muted">Revisa si el foco ya fue reportado antes de crear uno nuevo.</p>
      <div id="demoAviso"></div>
      <div class="form-row">
        <label for="rad">Radio de búsqueda</label>
        <select id="rad">
          <option value="200">200 m</option>
          <option value="500" selected>500 m</option>
          <option value="1000">1 km</option>
          <option value="2000">2 km</option>
        </select>
        <button type="button" class="btn btn-secondary" id="loc">Actualizar mi ubicación</button>
      </div>
      <div id="nearMap" class="map" role="region" aria-label="Mapa de reportes activos cercanos"></div>
      <div id="nearList" aria-live="polite"></div>
    </div>`;
    const mapCtl = EV.map.create('nearMap', EV.geo.get(), 15);

    function draw() {
      const centro = EV.geo.get();
      root.querySelector('#demoAviso').innerHTML = EV.ui.avisoUbicacionDemo();
      const lista = S.s.reports
        .filter(r => r.status !== 'resolved')
        .map(r => ({ r: r, d: U.dist(centro, r) }))
        .filter(x => x.d <= radio)
        .sort((a, b) => a.d - b.d);

      if (mapCtl) {
        if (circulo) circulo.remove();
        circulo = L.circle([centro.lat, centro.lng], { radius: radio, color: '#1e5b3a', weight: 1, fillOpacity: 0.05 }).addTo(mapCtl.map);
        mapCtl.setMarkers(lista.map(x => x.r), openDetail);
        mapCtl.map.fitBounds(circulo.getBounds());
      }

      if (lista.length) {
        root.querySelector('#nearList').innerHTML = `<p class="status-text">${lista.length} reporte(s) activo(s) a menos de ${U.fmtDist(radio)}.</p><ul class="item-list">` +
          lista.map(x => `<li class="item">
            <div class="item-main"><strong>${esc(x.r.id)}</strong> ${EV.ui.badge(x.r.status)}<br>
            <span class="text-muted">A ${U.fmtDist(x.d)} - ${esc(S.zoneById(x.r.zone).name)}</span></div>
            <button class="btn btn-secondary btn-sm" data-open="${x.r.id}">Ver detalle</button>
          </li>`).join('') + '</ul>';
      } else {
        root.querySelector('#nearList').innerHTML = '<p class="empty">No hay reportes activos en este radio. Puedes crear el primero desde la pestaña Reportar.</p>';
      }
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b) openDetail(b.dataset.open);
    });
    root.querySelector('#rad').addEventListener('change', e => {
      radio = Number(e.target.value);
      draw();
    });
    root.querySelector('#loc').addEventListener('click', async () => {
      const resultado = await EV.geo.request();
      S.s.settings.geoConsent = true;
      S.save();
      if (resultado.ok) EV.ui.toast('Ubicación actualizada.', 'success');
      else EV.ui.toast('No pudimos obtener tu ubicación, se usa la aproximada.', 'warn');
      draw();
    });

    draw();
    return { refresh: draw, destroy: () => { if (mapCtl) mapCtl.destroy(); } };
  }

  function vistos() {
    if (!S.s.settings.vistos) {
      S.s.settings.vistos = {};
      S.s.reports.forEach(r => { S.s.settings.vistos[r.id] = r.status; });
    }
    return S.s.settings.vistos;
  }

  function marcarVisto(r) {
    vistos()[r.id] = r.status;
  }

  // HU-08 Ver historial de reportes y HU-06 aviso de cambio de estado
  function mis(root) {
    let filtro = 'all';
    root.innerHTML = `<div class="card">
      <div class="feed-header"><h2>Mis reportes</h2>
        <div class="form-row"><label for="f">Filtrar por estado</label>
          <select id="f">
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="active">En atención</option>
            <option value="resolved">Resueltos</option>
          </select>
        </div>
      </div>
      <div id="cambios" aria-live="polite"></div>
      <div id="list" aria-live="polite"></div>
    </div>`;

    function draw() {
      const mios = S.s.reports
        .filter(r => r.reporterId === me() || r.supporters.includes(me()))
        .sort((a, b) => b.createdAt - a.createdAt);
      const lista = mios.filter(r => filtro === 'all' || r.status === filtro);
      const cambiados = mios.filter(r => vistos()[r.id] && vistos()[r.id] !== r.status);

      if (cambiados.length) {
        root.querySelector('#cambios').innerHTML = `<div class="notice notice--cambio" role="status">
          <ul>${cambiados.map(r => `<li><strong>${esc(r.id)}</strong> pasó a ${EV.ui.badge(r.status)}</li>`).join('')}</ul>
          <button type="button" class="btn btn-secondary btn-sm" id="visto">Entendido</button>
        </div>`;
        root.querySelector('#visto').addEventListener('click', () => {
          cambiados.forEach(marcarVisto);
          S.save();
        });
      } else {
        root.querySelector('#cambios').innerHTML = '';
      }

      if (lista.length) {
        root.querySelector('#list').innerHTML = '<ul class="item-list">' + lista.map(r => {
          const cambio = cambiados.includes(r) ? ' badge--nuevo' : '';
          return `<li class="item">
          <img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}">
          <div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status).replace('class="badge', 'class="badge' + cambio)}<br>
            <span class="text-muted">${U.fmtDateTime(r.createdAt)} - ${esc(S.zoneById(r.zone).name)}<br>${U.fmtCoords(r.lat, r.lng)}${r.reserved ? ' - Reservado' : ''}</span>
          </div>
          <button class="btn btn-secondary btn-sm" data-open="${r.id}">Ver detalle</button>
        </li>`;
        }).join('') + '</ul>';
      } else {
        const mensaje = mios.length ? 'No hay reportes con ese estado.' : 'Todavía no has enviado reportes.';
        root.querySelector('#list').innerHTML = '<p class="empty">' + mensaje + '</p>';
      }
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b) openDetail(b.dataset.open);
    });
    root.querySelector('#f').addEventListener('change', e => {
      filtro = e.target.value;
      draw();
    });
    draw();
    return { refresh: draw };
  }

  // HU-11 Ver faenas programadas y HU-12 Inscribirse a una faena
  function faenas(root) {
    let distanciaMax = 0;
    root.innerHTML = `<div class="card">
        <div class="feed-header"><h2>Faenas de limpieza</h2><p class="badge badge--info" id="pts"></p></div>
        <div id="demoAviso"></div>
        <div class="form-row"><label for="near">Mostrar faenas</label>
          <select id="near">
            <option value="0">En todas las zonas</option>
            <option value="1000">A menos de 1 km</option>
            <option value="3000">A menos de 3 km</option>
            <option value="5000">A menos de 5 km</option>
          </select>
        </div>
        <div id="fList" aria-live="polite"></div>
      </div>
      <div class="card"><h2>Mi calendario</h2><div id="cal" aria-live="polite"></div></div>`;

    const estoyInscrito = f => f.inscritos.some(i => i.id === me());
    const proximas = () => S.s.faenas
      .filter(f => !f.cancelled && U.startOf(f) >= Date.now())
      .sort((a, b) => U.startOf(a) - U.startOf(b));

    function draw() {
      const g = EV.geo.get();
      root.querySelector('#pts').textContent = 'Tus puntos: ' + (S.s.settings.points[me()] || 0);
      root.querySelector('#demoAviso').innerHTML = distanciaMax ? EV.ui.avisoUbicacionDemo() : '';
      const lista = proximas()
        .map(f => ({ f: f, d: U.dist(g, f) }))
        .filter(x => !distanciaMax || x.d <= distanciaMax);

      if (lista.length) {
        root.querySelector('#fList').innerHTML = '<ul class="item-list">' + lista.map(x => {
          const f = x.f;
          const inscrito = estoyInscrito(f);
          const puedeCancelar = U.startOf(f) - Date.now() >= 24 * HORA;
          const organiza = f.organizer === 'junta' ? 'junta vecinal' : 'municipio';
          const implementos = f.implementos
            ? '<span class="badge badge--resolved">Implementos garantizados (guantes y bolsas)</span>'
            : '<span class="badge badge--late">Trae tus propios implementos</span>';

          let insumos = '<p class="text-muted">Inscríbete para ver qué insumos debes llevar.</p>';
          if (inscrito) {
            insumos = `<div class="notice notice--soft"><strong>Qué llevar:</strong> ${f.insumosVecinos ? esc(f.insumosVecinos) : 'No necesitas llevar nada adicional.'}<br>
              <span class="text-muted">La junta o el municipio aporta: ${esc(f.insumosJunta || '-')}</span></div>`;
          }

          let boton = `<button class="btn btn-primary" data-enroll="${f.id}">Inscribirme</button>`;
          if (inscrito && puedeCancelar) {
            boton = `<button class="btn btn-secondary" data-cancel="${f.id}">Cancelar inscripción</button>`;
          } else if (inscrito) {
            boton = `<button class="btn btn-secondary" data-cancel="${f.id}" disabled aria-describedby="nc-${f.id}">Cancelar inscripción</button>
              <span class="text-muted" id="nc-${f.id}">Solo puedes cancelar hasta 24 h antes.</span>`;
          }

          return `<li class="item item--col">
            <div><strong>${U.fmtDate(U.startOf(f))}, ${esc(f.time)}</strong> - ${esc(f.place)}<br>
              <span class="text-muted">Organiza: ${esc(f.organizerName)} (${organiza}) - a ${U.fmtDist(x.d)} - ${f.inscritos.length} inscrito(s)</span><br>
              ${implementos}
            </div>
            <p>${esc(f.desc)}</p>
            ${insumos}
            <div class="form-actions">${boton}</div>
          </li>`;
        }).join('') + '</ul>';
      } else {
        root.querySelector('#fList').innerHTML = '<p class="empty">No hay faenas programadas con ese filtro.</p>';
      }

      const misFaenas = proximas().filter(estoyInscrito);
      if (misFaenas.length) {
        root.querySelector('#cal').innerHTML = '<ul class="plain-list">' + misFaenas.map(f =>
          `<li><strong>${U.fmtDate(U.startOf(f))}, ${esc(f.time)}</strong> - ${esc(f.place)}</li>`
        ).join('') + '</ul>';
      } else {
        root.querySelector('#cal').innerHTML = '<p class="empty">Aún no te inscribiste a ninguna faena.</p>';
      }
    }

    root.addEventListener('click', e => {
      const inscribir = e.target.closest('[data-enroll]');
      const cancelar = e.target.closest('[data-cancel]');
      if (inscribir) {
        const f = S.s.faenas.find(x => x.id === inscribir.dataset.enroll);
        f.inscritos.push({ id: me(), name: 'Tú (vecino demo)', attended: null });
        S.notify('vecino', 'Inscripción confirmada: faena del ' + U.fmtDate(U.startOf(f)) + ' en ' + f.place + '.', f.id);
        if (f.juntaId) S.notify('dirigente', 'Un vecino se inscribió a la faena en ' + f.place + '.', f.id);
        S.save();
        EV.ui.toast('Inscripción confirmada. Se agregó a tu calendario.', 'success');
      }
      if (cancelar) {
        const f = S.s.faenas.find(x => x.id === cancelar.dataset.cancel);
        if (U.startOf(f) - Date.now() < 24 * HORA) {
          EV.ui.toast('Ya no puedes cancelar: faltan menos de 24 horas.', 'error');
          return;
        }
        f.inscritos = f.inscritos.filter(i => i.id !== me());
        S.save();
        EV.ui.toast('Inscripción cancelada.', 'info');
      }
    });
    root.querySelector('#near').addEventListener('change', e => {
      distanciaMax = Number(e.target.value);
      draw();
    });

    draw();
    return { refresh: draw };
  }

  return {
    tabs: [
      { id: 'reportar', icon: '../assets/camara.svg', label: 'Reportar', render: reportar },
      { id: 'cerca', icon: '../assets/cercaMio.svg', label: 'Cerca de mí', render: cerca },
      { id: 'mis', icon: '../assets/mis.svg', label: 'Mis reportes', render: mis },
      { id: 'faenas', icon: '../assets/faena.svg', label: 'Faenas', render: faenas }
    ]
  };
})();
