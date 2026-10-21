/* ==========================================================================
   EcoVecinos · municipal.js — Vistas del PERSONAL MUNICIPAL
   HU-17 Panel · HU-18 Filtros · HU-20 Atrasados · HU-21 Prioridad · HU-22 Agrupar
   HU-25 Foto "después" · HU-26 Comparar · HU-27 Resolver · HU-29 Zona↔junta
   HU-31 Responder reporte · (estado y respuesta de solicitudes: HU-43, HU-47)
   ========================================================================== */
EV.views.municipal = (function () {
  const S = EV.store, U = EV.util, esc = U.esc;
  const WHO = 'Personal municipal (demo)';
  const FROM = { vecino: 'Vecino', municipal: 'Tú (municipalidad)', dirigente: 'Junta vecinal' };
  const PRI_CLASS = { Alta: 'badge--delayed', Media: 'badge--pending', Baja: 'badge--resolved' };

  /* Al ingresar como municipal: alerta de reportes atrasados (HU-20). */
  function checkAlerts() {
    let n = 0;
    S.s.reports.forEach(r => { if (S.isOverdue(r) && !r.overdueNotified) { r.overdueNotified = true; n++; } });
    if (n) { S.notify('municipal', `⏰ ${n} reporte(s) superaron el tiempo límite sin atenderse. Revisa el panel.`); S.save(); }
  }

  /* ---------- Detalle de un reporte (HU-21, 22, 25, 26, 27, 31) ---------- */
  function openReport(id) {
    const r0 = S.s.reports.find(x => x.id === id);
    const body = EV.ui.openDialog(`Reporte ${r0.id}`, '');
    let cam = null, afterPhoto = null;

    function draw() {
      const r = S.s.reports.find(x => x.id === id), p = S.priority(r), g = S.clusters()[r.id], z = S.zoneById(r.zone), j = S.juntaOfZone(r.zone);
      const af = r.after, canClose = r.status !== 'resolved' && af && af.status === 'approved';
      const needAfter = r.status !== 'resolved' && (!af || af.status === 'rejected');
      body.innerHTML = `
        <div class="badges">${EV.ui.badge(r.status)} <span class="badge ${PRI_CLASS[p.eff]}">Prioridad ${p.eff}${r.override ? ' (manual)' : ` · ${p.score}/100`}</span>${S.isOverdue(r) ? ' <span class="badge badge--delayed">⏰ Atrasado</span>' : ''}</div>
        <dl class="dl"><dt>Zona</dt><dd>${esc(z.name)} → ${esc(j ? j.name : 'sin junta')}</dd><dt>Ubicación</dt><dd>${U.fmtCoords(r.lat, r.lng)}</dd>
        <dt>Enviado</dt><dd>${U.fmtDateTime(r.createdAt)} · ${r.source === 'junta' ? 'Escalado por una junta' : r.reserved ? 'Vecino (identidad reservada 🔒)' : 'Vecino registrado'}</dd></dl>

        <h3>Evidencia</h3>
        <div class="before-after"><figure><img src="${r.photo.dataUrl}" alt="Foto de antes"><figcaption>Antes · ${U.fmtDateTime(r.photo.ts)}</figcaption></figure>
        ${af ? `<figure><img src="${af.photo.dataUrl}" alt="Foto de después"><figcaption>Después · ${U.fmtDateTime(af.photo.ts)} · ${af.status === 'approved' ? '✔ Aprobada' : af.status === 'rejected' ? '✖ Rechazada' : 'Por validar'}</figcaption></figure>` : '<div class="placeholder-box">Aún no hay foto de «después»</div>'}</div>
        ${af && af.status === 'rejected' ? `<p class="notice notice--warn">Evidencia rechazada: ${esc(af.note)}. Se solicitó una nueva foto a la cuadrilla.</p>` : ''}
        ${af && af.status === 'pending' ? `<div class="form-group"><label for="rejNote">Motivo (obligatorio si rechazas)</label><input id="rejNote" type="text" maxlength="120"><p class="field-error" id="rejErr" role="alert"></p>
          <div class="form-actions"><button class="btn btn-primary" data-act="approve">Aprobar evidencia</button><button class="btn btn-secondary" data-act="reject">Rechazar y pedir nueva foto</button></div></div>` : ''}
        ${needAfter ? `<div class="card card--inner"><h4>Cuadrilla: subir foto de «después»</h4><p class="text-muted">Solo se admite una foto tomada con la cámara en el momento, con fecha, hora y ubicación.</p><div id="aCam"></div>
          <button class="btn btn-primary" data-act="upload" id="upBtn" disabled>Subir foto de después</button></div>` : ''}

        <div class="form-actions"><button class="btn btn-primary" data-act="resolve" ${canClose ? '' : 'disabled aria-describedby="rHint"'}>✔ Marcar como resuelto</button>
        ${r.status === 'pending' ? '<button class="btn btn-secondary" data-act="start">Iniciar atención</button>' : ''}</div>
        ${canClose || r.status === 'resolved' ? '' : '<p class="text-muted" id="rHint">Se habilita solo con una foto de «después» aprobada.</p>'}
        ${r.status === 'resolved' ? `<p class="status-text">Resuelto el ${U.fmtDateTime(r.closedAt)} · Validado por ${esc(r.closedBy)}</p>` : ''}

        <h3>Prioridad sugerida: ${p.score}/100 (${p.level})</h3>
        <div class="table-wrap"><table class="table"><caption class="sr-only">Factores del puntaje de prioridad</caption><thead><tr><th scope="col">Factor</th><th scope="col">Puntos</th><th scope="col">Por qué</th></tr></thead>
        <tbody>${p.factors.map(f => `<tr><th scope="row">${f.name}</th><td>${f.pts}/${f.max}</td><td>${esc(f.note)}</td></tr>`).join('')}</tbody></table></div>
        ${r.override ? `<p class="notice notice--soft">Ajuste manual a «${r.override.level}»: ${esc(r.override.reason)} <span class="text-muted">(${esc(r.override.by)}, ${U.fmtDateTime(r.override.ts)})</span> <button class="btn btn-ghost btn-sm" data-act="clearov">Quitar ajuste</button></p>` : ''}
        <form id="ovf" class="form-grid"><div class="form-group"><label for="ovl">Cambiar prioridad manualmente</label><select id="ovl"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
        <div class="form-group"><label for="ovr">Motivo (queda registrado) *</label><input id="ovr" type="text" maxlength="120"><p class="field-error" id="ovErr" role="alert"></p></div>
        <div class="form-group"><button class="btn btn-secondary" type="submit">Aplicar</button></div></form>

        ${g && g.members.length > 1 || r.supporters.length ? `<h3>Punto crítico agrupado</h3><p>👥 <strong>${g ? g.people : 1 + r.supporters.length} vecino(s)</strong> reportaron este punto${g && g.members.length > 1 ? ` (${g.members.map(m => esc(m.id)).join(', ')})` : ''}. Al resolverlo, todos los reportes asociados cambian de estado.</p>` : ''}

        <h3>Comentarios (visibles para la junta)</h3>
        ${r.thread.length ? `<ul class="thread">${r.thread.map(m => `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="text-muted">Sin comentarios.</p>'}
        <form id="rf" class="form-group"><label for="rt">Responder</label><textarea id="rt" rows="2" maxlength="280"></textarea><button class="btn btn-secondary" type="submit">Enviar respuesta</button></form>`;

      if (cam) { cam.destroy(); cam = null; }
      EV.ui.currentCleanup = () => { if (cam) cam.destroy(); };
      if (needAfter) cam = EV.camera.mount(body.querySelector('#aCam'), { onChange: ph => { afterPhoto = ph; body.querySelector('#upBtn').disabled = !ph; } });
      body.querySelector('#ovf').addEventListener('submit', e => {
        e.preventDefault(); const reason = body.querySelector('#ovr').value.trim();
        if (!reason) { body.querySelector('#ovErr').textContent = 'Indica el motivo del ajuste.'; return; }
        r.override = { level: body.querySelector('#ovl').value, reason, ts: Date.now(), by: WHO }; S.save(); EV.ui.toast('Prioridad ajustada; el motivo quedó registrado.', 'success');
      });
      body.querySelector('#rf').addEventListener('submit', e => {
        e.preventDefault(); const t = body.querySelector('#rt').value.trim(); if (!t) return;
        S.addMessage(r.thread, 'municipal', t);
        S.notify('dirigente', `La municipalidad respondió en el reporte ${r.id}.`, r.id);        // HU-31
        S.save(); EV.ui.toast('Respuesta enviada a la junta.', 'success');
      });
      body.onclick = e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, r); };
    }

    function members(r) { const g = S.clusters()[r.id]; return g ? g.members : [r]; }
    function notifyOwners(list, text, photo) {
      if (list.some(m => m.reporterId === S.USER || m.supporters.includes(S.USER))) S.notify('vecino', text, list[0].id, photo);
    }
    function act(a, r) {
      if (a === 'start') {
        members(r).forEach(m => m.status = 'active');
        notifyOwners(members(r), `Tu reporte ${r.id} ahora está en atención.`);
        S.save(); EV.ui.toast('Reporte(s) en atención.', 'success');
      }
      if (a === 'upload' && afterPhoto) {                                   // HU-25
        r.after = { photo: afterPhoto, status: 'pending', note: '', ts: Date.now() };
        if (r.status === 'pending') members(r).forEach(m => m.status = 'active');
        S.save(); EV.ui.toast('Foto de «después» subida. Falta validarla.', 'success');
      }
      if (a === 'approve') { r.after.status = 'approved'; S.save(); EV.ui.toast('Evidencia aprobada. Ya puedes marcar como resuelto.', 'success'); }
      if (a === 'reject') {                                                 // HU-26
        const note = body.querySelector('#rejNote').value.trim();
        if (!note) { body.querySelector('#rejErr').textContent = 'Indica por qué rechazas la evidencia.'; return; }
        r.after.status = 'rejected'; r.after.note = note;
        S.notify('municipal', `Se solicitó una nueva foto de «después» a la cuadrilla para ${r.id}.`, r.id);
        S.save(); EV.ui.toast('Evidencia rechazada; se solicitó una nueva foto.', 'warn');
      }
      if (a === 'clearov') { r.override = null; S.save(); }
      if (a === 'resolve') {                                                // HU-27 + HU-22 (resuelve todo el punto agrupado)
        if (!(r.after && r.after.status === 'approved')) return;
        const list = members(r), now = Date.now();
        list.forEach(m => { m.status = 'resolved'; m.closedAt = now; m.closedBy = WHO; if (m !== r) m.after = { ...r.after }; });
        notifyOwners(list, `¡Tu reporte ${r.id} fue resuelto! Esta es la evidencia de la limpieza.`, r.after.photo.dataUrl);
        S.save(); EV.ui.toast(`Resuelto${list.length > 1 ? `: se cerraron ${list.length} reportes del mismo punto` : ''}.`, 'success');
      }
    }
    EV.ui.currentDetail = draw; draw();
  }

  /* ================= TAB: PANEL (HU-17, HU-18, HU-20, HU-21, HU-22) ================= */
  function panel(root) {
    // Los filtros viven en el estado guardado, así se conservan al navegar (HU-18).
    const F = new Proxy({}, { get: (_, k) => S.s.filters[k], set: (_, k, v) => { S.s.filters[k] = v; return true; } });
    root.innerHTML = `<div class="card"><h2>Panel de reportes de la jurisdicción</h2>
      <p class="text-muted">${esc(S.MUNI)} · Todos los reportes llegan aquí directamente, sin pasar por el filtro de otra área.</p>
      <div id="alerts" aria-live="polite"></div><div id="kpis" class="kpis"></div>
      <form id="flt" class="form-grid" aria-label="Filtros del panel">
        <div class="form-group"><label for="fz">Zona</label><select id="fz"><option value="all">Todas</option>${S.ZONES.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select></div>
        <div class="form-group"><label for="fd">Desde</label><input id="fd" type="date"></div>
        <div class="form-group"><label for="fh">Hasta</label><input id="fh" type="date"></div>
        <div class="form-group"><label for="fe">Estado</label><select id="fe"><option value="all">Todos</option><option value="pending">Pendiente</option><option value="active">En atención</option><option value="resolved">Resuelto</option></select></div>
        <div class="form-group"><label for="fo">Ordenar por</label><select id="fo"><option value="prioridad">Prioridad (mayor primero)</option><option value="recientes">Más recientes</option></select></div>
        <div class="form-group"><button type="button" class="btn btn-secondary" id="fclear">Limpiar filtros</button></div></form>
      <div id="pMap" class="map" role="region" aria-label="Mapa de reportes de la jurisdicción"></div><div id="pList" aria-live="polite"></div></div>`;
    const $ = s => root.querySelector(s), map = EV.map.create('pMap', { lat: -12.045, lng: -77.03 }, 13);
    const bind = [['fz', 'zona'], ['fd', 'desde'], ['fh', 'hasta'], ['fe', 'estado'], ['fo', 'orden']];
    bind.forEach(([id, key]) => { $('#' + id).value = F[key]; $('#' + id).addEventListener('change', e => { F[key] = e.target.value; S.save(); }); });
    $('#fclear').addEventListener('click', () => { Object.assign(F, { zona: 'all', desde: '', hasta: '', estado: 'all', orden: 'prioridad' }); bind.forEach(([id, key]) => $('#' + id).value = F[key]); S.save(); });

    let first = true;
    function draw() {
      const all = S.s.reports;
      const from = F.desde ? new Date(F.desde + 'T00:00:00').getTime() : -Infinity, to = F.hasta ? new Date(F.hasta + 'T23:59:59').getTime() : Infinity;
      let list = all.filter(r => (F.zona === 'all' || r.zone === F.zona) && (F.estado === 'all' || r.status === F.estado) && r.createdAt >= from && r.createdAt <= to);
      list = list.map(r => ({ r, p: S.priority(r) }));
      list.sort((a, b) => F.orden === 'prioridad' ? (b.p.effScore - a.p.effScore) || (a.r.createdAt - b.r.createdAt) : b.r.createdAt - a.r.createdAt);
      const late = all.filter(S.isOverdue);
      $('#alerts').innerHTML = late.length ? `<p class="notice notice--warn" role="alert">⏰ <strong>${late.length} reporte(s) atrasado(s)</strong> superaron el tiempo límite sin atenderse: ${late.map(r => esc(r.id)).join(', ')}.</p>` : '';
      $('#kpis').innerHTML = [['Total', all.length], ['Pendientes', all.filter(r => r.status === 'pending').length], ['En atención', all.filter(r => r.status === 'active').length], ['Resueltos', all.filter(r => r.status === 'resolved').length]].map(([l, n]) => `<div class="kpi"><span class="kpi-n">${n}</span><span class="kpi-l">${l}</span></div>`).join('');
      if (map) { map.setMarkers(list.map(x => x.r), openReport); if (first && list.length) { map.fit(list.map(x => x.r)); first = false; } }
      $('#pList').innerHTML = list.length ? `<p class="status-text">${list.length} reporte(s) con los filtros aplicados.</p><ul class="item-list">${list.map(({ r, p }) => {
        const g = S.clusters()[r.id];
        return `<li class="item"><img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}"><div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status)}
          <span class="badge ${PRI_CLASS[p.eff]}">Prioridad ${p.eff}${r.override ? ' (manual)' : ' · ' + p.score}</span>${S.isOverdue(r) ? ' <span class="badge badge--delayed">⏰ Atrasado</span>' : ''}<br>
          <span class="text-muted">${U.fmtDateTime(r.createdAt)} · ${esc(S.zoneById(r.zone).name)}${g && g.people > 1 ? ` · 👥 ${g.people} vecinos reportaron este punto` : ''}</span></div>
          <button class="btn btn-secondary btn-sm" data-open="${r.id}">Ver detalle</button></li>`; }).join('')}</ul>`
        : '<p class="empty">No hay reportes con estos filtros.</p>';
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openReport(b.dataset.open); });
    draw();
    return { refresh: draw, destroy: () => map && map.destroy() };
  }

  /* ================= TAB: ZONAS Y PLAZOS (HU-29, HU-20) ================= */
  function zonas(root) {
    root.innerHTML = `<div class="card"><h2>Zonas y juntas vecinales</h2><p class="text-muted">Vincula cada zona con su junta: la junta verá el estado de los reportes de su zona, sin poder editarlos.</p>
      <div class="table-wrap"><table class="table"><caption class="sr-only">Vinculación de zonas con juntas vecinales</caption><thead><tr><th scope="col">Zona</th><th scope="col">Junta vecinal</th></tr></thead>
      <tbody>${S.ZONES.map(z => `<tr><th scope="row"><label for="zj-${z.id}">${esc(z.name)}</label></th><td><select id="zj-${z.id}" data-zone="${z.id}">${S.JUNTAS.map(j => `<option value="${j.id}" ${S.s.settings.zoneJunta[z.id] === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div>
      <div class="card"><h2>Tiempo límite sin atender</h2><p class="text-muted">Pasado este tiempo, el reporte se marca como atrasado y se genera una alerta.</p>
      <form id="lim" class="form-grid">${['Alta', 'Media', 'Baja'].map(k => `<div class="form-group"><label for="ov-${k}">Prioridad ${k} (horas)</label><input id="ov-${k}" type="number" min="1" max="720" value="${S.s.settings.overdueHours[k]}"></div>`).join('')}
      <div class="form-group"><button class="btn btn-primary" type="submit">Guardar plazos</button></div></form></div>`;
    root.addEventListener('change', e => {
      const sel = e.target.closest('[data-zone]'); if (!sel) return;
      S.s.settings.zoneJunta[sel.dataset.zone] = sel.value; S.save();
      EV.ui.toast(`${S.zoneById(sel.dataset.zone).name} vinculada a ${S.juntaById(sel.value).name}.`, 'success');
    });
    root.querySelector('#lim').addEventListener('submit', e => {
      e.preventDefault();
      ['Alta', 'Media', 'Baja'].forEach(k => { const v = +root.querySelector('#ov-' + k).value; if (v >= 1) S.s.settings.overdueHours[k] = v; });
      S.s.reports.forEach(r => r.overdueNotified = false); S.save(); checkAlerts(); EV.ui.toast('Plazos guardados.', 'success');
    });
    return {};
  }

  /* ================= TAB: SOLICITUDES DE JUNTAS (HU-43 estados, HU-47 respuesta) ================= */
  function solicitudes(root) {
    root.innerHTML = `<div class="card"><h2>Solicitudes de las juntas vecinales</h2><div id="sl" aria-live="polite"></div></div>`;
    function draw() {
      const list = [...S.s.solicitudes].sort((a, b) => b.createdAt - a.createdAt);
      root.querySelector('#sl').innerHTML = list.length ? `<ul class="item-list">${list.map(s => `<li class="item item--col"><div class="feed-header"><div><strong>${esc(s.id)}</strong> — ${esc(s.asunto)}<br><span class="text-muted">${esc(S.juntaById(s.juntaId).name)} · ${U.fmtDateTime(s.createdAt)}${S.overdueSolicitud(s) ? ' · ⏰ sin respuesta' : ''}</span></div>
        <div class="form-row"><label for="st-${s.id}">Estado</label><select id="st-${s.id}" data-sol="${s.id}">${Object.entries(S.SOL_ESTADOS).map(([k, v]) => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
        <button class="btn btn-secondary btn-sm" data-thread="${s.id}">Ver hilo y responder (${s.thread.length})</button></li>`).join('')}</ul>` : '<p class="empty">No hay solicitudes.</p>';
    }
    root.addEventListener('change', e => {
      const sel = e.target.closest('[data-sol]'); if (!sel) return;
      const s = S.s.solicitudes.find(x => x.id === sel.dataset.sol); s.status = sel.value; s.lastChange = Date.now(); s.overdueNotified = false;
      S.notify('dirigente', `La solicitud ${s.id} cambió a «${S.SOL_ESTADOS[s.status]}».`, s.id); S.save(); EV.ui.toast('Estado actualizado.', 'success');
    });
    root.addEventListener('click', e => { const b = e.target.closest('[data-thread]'); if (b) openSol(b.dataset.thread); });
    function openSol(id) {
      const body = EV.ui.openDialog(`Solicitud ${id}`, '');
      function d() {
        const s = S.s.solicitudes.find(x => x.id === id), msgs = [...s.thread].sort((a, b) => a.ts - b.ts);
        body.innerHTML = `<h3>${esc(s.asunto)}</h3>${msgs.length ? `<ul class="thread">${msgs.map(m => `<li class="msg msg--${m.from}"><strong>${m.from === 'municipal' ? 'Tú (municipalidad)' : 'Junta vecinal'}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="text-muted">Sin mensajes.</p>'}
          <form id="mr" class="form-group"><label for="mrt">Responder dentro del hilo</label><textarea id="mrt" rows="2" maxlength="280" required></textarea><button class="btn btn-primary" type="submit">Enviar respuesta</button></form>`;
        body.querySelector('#mr').addEventListener('submit', e => {
          e.preventDefault(); const t = body.querySelector('#mrt').value.trim(); if (!t) return;
          S.addMessage(s.thread, 'municipal', t);
          if (s.status === 'enviada') { s.status = 'revision'; s.lastChange = Date.now(); }
          S.notify('dirigente', `Respuesta nueva del municipio en la solicitud ${s.id}.`, s.id); S.save(); EV.ui.toast('Respuesta enviada.', 'success');
        });
      }
      EV.ui.currentDetail = d; d();
    }
    draw();
    return { refresh: draw };
  }

  return { checkAlerts, tabs: [
    { id: 'panel', label: '📊 Panel', render: panel },
    { id: 'zonas', label: '⚙️ Zonas y plazos', render: zonas },
    { id: 'solicitudes', label: '📨 Solicitudes de juntas', render: solicitudes }
  ] };
})();
