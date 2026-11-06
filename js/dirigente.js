/* EcoVecinos · dirigente.js — Vistas del dirigente vecinal (junta j1)
   HU-33 Registrar faena · HU-34 Invitar · HU-35 Insumos · HU-36 Asistencia
   HU-38 Evidencia · HU-39 Sin exponer identidades · HU-40 Protocolo por fases
   HU-29/31 Zona de la junta · HU-43 Estado · HU-44 Alerta · HU-47 Hilo */
EV.views.dirigente = (function () {
  const S = EV.store, U = EV.util, esc = U.esc;
  const JID = 'j1';
  const POINTS_PER_FAENA = 10;
  const ZONE_NEIGHBOURS = 40; // vecinos registrados en la zona (dato de demostración)
  const FROM = { vecino: 'Vecino', municipal: 'Municipalidad', dirigente: 'Tú (junta)' };
  const junta = () => S.juntaById(JID);
  const setErr = (root, id, msg) => EV.ui.fieldError(root, id, msg);

  /* Al entrar como dirigente: alerta por solicitudes sin respuesta (HU-44). */
  function checkAlerts() {
    let changed = false;
    S.s.solicitudes.filter(s => s.juntaId === JID && S.overdueSolicitud(s) && !s.overdueNotified).forEach(s => {
      s.overdueNotified = true; changed = true;
      S.notify('dirigente', `Seguimiento pendiente: la solicitud ${s.id} lleva ${Math.round(U.hoursSince(s.lastChange))} h sin respuesta.`, s.id);
    });
    if (changed) S.save();
  }

  /* ================= Faenas ================= */
  function faenas(root) {
    let editing = null;
    root.innerHTML = `
      <div class="card"><h2 id="fTitle">Registrar una faena</h2>
        <form id="ff" novalidate>
          <div class="form-grid">
            <div class="form-group"><label for="fPlace">Lugar *</label><input id="fPlace" type="text" maxlength="80" autocomplete="off" aria-describedby="ePlace"><p class="field-error" id="ePlace" role="alert"></p></div>
            <div class="form-group"><label for="fDate">Fecha *</label><input id="fDate" type="date" aria-describedby="eDate"><p class="field-error" id="eDate" role="alert"></p></div>
            <div class="form-group"><label for="fTime">Hora *</label><input id="fTime" type="time" aria-describedby="eTime"><p class="field-error" id="eTime" role="alert"></p></div>
          </div>
          <div class="form-group"><label for="fDesc">Descripción *</label><textarea id="fDesc" rows="2" maxlength="200" aria-describedby="eDesc"></textarea><p class="field-error" id="eDesc" role="alert"></p></div>
          <div class="form-group checkbox-group"><input type="checkbox" id="fImpl"><label for="fImpl">La junta garantiza guantes y bolsas</label></div>
          <div class="form-grid">
            <div class="form-group"><label for="fInsJ">Insumos que aporta la junta</label><textarea id="fInsJ" rows="2" maxlength="150" aria-describedby="insNote"></textarea></div>
            <div class="form-group"><label for="fInsV">Insumos que deben traer los vecinos</label><textarea id="fInsV" rows="2" maxlength="150" aria-describedby="insNote"></textarea></div>
          </div>
          <p class="text-muted" id="insNote"></p>
          <div class="form-actions"><button class="btn btn-primary" type="submit" id="fSave">Registrar faena</button><button class="btn btn-secondary" type="button" id="fCancelEdit" hidden>Cancelar edición</button></div>
        </form></div>
      <div class="card"><h2>Faenas de mi junta</h2><div id="fl" aria-live="polite"></div></div>`;
    const $ = s => root.querySelector(s);
    $('#fDate').min = U.todayISO();

    function resetForm() {
      editing = null; $('#ff').reset(); $('#fTitle').textContent = 'Registrar una faena'; $('#fSave').textContent = 'Registrar faena'; $('#fCancelEdit').hidden = true;
      ['fInsJ', 'fInsV'].forEach(i => $('#' + i).disabled = false); $('#insNote').textContent = '';
      ['ePlace', 'eDate', 'eTime', 'eDesc'].forEach(i => setErr(root, i, ''));
    }
    function startEdit(f) {
      resetForm();
      editing = f.id; $('#fTitle').textContent = `Editar faena ${f.id}`; $('#fSave').textContent = 'Guardar cambios'; $('#fCancelEdit').hidden = false;
      $('#fPlace').value = f.place; $('#fDate').value = f.date; $('#fTime').value = f.time; $('#fDesc').value = f.desc; $('#fImpl').checked = f.implementos;
      $('#fInsJ').value = f.insumosJunta; $('#fInsV').value = f.insumosVecinos;
      const locked = f.date <= U.todayISO(); // HU-35: los insumos se pueden cambiar hasta el día anterior
      ['fInsJ', 'fInsV'].forEach(i => $('#' + i).disabled = locked);
      $('#insNote').textContent = locked ? 'La lista de insumos solo puede actualizarse hasta el día anterior a la faena.' : '';
      U.scrollToEl($('#ff').closest('.card'));
      $('#fPlace').focus({ preventScroll: true });
    }

    $('#ff').addEventListener('submit', e => {
      e.preventDefault();
      const v = { place: $('#fPlace').value.trim(), date: $('#fDate').value, time: $('#fTime').value, desc: $('#fDesc').value.trim() };
      let ok = true;
      ok = setErr(root, 'ePlace', v.place ? '' : 'Indica el lugar de la faena.') && ok;
      ok = setErr(root, 'eDate', !v.date ? 'Indica la fecha.' : (v.date < U.todayISO() ? 'La fecha no puede ser anterior a hoy.' : '')) && ok;
      ok = setErr(root, 'eTime', !v.time ? 'Indica la hora.' : (v.date && U.startOf({ date: v.date, time: v.time }) < Date.now() ? 'Esa hora ya pasó.' : '')) && ok;
      ok = setErr(root, 'eDesc', v.desc ? '' : 'Agrega una breve descripción.') && ok;
      if (!ok) {
        EV.ui.toast('Revisa los campos marcados.', 'error');
        const first = root.querySelector('#ff [aria-invalid=true]'); if (first) first.focus();
        return;
      }
      if (editing) {
        const f = S.s.faenas.find(x => x.id === editing);
        Object.assign(f, v, { implementos: $('#fImpl').checked });
        if (!$('#fInsJ').disabled) { f.insumosJunta = $('#fInsJ').value.trim(); f.insumosVecinos = $('#fInsV').value.trim(); }
        if (f.inscritos.some(i => i.id === S.USER)) S.notify('vecino', `La faena en ${f.place} fue actualizada. Revisa los detalles.`, f.id);
        S.save(); EV.ui.toast('Faena actualizada.', 'success');
      } else {
        const zone = S.zoneOfJunta(JID);
        S.s.faenas.push({ id: S.nextId('FAE', 'fae'), organizer: 'junta', organizerName: junta().name, juntaId: JID, zone: zone.id, lat: zone.lat, lng: zone.lng, ...v,
          implementos: $('#fImpl').checked, insumosJunta: $('#fInsJ').value.trim(), insumosVecinos: $('#fInsV').value.trim(), cancelled: false, invited: 0, attendanceSaved: false, inscritos: [] });
        S.save(); EV.ui.toast('Faena registrada. Ya es visible para los vecinos de la zona.', 'success');
      }
      resetForm();
    });
    $('#fCancelEdit').addEventListener('click', resetForm);

    function draw() {
      const list = S.s.faenas.filter(f => f.juntaId === JID).sort((a, b) => U.startOf(b) - U.startOf(a));
      $('#fl').innerHTML = list.length ? `<ul class="item-list">${list.map(f => {
        const started = U.startOf(f) <= Date.now(), isDay = f.date <= U.todayISO();
        const state = f.cancelled ? '<span class="badge badge--delayed">Cancelada</span>' : started ? '<span class="badge badge--pending">Realizada / en curso</span>' : '<span class="badge badge--active">Programada</span>';
        return `<li class="item item--col"><div><strong>${U.fmtDate(U.startOf(f))} · ${esc(f.time)}</strong> — ${esc(f.place)} ${state}<br>
          <span class="text-muted">${esc(f.desc)}</span><br>
          <span class="text-muted">Inscritos: ${f.inscritos.length}${f.invited ? ` de ${f.invited} invitados` : ''} · Junta aporta: ${esc(f.insumosJunta || '—')} · Vecinos traen: ${esc(f.insumosVecinos || '—')}</span></div>
          <div class="form-actions">
          ${!f.cancelled && !started ? `<button type="button" class="btn btn-secondary btn-sm" data-edit="${f.id}">Editar</button><button type="button" class="btn btn-secondary btn-sm" data-invite="${f.id}">${f.invited ? 'Reenviar invitación' : 'Invitar a vecinos'}</button><button type="button" class="btn btn-ghost btn-sm btn-danger" data-cancel="${f.id}">Cancelar faena</button>` : ''}
          ${!f.cancelled && isDay ? `<button type="button" class="btn btn-primary btn-sm" data-att="${f.id}">${f.attendanceSaved ? 'Ver asistencia' : 'Registrar asistencia'}</button>` : ''}</div></li>`;
      }).join('')}</ul>` : '<p class="empty">Aún no registraste faenas.</p>';
    }
    root.addEventListener('click', async e => {
      const t = e.target.closest('#fl button'); if (!t) return;
      const find = id => S.s.faenas.find(x => x.id === id);
      if (t.dataset.edit) startEdit(find(t.dataset.edit));
      if (t.dataset.cancel) {
        const f = find(t.dataset.cancel);
        const ok = await EV.ui.confirm(`La faena del ${U.fmtDate(U.startOf(f))} en ${f.place} se cancelará y se avisará a los inscritos. Esta acción no se puede deshacer.`,
          { title: '¿Cancelar la faena?', ok: 'Sí, cancelar faena' });
        if (!ok) return;
        f.cancelled = true;
        if (editing === f.id) resetForm();
        if (f.inscritos.some(i => i.id === S.USER)) S.notify('vecino', `La faena del ${U.fmtDate(U.startOf(f))} en ${f.place} fue cancelada.`, f.id);
        S.save(); EV.ui.toast('Faena cancelada.', 'info');
      }
      if (t.dataset.invite) {          // HU-34
        const f = find(t.dataset.invite); f.invited = ZONE_NEIGHBOURS;
        S.notify('vecino', `${f.organizerName} te invita a la faena del ${U.fmtDate(U.startOf(f))} (${f.time}) en ${f.place}.`, f.id);
        S.save(); EV.ui.toast(`Invitación enviada a los ${ZONE_NEIGHBOURS} vecinos registrados de tu zona.`, 'success');
      }
      if (t.dataset.att) attendance(find(t.dataset.att));
    });

    /* HU-36: solo los asistentes reciben puntos */
    function attendance(f) {
      const body = EV.ui.openDialog(`Asistencia · ${f.place}`, '');
      function d() {
        const saved = f.attendanceSaved, present = f.inscritos.filter(i => i.attended).length;
        body.innerHTML = f.inscritos.length ? `<form id="af"><fieldset><legend>Marca a quienes asistieron</legend><ul class="plain-list">${f.inscritos.map((i, k) => `<li class="checkbox-group"><input type="checkbox" id="a${k}" ${i.attended ? 'checked' : ''} ${saved ? 'disabled' : ''}><label for="a${k}">${esc(i.name)}</label></li>`).join('')}</ul></fieldset>
          ${saved ? `<p class="status-text">Asistencia registrada: ${present} de ${f.inscritos.length}. Puntos otorgados: ${POINTS_PER_FAENA} por asistente.</p>` : `<button class="btn btn-primary" type="submit">Guardar asistencia</button>`}</form>` : '<p class="empty">Nadie se inscribió a esta faena.</p>';
        const af = body.querySelector('#af');
        if (af && !saved) af.addEventListener('submit', e => {
          e.preventDefault();
          f.inscritos.forEach((i, k) => {
            i.attended = body.querySelector('#a' + k).checked;
            if (i.attended && i.id === S.USER) { S.s.settings.points[S.USER] = (S.s.settings.points[S.USER] || 0) + POINTS_PER_FAENA; S.notify('vecino', `¡Gracias por participar! Recibiste ${POINTS_PER_FAENA} puntos.`, f.id); }
          });
          f.attendanceSaved = true; S.save(); EV.ui.toast('Asistencia guardada en el historial de la faena.', 'success'); d();
        });
      }
      d();
    }
    draw();
    return { refresh: draw };
  }

  /* ================= Evidencia y protocolo (HU-38, HU-39, HU-40) ================= */
  function evidencia(root) {
    let photo = null;
    root.innerHTML = `
      <div class="card"><h2>Registrar evidencia sin confrontar</h2>
        <p class="text-muted">Toma una foto del punto donde se arroja basura. La app registra fecha, hora y ubicación. <strong>No escribas nombres ni datos de personas:</strong> el caso registra solo el punto geográfico y es visible únicamente para tu junta y el personal municipal.</p>
        <div id="evCam"></div>
        <form id="evf" class="form-group" novalidate><label for="evDesc">Breve descripción del punto *</label><textarea id="evDesc" rows="2" maxlength="200" aria-describedby="eEv"></textarea><p class="field-error" id="eEv" role="alert"></p>
        <button class="btn btn-primary" type="submit">Guardar evidencia y abrir caso</button></form></div>
      <div class="card"><h2>Casos del protocolo por fases</h2><div id="cases" aria-live="polite"></div></div>`;
    const cam = EV.camera.mount(root.querySelector('#evCam'), { onChange: p => photo = p });
    root.querySelector('#evf').addEventListener('submit', e => {
      e.preventDefault();
      const desc = root.querySelector('#evDesc').value.trim();
      if (!photo) { EV.ui.toast('Primero toma la foto de evidencia.', 'error'); root.querySelector('[data-cam=open]:not([hidden]), [data-cam=demo]:not([hidden])')?.focus(); return; }
      if (!setErr(root, 'eEv', desc ? '' : 'Agrega una breve descripción del punto.')) { root.querySelector('#evDesc').focus(); return; }
      const z = S.zoneOfJunta(JID);
      S.s.casos.push({ id: S.nextId('CAS', 'cas'), juntaId: JID, zone: z.id, createdAt: Date.now(), desc, phase: 0,
        evidence: [{ photo, desc }], actions: [], escalated: false, reportId: null });
      if (S.save()) { EV.ui.toast('Caso abierto en la fase de sensibilización.', 'success'); cam.reset(); photo = null; root.querySelector('#evDesc').value = ''; }
    });

    function draw() {
      const list = S.s.casos.filter(c => c.juntaId === JID).sort((a, b) => b.createdAt - a.createdAt);
      root.querySelector('#cases').innerHTML = list.length ? `<ul class="item-list">${list.map(c => {
        const acts = c.actions.filter(a => a.phase === c.phase).length, last = c.phase === S.FASES.length - 1;
        return `<li class="item item--col"><div class="feed-header"><strong>${esc(c.id)}</strong><span class="text-muted">${U.fmtDate(c.createdAt)} · ${esc(S.zoneById(c.zone).name)}</span></div>
          <div class="evidence">${c.evidence.map(ev => `<figure><img class="thumb thumb--lg" src="${ev.photo.dataUrl}" alt="Evidencia fotográfica del caso ${esc(c.id)}"><figcaption>${esc(ev.desc)}</figcaption></figure>`).join('')}</div>
          <ol class="phases" aria-label="Fases del protocolo">${S.FASES.map((n, i) => `<li ${i === c.phase && !c.escalated ? 'aria-current="step"' : ''} class="${i < c.phase || c.escalated ? 'done' : ''}">${i + 1}. ${n}</li>`).join('')}</ol>
          ${c.actions.length ? `<ul class="plain-list">${c.actions.map(a => `<li>${EV.ui.icon('✔')} <strong>${S.FASES[a.phase]}:</strong> ${esc(a.text)} <span class="text-muted">(${U.fmtDate(a.ts)})</span></li>`).join('')}</ul>` : ''}
          ${c.escalated ? `<p class="status-text">${EV.ui.icon('✔')} Caso escalado al municipio como ${esc(c.reportId)}.</p>` : `
            <form data-act="${c.id}" class="form-row form-row--inline"><label for="act-${c.id}">Acción realizada en la fase «${S.FASES[c.phase]}»</label><input id="act-${c.id}" type="text" maxlength="120" autocomplete="off"><button class="btn btn-secondary btn-sm" type="submit">Registrar acción</button></form>
            <div class="form-actions">${last
              ? `<button type="button" class="btn btn-primary" data-esc="${c.id}">Escalar al municipio</button>`
              : `<button type="button" class="btn btn-primary" data-next="${c.id}" ${acts ? '' : 'disabled aria-describedby="hint-' + c.id + '"'}>Avanzar a «${S.FASES[c.phase + 1]}»</button>`}
              ${!last && !acts ? `<span class="text-muted" id="hint-${c.id}">Registra al menos una acción de esta fase para avanzar.</span>` : ''}
              ${last ? '' : '<span class="text-muted">El caso solo puede escalarse desde la fase final.</span>'}</div>`}</li>`;
      }).join('')}</ul>` : '<p class="empty">No hay casos abiertos.</p>';
    }
    root.addEventListener('submit', e => {
      const f = e.target.closest('form[data-act]'); if (!f) return; e.preventDefault();
      const c = S.s.casos.find(x => x.id === f.dataset.act), input = f.querySelector('input'), text = input.value.trim();
      if (!text) { EV.ui.toast('Describe la acción realizada.', 'error'); input.focus(); return; }
      c.actions.push({ phase: c.phase, text, ts: Date.now() }); S.save(); EV.ui.toast('Acción registrada.', 'success');
    });
    root.addEventListener('click', async e => {
      const b = e.target.closest('#cases button[data-next], #cases button[data-esc]'); if (!b) return;
      if (b.dataset.next) {         // HU-40: avanza solo con una acción de la fase actual
        const c = S.s.casos.find(x => x.id === b.dataset.next);
        if (!c.actions.some(a => a.phase === c.phase)) { EV.ui.toast('Registra al menos una acción de la fase actual.', 'error'); return; }
        c.phase++; S.save(); EV.ui.toast(`Avanzaste a «${S.FASES[c.phase]}».`, 'success');
      }
      if (b.dataset.esc) {
        const c = S.s.casos.find(x => x.id === b.dataset.esc);
        if (c.phase !== S.FASES.length - 1 || c.escalated) return;
        const ok = await EV.ui.confirm(`El caso ${c.id} se enviará a la municipalidad como un reporte nuevo con su evidencia.`, { title: '¿Escalar al municipio?', ok: 'Escalar caso' });
        if (!ok) return;
        const ev = c.evidence[0], z = S.zoneById(c.zone);
        const r = { id: S.nextId('REP', 'rep'), createdAt: Date.now(), zone: c.zone, lat: ev.photo.lat, lng: ev.photo.lng, tipo: null, tamano: null, reserved: false, reporterId: 'junta-' + JID,
          source: 'junta', status: 'pending', photo: ev.photo, supporters: [], thread: [], after: null, override: null, closedAt: null, closedBy: null };
        S.s.reports.push(r); c.escalated = true; c.reportId = r.id;
        S.notify('municipal', `La ${junta().name} escaló el caso ${c.id} como reporte ${r.id} (${z.name}).`, r.id);
        S.save(); EV.ui.toast(`Caso escalado al municipio como ${r.id}.`, 'success');
      }
    });
    draw();
    return { refresh: draw, destroy: () => cam.destroy() };
  }

  /* ================= Mi zona (HU-29, HU-31) ================= */
  function zona(root) {
    root.innerHTML = `<div class="card"><h2>Estado de los reportes de mi zona</h2>
      <p class="notice notice--soft" id="zInfo"></p><div id="zl" aria-live="polite"></div></div>`;
    function draw() {
      const zones = S.ZONES.filter(z => S.s.settings.zoneJunta[z.id] === JID);
      root.querySelector('#zInfo').textContent = zones.length ? `${junta().name} · Zonas: ${zones.map(z => z.name).join(', ')}. Vista de solo lectura: los datos municipales no se pueden editar. Los cambios se reflejan en tiempo real.` : 'Tu junta aún no está vinculada a una zona. La municipalidad debe vincularla.';
      const list = S.reportsOfJunta(JID).sort((a, b) => b.createdAt - a.createdAt);
      root.querySelector('#zl').innerHTML = list.length ? `<ul class="item-list">${list.map(r => `<li class="item">
        <img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}"><div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status)}<br>
        <span class="text-muted">${U.fmtDateTime(r.createdAt)} · ${esc(S.zoneById(r.zone).name)} · ${r.thread.length} comentario(s)</span></div>
        <button type="button" class="btn btn-secondary btn-sm" data-thread="${r.id}">Comentarios</button></li>`).join('')}</ul>` : '<p class="empty">No hay reportes en tu zona.</p>';
    }
    root.addEventListener('click', e => { const b = e.target.closest('[data-thread]'); if (b) openThread(b.dataset.thread); });
    draw();
    return { refresh: draw };
  }
  /* HU-31: comentarios del reporte visibles para la junta y la municipalidad */
  function openThread(id) {
    const body = EV.ui.openDialog(`Comentarios · ${id}`, '');
    function d() {
      const r = S.s.reports.find(x => x.id === id);
      if (!r) return;
      body.innerHTML = `<p>${EV.ui.badge(r.status)}</p>${r.thread.length ? `<ul class="thread">${r.thread.map(m => `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="text-muted">Sin comentarios todavía.</p>'}
        <form id="tf" class="form-group"><label for="tt">Responder a la municipalidad</label><textarea id="tt" rows="2" maxlength="280" required></textarea><button class="btn btn-primary" type="submit">Enviar</button></form>`;
      body.querySelector('#tf').addEventListener('submit', e => {
        e.preventDefault(); const t = body.querySelector('#tt').value.trim(); if (!t) return;
        S.addMessage(r.thread, 'dirigente', t); S.notify('municipal', `La junta comentó en el reporte ${r.id}.`, r.id); S.save(); EV.ui.toast('Comentario enviado.', 'success');
      });
    }
    d();
    EV.ui.currentDetail = d;
  }

  /* ================= Solicitudes (HU-43, HU-44, HU-47) ================= */
  function solicitudes(root) {
    root.innerHTML = `
      <div class="card"><h2>Nueva solicitud al municipio</h2>
        <form id="sf" novalidate><div class="form-grid"><div class="form-group"><label for="sTipo">Tipo</label><select id="sTipo">${Object.entries(S.SOL_TIPOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="form-group"><label for="sAsunto">Asunto *</label><input id="sAsunto" type="text" maxlength="100" autocomplete="off" aria-describedby="eAs"><p class="field-error" id="eAs" role="alert"></p></div></div>
        <div class="form-group"><label for="sMsg">Mensaje</label><textarea id="sMsg" rows="2" maxlength="280"></textarea></div>
        <button class="btn btn-primary" type="submit">Enviar solicitud</button></form></div>
      <div class="card"><h2>Tiempo límite de respuesta</h2><p class="text-muted">Si una solicitud supera este tiempo sin respuesta, recibirás una notificación de seguimiento.</p>
        <form id="lf" class="form-grid">${Object.entries(S.SOL_TIPOS).map(([k, v]) => `<div class="form-group"><label for="lim-${k}">${v} (horas)</label><input id="lim-${k}" type="number" inputmode="numeric" min="1" max="720" value="${S.s.settings.requestHours[k]}"></div>`).join('')}
        <div class="form-group"><button class="btn btn-secondary" type="submit">Guardar tiempos</button></div></form></div>
      <div class="card"><h2>Mis solicitudes</h2><div id="sl" aria-live="polite"></div></div>`;
    root.querySelector('#sf').addEventListener('submit', e => {
      e.preventDefault();
      const asunto = root.querySelector('#sAsunto').value.trim(), msg = root.querySelector('#sMsg').value.trim();
      if (!setErr(root, 'eAs', asunto ? '' : 'Indica el asunto de la solicitud.')) { root.querySelector('#sAsunto').focus(); return; }
      const s = { id: S.nextId('SOL', 'sol'), juntaId: JID, tipo: root.querySelector('#sTipo').value, asunto, createdAt: Date.now(), status: 'enviada', lastChange: Date.now(), zone: S.zoneOfJunta(JID).id, reminders: 0, thread: [] };
      if (msg) S.addMessage(s.thread, 'dirigente', msg);
      S.s.solicitudes.push(s); S.notify('municipal', `Nueva solicitud ${s.id} de la ${junta().name}: ${asunto}.`, s.id);
      S.save(); EV.ui.toast(`Solicitud ${s.id} enviada.`, 'success'); e.target.reset();
    });
    root.querySelector('#lf').addEventListener('submit', e => {
      e.preventDefault();
      Object.keys(S.SOL_TIPOS).forEach(k => { const v = +root.querySelector('#lim-' + k).value; if (v >= 1) S.s.settings.requestHours[k] = v; });
      S.s.solicitudes.forEach(s => s.overdueNotified = false); S.save(); checkAlerts(); EV.ui.toast('Tiempos guardados.', 'success');
    });
    function draw() {
      const list = S.s.solicitudes.filter(s => s.juntaId === JID).sort((a, b) => b.createdAt - a.createdAt);
      root.querySelector('#sl').innerHTML = list.length ? `<ul class="item-list">${list.map(s => {
        const od = S.overdueSolicitud(s);
        return `<li class="item item--col"><div class="feed-header"><div><strong>${esc(s.id)}</strong> — ${esc(s.asunto)}</div><span class="badge badge--sol-${s.status}">${S.SOL_ESTADOS[s.status]}</span></div>
          <span class="text-muted">${esc(S.SOL_TIPOS[s.tipo])} · Enviada: ${U.fmtDate(s.createdAt)} · Último cambio de estado: ${U.fmtDateTime(s.lastChange)}</span>
          ${od ? `<p class="notice notice--warn">${EV.ui.icon('⏰')} Sin respuesta hace ${Math.round(U.hoursSince(s.lastChange))} h (límite: ${S.s.settings.requestHours[s.tipo]} h).</p>` : ''}
          <div class="form-actions"><button type="button" class="btn btn-secondary btn-sm" data-sol="${s.id}">Ver hilo (${s.thread.length})</button>${od ? `<button type="button" class="btn btn-primary btn-sm" data-remind="${s.id}">Reenviar recordatorio</button>` : ''}</div></li>`;
      }).join('')}</ul>` : '<p class="empty">No has enviado solicitudes.</p>';
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('#sl button'); if (!b) return;
      if (b.dataset.sol) openSolThread(b.dataset.sol);
      if (b.dataset.remind) remind(b.dataset.remind);
    });
    draw();
    return { refresh: draw };
  }
  /* HU-44: reenviar recordatorio */
  function remind(id) {
    const s = S.s.solicitudes.find(x => x.id === id);
    if (!s) return;
    S.addMessage(s.thread, 'dirigente', 'Recordatorio: seguimos esperando respuesta a esta solicitud.');
    s.reminders++; S.notify('municipal', `Recordatorio de la ${junta().name} sobre la solicitud ${s.id}.`, s.id);
    S.save(); EV.ui.toast('Recordatorio enviado al municipio.', 'success');
  }
  /* HU-47: toda la comunicación de la solicitud en un solo hilo cronológico */
  function openSolThread(id) {
    const body = EV.ui.openDialog(`Solicitud ${id}`, '');
    function d() {
      const s = S.s.solicitudes.find(x => x.id === id);
      if (!s) return;
      const msgs = [...s.thread].sort((a, b) => a.ts - b.ts);
      body.innerHTML = `<p><span class="badge badge--sol-${s.status}">${S.SOL_ESTADOS[s.status]}</span> <span class="text-muted">Último cambio: ${U.fmtDateTime(s.lastChange)}</span></p>
        <h3>${esc(s.asunto)}</h3>${msgs.length ? `<ul class="thread">${msgs.map(m => `<li class="msg msg--${m.from}"><strong>${FROM[m.from]}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`).join('')}</ul>` : '<p class="text-muted">Sin mensajes.</p>'}
        <form id="sm" class="form-group"><label for="smt">Escribir en el hilo</label><textarea id="smt" rows="2" maxlength="280" required></textarea><button class="btn btn-primary" type="submit">Enviar</button></form>`;
      body.querySelector('#sm').addEventListener('submit', e => {
        e.preventDefault(); const t = body.querySelector('#smt').value.trim(); if (!t) return;
        S.addMessage(s.thread, 'dirigente', t); S.notify('municipal', `Nuevo mensaje de la junta en la solicitud ${s.id}.`, s.id); S.save();
        EV.ui.toast('Mensaje enviado.', 'success');
      });
    }
    d();
    EV.ui.currentDetail = d;
  }

  function openRef(ref) {
    if (ref.startsWith('REP-')) openThread(ref);
    else if (ref.startsWith('SOL-')) openSolThread(ref);
    else if (ref.startsWith('FAE-')) EV.app.goTab('faenas');
  }

  return {
    checkAlerts, remind, openRef, refTypes: ['REP', 'SOL', 'FAE'],
    tabs: [
      { id: 'faenas', icon: '../assets/faena.svg', label: 'Faenas', render: faenas },
      { id: 'evidencia', glyph: '📸', label: 'Evidencia y protocolo', render: evidencia },
      { id: 'zona', glyph: '🗺️', label: 'Mi zona', render: zona },
      { id: 'solicitudes', glyph: '📨', label: 'Solicitudes', render: solicitudes }
    ]
  };
})();
