/* ==========================================================================
   EcoVecinos · vecino.js  — Vistas del VECINO
   HU-01 Foto · HU-02 GPS · HU-03 Envío rápido · HU-04 Cercanos · HU-05 Código
   HU-06 Estado · HU-08 Historial · HU-10 Comentar · HU-11/12 Faenas · HU-39
   Cada vista recibe el contenedor y devuelve { refresh?, destroy? }.
   ========================================================================== */
EV.views = EV.views || {};
EV.views.vecino = (function () {
  const S = EV.store, U = EV.util, esc = U.esc;
  const me = () => S.USER;
  const FROM = { vecino: 'Tú', municipal: 'Municipalidad', dirigente: 'Junta vecinal' };

  /* ---------- Detalle de un reporte (diálogo) — HU-06, HU-10 ---------- */
  function openDetail(id) {
    function draw() {
      const r = S.s.reports.find(x => x.id === id);
      if (!r) return;
      const mine = r.reporterId === me();
      const z = S.zoneById(r.zone);
      const thread = r.thread.length ? `<ul class="thread">${r.thread.map(m =>
        `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="text-muted">Aún no hay comentarios.</p>';
      body.innerHTML = `
        <img class="detail-photo" src="${r.photo.dataUrl}" alt="Foto del foco de basura del reporte ${esc(r.id)}">
        <dl class="dl">
          <dt>Estado</dt><dd aria-live="polite">${EV.ui.badge(r.status)} <span class="text-muted">Se actualiza automáticamente.</span></dd>
          <dt>Zona</dt><dd>${esc(z.name)} · ${U.fmtCoords(r.lat, r.lng)}</dd>
          <dt>Enviado</dt><dd>${U.fmtDateTime(r.createdAt)}${r.reserved && mine ? ' ·  Reporte reservado' : ''}</dd>
          ${r.tipo ? `<dt>Tipo</dt><dd>${esc(S.TIPOS[r.tipo].label)}</dd>` : ''}${r.tamano ? `<dt>Tamaño</dt><dd>${esc(S.TAMANOS[r.tamano].label)}</dd>` : ''}
          ${r.supporters.length ? `<dt>Apoyos</dt><dd>${r.supporters.length} vecino(s) más reportaron este punto</dd>` : ''}
        </dl>
        ${r.status === 'resolved' && r.after ? `<h3>Reporte resuelto</h3><p>Cerrado el ${U.fmtDate(r.closedAt)} tras validar la evidencia.</p>
          <div class="before-after"><figure><img src="${r.photo.dataUrl}" alt="Foto de antes"><figcaption>Antes</figcaption></figure>
          <figure><img src="${r.after.photo.dataUrl}" alt="Foto de después, con la limpieza validada"><figcaption>Después</figcaption></figure></div>` : ''}
        <h3>Comentarios</h3>${thread}
        ${mine && r.status !== 'resolved' ? `<form id="cmtForm" class="form-group"><label for="cmt">Agregar un comentario (ej.: la situación empeoró)</label>
          <textarea id="cmt" rows="3" maxlength="280" required></textarea><p class="field-error" id="cmtErr" role="alert"></p>
          <button class="btn btn-primary" type="submit">Enviar comentario</button></form>` : (mine ? '<p class="text-muted">Los reportes resueltos ya no admiten comentarios.</p>' : '')}`;
      const f = body.querySelector('#cmtForm');
      if (f) f.addEventListener('submit', e => {
        e.preventDefault();
        const t = body.querySelector('#cmt').value.trim();
        if (!t) { body.querySelector('#cmtErr').textContent = 'Escribe un comentario antes de enviar.'; return; }
        S.addMessage(r.thread, 'vecino', t);                          // registra fecha y hora (HU-10)
        S.notify('municipal', `Nuevo comentario del vecino en ${r.id}.`, r.id);
        S.save(); EV.ui.toast('Comentario enviado.', 'success');
      });
    }
    const r0 = S.s.reports.find(x => x.id === id);
    const body = EV.ui.openDialog(`Reporte ${r0.id}`, '');
    EV.ui.currentDetail = draw; draw();
  }

  /* ================= TAB: REPORTAR (3 pantallas: foto → ubicación → confirmación) ================= */
  function reportar(root) {
    let step = 1, photo = null, pin = null, cam = null, mapCtl = null, created = null, dismissed = false;
    const draft = { tipo: '', tamano: '', reserved: false, radius: 250 };

    function stepsHtml() {
      return `<ol class="steps" aria-label="Progreso del reporte">${['Foto', 'Ubicación y envío', 'Confirmación'].map((n, i) =>
        `<li ${i + 1 === step ? 'aria-current="step"' : ''} class="${i + 1 < step ? 'done' : ''}"><span class="steps-n">${i + 1}</span> ${n}</li>`).join('')}</ol>`;
    }
    function cleanup() { if (cam) cam.destroy(); if (mapCtl) mapCtl.destroy(); cam = null; mapCtl = null; }
    function draw() { cleanup(); [null, step1, step2, step3][step](); }

    /* Paso 1 — HU-01: solo cámara; sin foto no se puede continuar */
    function step1() {
      photo = null;
      root.innerHTML = `<div class="card">${stepsHtml()}
        <h2>Paso 1: toma la foto del foco de basura</h2>
        <p class="text-muted">La foto se toma con la cámara en el momento, para que la evidencia sea real y reciente. Se guarda con fecha, hora y ubicación.</p>
        <div id="camBox"></div>
        <div class="form-actions"><button type="button" class="btn btn-primary" id="next1" disabled>Continuar →</button></div>
        <p class="text-muted" id="hint1">No se puede enviar un reporte sin foto.</p></div>`;
      cam = EV.camera.mount(root.querySelector('#camBox'), {
        onChange: p => { photo = p; root.querySelector('#next1').disabled = !p; root.querySelector('#hint1').hidden = !!p; }
      });
      root.querySelector('#next1').addEventListener('click', () => { step = 2; draw(); });
    }

    /* Paso 2 — HU-02 (GPS + pin ajustable + jurisdicción), HU-04 (cercanos), HU-03 y HU-39 (envío) */
    function step2() {
      const asked = S.s.settings.geoConsent;
      pin = pin || { lat: EV.geo.get().lat, lng: EV.geo.get().lng };
      root.innerHTML = `<div class="card">${stepsHtml()}
        <h2>Paso 2: confirma la ubicación y envía</h2>
        ${asked ? '' : `<div class="notice" role="region" aria-label="Permiso de ubicación"><h3>Usaremos tu ubicación</h3>
          <p>EcoVecinos usa tu ubicación solo para marcar dónde está el foco de basura y derivarlo a la municipalidad y a la junta de la zona. Si no la permites, puedes marcar el punto en el mapa.</p>
          <div class="form-actions"><button type="button" class="btn btn-primary" id="geoAllow">Permitir ubicación</button>
          <button type="button" class="btn btn-secondary" id="geoDeny">Ahora no, marcaré el punto en el mapa</button></div></div>`}
        <p class="status-text" role="status">${EV.geo.get().exact ? '📍 Ubicación GPS obtenida automáticamente.' : '📍 Ubicación aproximada: mueve el pin si no es exacta.'}</p>
        <div id="pinMap" class="map map--sm" role="region" aria-label="Mapa para ajustar la ubicación del reporte"></div>
        <p class="text-muted">Arrastra el pin o toca el mapa para corregir la ubicación.</p>
        <div id="routeInfo" class="notice notice--soft" aria-live="polite"></div>
        <div class="form-row"><label for="radius">Mostrar reportes activos a menos de</label>
          <select id="radius"><option value="100">100 m</option><option value="250">250 m</option><option value="500">500 m</option><option value="1000">1 km</option></select></div>
        <div id="nearby" aria-live="polite"></div>
        <fieldset class="form-group"><legend>Datos opcionales (ayudan a priorizar)</legend>
          <div class="form-row"><label for="tipo">Tipo de residuo</label><select id="tipo"><option value="">No sé / prefiero no indicar</option>${Object.entries(S.TIPOS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
          <div class="form-row"><label for="tamano">Tamaño aproximado</label><select id="tamano"><option value="">No sé / prefiero no indicar</option>${Object.entries(S.TAMANOS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div></fieldset>
        <div class="form-group checkbox-group"><input type="checkbox" id="reserved"><label for="reserved"><strong>Reporte reservado:</strong> mi nombre no se mostrará a otros vecinos.</label></div>
        <p class="text-muted">EcoVecinos nunca pide nombres ni datos de otras personas: el reporte registra solo el punto geográfico.</p>
        <div class="form-actions"><button type="button" class="btn btn-secondary" id="back2">← Volver a la foto</button>
        <button type="button" class="btn btn-primary" id="send">Enviar reporte</button></div></div>`;
      const $ = s => root.querySelector(s);
      $('#radius').value = String(draft.radius); $('#tipo').value = draft.tipo; $('#tamano').value = draft.tamano; $('#reserved').checked = draft.reserved;

      mapCtl = EV.map.create('pinMap', pin, 17);
      let marker = null;
      if (mapCtl) {
        marker = L.marker([pin.lat, pin.lng], { draggable: true, keyboard: true, title: 'Ubicación del reporte' }).addTo(mapCtl.map);
        marker.on('dragend', () => { const p = marker.getLatLng(); movePin(p.lat, p.lng); });
        mapCtl.map.on('click', e => { marker.setLatLng(e.latlng); movePin(e.latlng.lat, e.latlng.lng); });
      }
      function movePin(lat, lng) { pin = { lat, lng }; dismissed = false; refreshNearby(); }

      function refreshNearby() {
        const z = S.zoneFor(pin.lat, pin.lng), j = S.juntaOfZone(z.id);
        $('#routeInfo').innerHTML = `Tu reporte se derivará a <strong>${esc(S.MUNI)}</strong> y a la <strong>${esc(j ? j.name : 'junta de la zona')}</strong> (${esc(z.name)}). No necesitas elegirlas.`;
        const near = S.s.reports.filter(r => r.status !== 'resolved').map(r => ({ r, d: U.dist(pin, r) })).filter(x => x.d <= draft.radius).sort((a, b) => a.d - b.d);
        if (mapCtl) mapCtl.setMarkers(near.map(x => x.r));
        const dup = near.find(x => x.d <= 30);
        let html = '';
        if (dup && !dismissed) html += `<div class="notice notice--warn" role="alert"><p><strong>Ya existe un reporte aquí (${esc(dup.r.id)}, a ${U.fmtDist(dup.d)}).</strong> ${EV.ui.badge(dup.r.status)}<br>Para evitar duplicados, puedes sumarte a ese reporte.</p>
          <div class="form-actions"><button type="button" class="btn btn-primary" data-join="${dup.r.id}">Sumarme al reporte existente</button>
          <button type="button" class="btn btn-secondary" id="notSame">Es otro punto, continuar</button></div></div>`;
        html += near.length ? `<p class="status-text">${near.length} reporte(s) activo(s) a menos de ${U.fmtDist(draft.radius)}:</p><ul class="plain-list">${near.slice(0, 5).map(x =>
          `<li>${esc(x.r.id)} · ${EV.ui.badge(x.r.status)} · a ${U.fmtDist(x.d)}</li>`).join('')}</ul>` : '<p class="text-muted">No hay reportes activos cerca de este punto.</p>';
        $('#nearby').innerHTML = html;
        const ns = $('#notSame'); if (ns) ns.addEventListener('click', () => { dismissed = true; refreshNearby(); });
        root.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', () => join(b.dataset.join)));
      }
      refreshNearby();

      const allow = $('#geoAllow');
      if (allow) {
        allow.addEventListener('click', async () => {
          const r = await EV.geo.request();
          S.s.settings.geoConsent = true; S.save();
          if (r.ok) { const g = EV.geo.get(); pin = { lat: g.lat, lng: g.lng }; EV.ui.toast('Ubicación obtenida.', 'success'); }
          else EV.ui.toast('No pudimos obtener tu ubicación. Marca el punto en el mapa.', 'warn');
          draw();
        });
        $('#geoDeny').addEventListener('click', () => { S.s.settings.geoConsent = true; S.save(); draw(); });
      }
      $('#radius').addEventListener('change', e => { draft.radius = +e.target.value; refreshNearby(); });
      $('#tipo').addEventListener('change', e => draft.tipo = e.target.value);
      $('#tamano').addEventListener('change', e => draft.tamano = e.target.value);
      $('#reserved').addEventListener('change', e => draft.reserved = e.target.checked);
      $('#back2').addEventListener('click', () => { step = 1; draw(); });
      $('#send').addEventListener('click', send);
    }

    function join(id) {
      const r = S.s.reports.find(x => x.id === id);
      if (!r.supporters.includes(me()) && r.reporterId !== me()) r.supporters.push(me());
      S.notify('vecino', `Te sumaste al reporte ${r.id}. Recibirás avisos de su estado.`, r.id);
      S.notify('municipal', `Un vecino más reportó el punto ${r.id}.`, r.id);
      S.save(); created = { report: r, joined: true }; step = 3; draw();
    }

    /* HU-03: sin campos de texto obligatorios; HU-05: código único y notificación */
    function send() {
      if (!photo) { EV.ui.toast('Falta la foto del reporte.', 'error'); step = 1; draw(); return; }
      const z = S.zoneFor(pin.lat, pin.lng);
      const r = { id: S.nextId('REP', 'rep'), createdAt: Date.now(), zone: z.id, lat: pin.lat, lng: pin.lng,
        tipo: draft.tipo || null, tamano: draft.tamano || null, reserved: draft.reserved, reporterId: me(), source: 'vecino',
        status: 'pending', photo, supporters: [], thread: [], after: null, override: null, closedAt: null, closedBy: null };
      S.s.reports.push(r);
      S.notify('vecino', `Tu reporte ${r.id} fue registrado correctamente.`, r.id);
      S.notify('municipal', `Nuevo reporte ${r.id} en ${z.name}.`, r.id);
      if (!S.save()) { S.s.reports.pop(); return; }
      created = { report: r, joined: false }; step = 3; draw();
    }

    function step3() {
      const r = created.report, z = S.zoneById(r.zone), j = S.juntaOfZone(z.id);
      root.innerHTML = `<div class="card">${stepsHtml()}
        <div class="confirm" role="status"><p class="confirm-icon" aria-hidden="true">✔</p>
          <h2>${created.joined ? 'Te sumaste al reporte' : '¡Reporte enviado!'}</h2>
          <p>Tu código de seguimiento es:</p><p class="code">${esc(r.id)}</p>
          <p class="text-muted">Quedó en tu historial y fue derivado a ${esc(S.MUNI)} y a la ${esc(j ? j.name : 'junta de la zona')}.</p>
          ${r.reserved && !created.joined ? '<p class="text-muted"> Reporte reservado: tu nombre no se muestra a otros vecinos.</p>' : ''}</div>
        <div class="form-actions"><button type="button" class="btn btn-primary" id="goMine">Ver mis reportes</button>
        <button type="button" class="btn btn-secondary" id="again">Hacer otro reporte</button></div></div>`;
      root.querySelector('#goMine').addEventListener('click', () => EV.app.goTab('mis'));
      root.querySelector('#again').addEventListener('click', () => { step = 1; photo = null; pin = null; dismissed = false; Object.assign(draft, { tipo: '', tamano: '', reserved: false }); draw(); });
    }
    draw();
    return { destroy: cleanup };
  }

  /* ================= TAB: CERCA DE MÍ (HU-04) ================= */
  function cerca(root) {
    let radius = 500, mapCtl = null;
    root.innerHTML = `<div class="card"><h2>Reportes activos cerca de mí</h2>
      <p class="text-muted">Revisa si el foco ya fue reportado antes de crear uno nuevo.</p>
      <div class="form-row"><label for="rad">Radio de búsqueda</label><select id="rad"><option value="200">200 m</option><option value="500" selected>500 m</option><option value="1000">1 km</option><option value="2000">2 km</option></select>
      <button type="button" class="btn btn-secondary" id="loc"> Actualizar mi ubicación</button></div>
      <div id="nearMap" class="map" role="region" aria-label="Mapa de reportes activos cercanos"></div>
      <div id="nearList" aria-live="polite"></div></div>`;
    const center = () => EV.geo.get();
    mapCtl = EV.map.create('nearMap', center(), 15);
    let circle = null;
    function draw() {
      const c = center();
      const list = S.s.reports.filter(r => r.status !== 'resolved').map(r => ({ r, d: U.dist(c, r) })).filter(x => x.d <= radius).sort((a, b) => a.d - b.d);
      if (mapCtl) {
        if (circle) circle.remove();
        circle = L.circle([c.lat, c.lng], { radius, color: '#1e5b3a', weight: 1, fillOpacity: 0.05 }).addTo(mapCtl.map);
        mapCtl.setMarkers(list.map(x => x.r), openDetail);
        mapCtl.map.fitBounds(circle.getBounds());
      }
      root.querySelector('#nearList').innerHTML = list.length
        ? `<p class="status-text">${list.length} reporte(s) activo(s) a menos de ${U.fmtDist(radius)}.</p><ul class="item-list">${list.map(x => `<li class="item"><div><strong>${esc(x.r.id)}</strong> ${EV.ui.badge(x.r.status)}<br><span class="text-muted">A ${U.fmtDist(x.d)} · ${esc(S.zoneById(x.r.zone).name)}</span></div>
          <button class="btn btn-secondary btn-sm" data-open="${x.r.id}">Ver detalle</button></li>`).join('')}</ul>`
        : '<p class="empty">No hay reportes activos en este radio. Puedes crear el primero desde la pestaña «Reportar».</p>';
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openDetail(b.dataset.open); });
    root.querySelector('#rad').addEventListener('change', e => { radius = +e.target.value; draw(); });
    root.querySelector('#loc').addEventListener('click', async () => {
      const r = await EV.geo.request(); S.s.settings.geoConsent = true; S.save();
      EV.ui.toast(r.ok ? 'Ubicación actualizada.' : 'No pudimos obtener tu ubicación; se usa la aproximada.', r.ok ? 'success' : 'warn'); draw();
    });
    draw();
    return { refresh: draw, destroy: () => mapCtl && mapCtl.destroy() };
  }

  /* ================= TAB: MIS REPORTES (HU-06, HU-08, HU-10) ================= */
  function mis(root) {
    let filter = 'all';
    root.innerHTML = `<div class="card"><div class="feed-header"><h2>Mis reportes</h2>
      <div class="form-row"><label for="f">Filtrar por estado</label><select id="f"><option value="all">Todos</option><option value="pending">Pendientes</option><option value="active">En atención</option><option value="resolved">Resueltos</option></select></div></div>
      <div id="list" aria-live="polite"></div></div>`;
    function draw() {
      const mine = S.s.reports.filter(r => r.reporterId === me() || r.supporters.includes(me())).sort((a, b) => b.createdAt - a.createdAt); // más reciente primero
      const list = mine.filter(r => filter === 'all' || r.status === filter);
      root.querySelector('#list').innerHTML = list.length ? `<ul class="item-list">${list.map(r => `<li class="item">
        <img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}">
        <div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status)}<br>
        <span class="text-muted">${U.fmtDateTime(r.createdAt)} · ${esc(S.zoneById(r.zone).name)}<br>${U.fmtCoords(r.lat, r.lng)}${r.reserved ? ' ·  Reservado' : ''}</span></div>
        <button class="btn btn-secondary btn-sm" data-open="${r.id}">Ver detalle</button></li>`).join('')}</ul>`
        : `<p class="empty">${mine.length ? 'No hay reportes con ese estado.' : 'Todavía no has enviado reportes.'}</p>`;
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openDetail(b.dataset.open); });
    root.querySelector('#f').addEventListener('change', e => { filter = e.target.value; draw(); });
    draw();
    return { refresh: draw };
  }

  /* ================= TAB: FAENAS (HU-11, HU-12; insumos de HU-35) ================= */
  function faenas(root) {
    let maxDist = 0;
    root.innerHTML = `<div class="card"><div class="feed-header"><h2>Faenas de limpieza</h2><p class="badge badge--info" id="pts"></p></div>
      <div class="form-row"><label for="near">Mostrar faenas</label><select id="near"><option value="0">En todas las zonas</option><option value="1000">A menos de 1 km</option><option value="3000">A menos de 3 km</option><option value="5000">A menos de 5 km</option></select></div>
      <div id="fList" aria-live="polite"></div></div>
      <div class="card"><h2>Mi calendario</h2><div id="cal" aria-live="polite"></div></div>`;
    const mineIn = f => f.inscritos.some(i => i.id === me());
    const upcoming = () => S.s.faenas.filter(f => !f.cancelled && U.startOf(f) >= Date.now()).sort((a, b) => U.startOf(a) - U.startOf(b));
    function draw() {
      const g = EV.geo.get();
      root.querySelector('#pts').textContent = `⭐ Tus puntos: ${S.s.settings.points[me()] || 0}`;
      const list = upcoming().map(f => ({ f, d: U.dist(g, f) })).filter(x => !maxDist || x.d <= maxDist);
      root.querySelector('#fList').innerHTML = list.length ? `<ul class="item-list">${list.map(({ f, d }) => {
        const inn = mineIn(f), canCancel = U.startOf(f) - Date.now() >= 24 * 36e5;
        return `<li class="item item--col"><div><strong>${U.fmtDate(U.startOf(f))} · ${esc(f.time)}</strong> — ${esc(f.place)}<br>
          <span class="text-muted">Organiza: ${esc(f.organizerName)} (${f.organizer === 'junta' ? 'junta vecinal' : 'municipio'}) · a ${U.fmtDist(d)} · ${f.inscritos.length} inscrito(s)</span><br>
          <span class="badge ${f.implementos ? 'badge--resolved' : 'badge--pending'}">${f.implementos ? ' Implementos garantizados (guantes y bolsas)' : '⚠ Trae tus propios implementos'}</span></div>
          <p>${esc(f.desc)}</p>
          ${inn ? `<div class="notice notice--soft"><strong>Qué llevar:</strong> ${f.insumosVecinos ? esc(f.insumosVecinos) : 'No necesitas llevar nada adicional.'}<br><span class="text-muted">La junta/municipio aporta: ${esc(f.insumosJunta || '—')}</span></div>` : '<p class="text-muted">Inscríbete para ver qué insumos debes llevar.</p>'}
          <div class="form-actions">${inn
            ? `<button class="btn btn-secondary" data-cancel="${f.id}" ${canCancel ? '' : 'disabled aria-describedby="nc-' + f.id + '"'}>Cancelar inscripción</button>${canCancel ? '' : `<span class="text-muted" id="nc-${f.id}">Solo puedes cancelar hasta 24 h antes.</span>`}`
            : `<button class="btn btn-primary" data-enroll="${f.id}">Inscribirme</button>`}</div></li>`;
      }).join('')}</ul>` : '<p class="empty">No hay faenas programadas con ese filtro.</p>';
      const mine = upcoming().filter(mineIn);
      root.querySelector('#cal').innerHTML = mine.length ? `<ul class="plain-list">${mine.map(f => `<li>📅 <strong>${U.fmtDate(U.startOf(f))}, ${esc(f.time)}</strong> — ${esc(f.place)}</li>`).join('')}</ul>` : '<p class="empty">Aún no te inscribiste a ninguna faena.</p>';
    }
    root.addEventListener('click', e => {
      const en = e.target.closest('[data-enroll]'), ca = e.target.closest('[data-cancel]');
      if (en) {
        const f = S.s.faenas.find(x => x.id === en.dataset.enroll);
        f.inscritos.push({ id: me(), name: 'Tú (vecino demo)', attended: null });
        S.notify('vecino', `Inscripción confirmada: faena del ${U.fmtDate(U.startOf(f))} en ${f.place}.`, f.id);
        if (f.juntaId) S.notify('dirigente', `Un vecino se inscribió a la faena en ${f.place}.`, f.id);
        S.save(); EV.ui.toast('¡Inscripción confirmada! Se agregó a tu calendario.', 'success');
      }
      if (ca) {
        const f = S.s.faenas.find(x => x.id === ca.dataset.cancel);
        if (U.startOf(f) - Date.now() < 24 * 36e5) { EV.ui.toast('Ya no puedes cancelar: faltan menos de 24 horas.', 'error'); return; }
        f.inscritos = f.inscritos.filter(i => i.id !== me());
        S.save(); EV.ui.toast('Inscripción cancelada.', 'info');
      }
    });
    root.querySelector('#near').addEventListener('change', e => { maxDist = +e.target.value; draw(); });
    draw();
    return { refresh: draw };
  }

return { tabs: [
  { id: 'reportar', icon: '../assets/camara.svg', label: 'Reportar', render: reportar },
  { id: 'cerca', icon: '../assets/cercaMio.svg', label: 'Cerca de mí', render: cerca },
  { id: 'mis', icon: '../assets/mis.svg', label: 'Mis reportes', render: mis },
  { id: 'faenas', icon: '../assets/faena.svg', label: 'Faenas', render: faenas }
] };
})();
