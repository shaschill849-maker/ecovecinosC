EV.views.dirigente = (function () {
  const S = EV.store;
  const U = EV.util;
  const esc = U.esc;
  const JID = 'j1';
  const PUNTOS_POR_FAENA = 10;
  const FROM = { vecino: 'Vecino', municipal: 'Municipalidad', dirigente: 'Tú (junta)' };
  const junta = () => S.juntaById(JID);
  const zonaDeLaJunta = () => S.ZONES.find(z => S.s.settings.zoneJunta[z.id] === JID) || S.ZONES[0];
  const setError = EV.ui.setError;

  // HU-44 Notificar solicitud sin respuesta al ingresar
  function checkAlerts() {
    S.quitarAvisos('seguimiento');
    S.s.solicitudes
      .filter(s => s.juntaId === JID && S.overdueSolicitud(s))
      .forEach(s => {
        const horas = Math.round(U.hoursSince(s.lastChange));
        S.notify('dirigente', 'Seguimiento pendiente: la solicitud ' + s.id + ' lleva ' + horas + ' h sin respuesta.', s.id, null, 'seguimiento');
      });
    S.save();
  }

  // HU-33 Registrar una faena y HU-35 Indicar insumos de la faena
  function faenas(root) {
    let editando = null;
    root.innerHTML = `
      <div class="card"><h2 id="fTitle">Registrar una faena</h2>
        <form id="ff" novalidate>
          <div class="form-grid">
            <div class="form-group"><label for="fPlace">Lugar *</label><input id="fPlace" type="text" maxlength="80" aria-describedby="ePlace"><p class="field-error" id="ePlace" role="alert"></p></div>
            <div class="form-group"><label for="fDate">Fecha *</label><input id="fDate" type="date" aria-describedby="eDate"><p class="field-error" id="eDate" role="alert"></p></div>
            <div class="form-group"><label for="fTime">Hora *</label><input id="fTime" type="time" aria-describedby="eTime"><p class="field-error" id="eTime" role="alert"></p></div>
            <div class="form-group"><label for="fCupos">Cupos *</label><input id="fCupos" type="number" min="1" max="200" value="20" aria-describedby="eCupos"><p class="field-error" id="eCupos" role="alert"></p></div>
          </div>
          <div class="form-group"><label for="fDesc">Descripción *</label><textarea id="fDesc" rows="2" maxlength="200" aria-describedby="eDesc"></textarea><p class="field-error" id="eDesc" role="alert"></p></div>
          <div class="form-group checkbox-group"><input type="checkbox" id="fImpl"><label for="fImpl">La junta garantiza guantes y bolsas</label></div>
          <div class="form-grid">
            <div class="form-group"><label for="fInsJ">Insumos que aporta la junta</label><textarea id="fInsJ" rows="2" maxlength="150"></textarea></div>
            <div class="form-group"><label for="fInsV">Insumos que deben traer los vecinos</label><textarea id="fInsV" rows="2" maxlength="150"></textarea></div>
          </div>
          <p class="text-muted" id="insNote"></p>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" id="fSave">Registrar faena</button>
            <button class="btn btn-secondary" type="button" id="fCancelEdit" hidden>Cancelar edición</button>
          </div>
        </form>
      </div>
      <div class="card"><h2>Faenas de mi junta</h2><div id="fl" aria-live="polite"></div></div>`;

    const $ = selector => root.querySelector(selector);
    const buscar = id => S.s.faenas.find(x => x.id === id);
    $('#fDate').min = U.todayISO();

    function limpiarFormulario() {
      editando = null;
      $('#ff').reset();
      $('#fTitle').textContent = 'Registrar una faena';
      $('#fSave').textContent = 'Registrar faena';
      $('#fCancelEdit').hidden = true;
      $('#fInsJ').disabled = false;
      $('#fInsV').disabled = false;
      $('#insNote').textContent = '';
      ['ePlace', 'eDate', 'eTime', 'eCupos', 'eDesc'].forEach(id => setError(root, id, ''));
    }

    function editar(f) {
      editando = f.id;
      $('#fTitle').textContent = 'Editar faena ' + f.id;
      $('#fSave').textContent = 'Guardar cambios';
      $('#fCancelEdit').hidden = false;
      $('#fPlace').value = f.place;
      $('#fDate').value = f.date;
      $('#fTime').value = f.time;
      $('#fCupos').value = f.cupos;
      $('#fDesc').value = f.desc;
      $('#fImpl').checked = f.implementos;
      $('#fInsJ').value = f.insumosJunta;
      $('#fInsV').value = f.insumosVecinos;
      const bloqueado = f.date <= U.todayISO();
      $('#fInsJ').disabled = bloqueado;
      $('#fInsV').disabled = bloqueado;
      $('#insNote').textContent = bloqueado ? 'La lista de insumos solo puede actualizarse hasta el día anterior a la faena.' : '';
      $('#ff').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#fPlace').focus();
    }

    $('#ff').addEventListener('submit', e => {
      e.preventDefault();
      const datos = {
        place: $('#fPlace').value.trim(),
        date: $('#fDate').value,
        time: $('#fTime').value,
        cupos: Number($('#fCupos').value),
        desc: $('#fDesc').value.trim()
      };
      const actual = editando ? buscar(editando) : null;

      let errorFecha = '';
      if (!datos.date) errorFecha = 'Indica la fecha.';
      else if (datos.date < U.todayISO()) errorFecha = 'La fecha no puede ser anterior a hoy.';

      let errorHora = '';
      if (!datos.time) errorHora = 'Indica la hora.';
      else if (datos.date && U.startOf({ date: datos.date, time: datos.time }) < Date.now()) errorHora = 'Esa hora ya pasó.';

      let errorCupos = '';
      if (!datos.cupos || datos.cupos < 1) errorCupos = 'Indica al menos 1 cupo.';
      else if (actual && datos.cupos < actual.inscritos.length) errorCupos = 'Ya hay ' + actual.inscritos.length + ' inscritos; no puedes poner menos cupos.';

      let ok = true;
      ok = setError(root, 'ePlace', datos.place ? '' : 'Indica el lugar de la faena.') && ok;
      ok = setError(root, 'eDate', errorFecha) && ok;
      ok = setError(root, 'eTime', errorHora) && ok;
      ok = setError(root, 'eCupos', errorCupos) && ok;
      ok = setError(root, 'eDesc', datos.desc ? '' : 'Agrega una breve descripción.') && ok;
      if (!ok) {
        EV.ui.toast('Revisa los campos marcados.', 'error');
        return;
      }

      if (actual) {
        Object.assign(actual, datos, { implementos: $('#fImpl').checked });
        if (!$('#fInsJ').disabled) {
          actual.insumosJunta = $('#fInsJ').value.trim();
          actual.insumosVecinos = $('#fInsV').value.trim();
        }
        if (actual.inscritos.some(i => i.id === S.USER)) {
          S.notify('vecino', 'La faena en ' + actual.place + ' fue actualizada. Revisa los detalles.', actual.id);
        }
        S.save();
        EV.ui.toast('Faena actualizada.', 'success');
      } else {
        const zona = zonaDeLaJunta();
        S.s.faenas.push(Object.assign({
          id: S.nextId('FAE', 'fae'), organizer: 'junta', organizerName: junta().name, juntaId: JID, zone: zona.id, lat: zona.lat, lng: zona.lng
        }, datos, {
          implementos: $('#fImpl').checked, insumosJunta: $('#fInsJ').value.trim(), insumosVecinos: $('#fInsV').value.trim(),
          cancelled: false, attendanceSaved: false, invited: [], inscritos: []
        }));
        S.save();
        EV.ui.toast('Faena registrada. Ya es visible para los vecinos de la zona.', 'success');
      }
      limpiarFormulario();
    });

    $('#fCancelEdit').addEventListener('click', limpiarFormulario);

    function draw() {
      const lista = S.s.faenas.filter(f => f.juntaId === JID).sort((a, b) => U.startOf(b) - U.startOf(a));
      if (!lista.length) {
        $('#fl').innerHTML = '<p class="empty">Aún no registraste faenas.</p>';
        return;
      }
      $('#fl').innerHTML = '<ul class="item-list">' + lista.map(f => {
        const empezo = U.startOf(f) <= Date.now();
        const esElDia = f.date <= U.todayISO();
        let estado = '<span class="badge badge--active">Programada</span>';
        if (f.cancelled) estado = '<span class="badge badge--neutral">Cancelada</span>';
        else if (empezo) estado = '<span class="badge badge--neutral">Realizada o en curso</span>';

        let botones = '';
        if (!f.cancelled && !empezo) {
          botones += `<button class="btn btn-secondary btn-sm" data-edit="${f.id}">Editar</button>
            <button class="btn btn-secondary btn-sm" data-invite="${f.id}">${f.invited.length ? 'Reenviar invitación' : 'Invitar a vecinos'}</button>
            <button class="btn btn-ghost btn-sm" data-cancel="${f.id}">Cancelar faena</button>`;
        }
        if (f.invited.length) {
          botones += `<button class="btn btn-ghost btn-sm" data-invitados="${f.id}">Ver invitados</button>`;
        }
        if (!f.cancelled && esElDia) {
          botones += `<button class="btn btn-primary btn-sm" data-att="${f.id}">${f.attendanceSaved ? 'Ver asistencia' : 'Registrar asistencia'}</button>`;
        }

        const confirmados = f.invited.length
          ? f.inscritos.length + ' confirmado(s) de ' + f.invited.length + ' invitado(s)'
          : f.inscritos.length + ' inscrito(s), aún sin invitar';

        return `<li class="item item--col">
          <div><strong>${U.fmtDate(U.startOf(f))}, ${esc(f.time)}</strong> - ${esc(f.place)} ${estado}<br>
            <span class="text-muted">${esc(f.desc)}</span><br>
            <span class="status-text">${confirmados} - ${f.cupos} cupos</span><br>
            <span class="text-muted">Junta aporta: ${esc(f.insumosJunta || '-')}. Vecinos traen: ${esc(f.insumosVecinos || '-')}</span>
          </div>
          <div class="form-actions">${botones}</div>
        </li>`;
      }).join('') + '</ul>';
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.edit) editar(buscar(b.dataset.edit));
      if (b.dataset.cancel) cancelarFaena(buscar(b.dataset.cancel));
      if (b.dataset.invite) invitar(buscar(b.dataset.invite));
      if (b.dataset.invitados) verInvitados(buscar(b.dataset.invitados));
      if (b.dataset.att) asistencia(buscar(b.dataset.att));
    });

    function cancelarFaena(f) {
      EV.ui.confirmar('¿Cancelar la faena del ' + U.fmtDate(U.startOf(f)) + ' en ' + f.place + '? Se avisará a los inscritos.', 'Sí, cancelar faena', () => {
        f.cancelled = true;
        if (f.inscritos.some(i => i.id === S.USER)) {
          S.notify('vecino', 'La faena del ' + U.fmtDate(U.startOf(f)) + ' en ' + f.place + ' fue cancelada.', f.id);
        }
        S.save();
        EV.ui.toast('Faena cancelada.', 'info');
      });
    }

    // HU-34 Invitar a los vecinos registrados de la zona y ver cuántos confirmaron
    function invitar(f) {
      const zona = S.zoneById(f.zone);
      const vecinos = S.vecinosDeZona(f.zone);
      if (!vecinos.length) {
        EV.ui.toast('No hay vecinos registrados en ' + zona.name + '.', 'warn');
        return;
      }
      f.invited = vecinos.map(v => v.id);
      if (f.invited.includes(S.USER)) {
        S.notify('vecino', f.organizerName + ' te invita a la faena del ' + U.fmtDate(U.startOf(f)) + ' (' + f.time + ') en ' + f.place + '. ' + f.desc, f.id);
      }
      S.save();
      EV.ui.toast('Invitación enviada a los ' + vecinos.length + ' vecinos registrados de ' + zona.name + '.', 'success');
    }

    function verInvitados(f) {
      const body = EV.ui.openDialog('Invitados - ' + f.place, '');
      function dibujar() {
        const actual = buscar(f.id);
        const filas = actual.invited.map(id => {
          const v = S.vecinoById(id);
          const confirmo = actual.inscritos.some(i => i.id === id);
          return `<li class="fila-invitado"><span>${esc(v ? v.name : id)}</span>
            ${confirmo ? '<span class="badge badge--resolved">Confirmó</span>' : '<span class="badge badge--neutral">Invitado</span>'}</li>`;
        }).join('');
        const confirmados = actual.invited.filter(id => actual.inscritos.some(i => i.id === id)).length;
        body.innerHTML = `<p class="status-text">${confirmados} de ${actual.invited.length} vecinos confirmaron su asistencia.</p>
          <ul class="plain-list">${filas}</ul>`;
      }
      EV.ui.currentDetail = dibujar;
      dibujar();
    }

    // HU-36 Registrar asistencia a la faena
    function asistencia(f) {
      const body = EV.ui.openDialog('Asistencia - ' + f.place, '');
      function dibujar() {
        if (!f.inscritos.length) {
          body.innerHTML = '<p class="empty">Nadie se inscribió a esta faena.</p>';
          return;
        }
        const lista = f.inscritos.map((i, k) => `<li class="checkbox-group">
          <input type="checkbox" id="a${k}" ${i.attended ? 'checked' : ''} ${f.attendanceSaved ? 'disabled' : ''}>
          <label for="a${k}">${esc(i.name)}</label>
        </li>`).join('');
        let pie = '<button class="btn btn-primary" type="submit">Guardar asistencia</button>';
        if (f.attendanceSaved) {
          const asistieron = f.inscritos.filter(i => i.attended).length;
          pie = `<p class="status-text">Asistencia registrada: ${asistieron} de ${f.inscritos.length}. Puntos otorgados: ${PUNTOS_POR_FAENA} por asistente.</p>`;
        }
        body.innerHTML = `<form id="af"><ul class="plain-list">${lista}</ul>${pie}</form>`;

        if (!f.attendanceSaved) {
          body.querySelector('#af').addEventListener('submit', e => {
            e.preventDefault();
            f.inscritos.forEach((i, k) => {
              i.attended = body.querySelector('#a' + k).checked;
              if (i.attended && i.id === S.USER) {
                S.s.settings.points[S.USER] = (S.s.settings.points[S.USER] || 0) + PUNTOS_POR_FAENA;
                S.notify('vecino', 'Gracias por participar. Recibiste ' + PUNTOS_POR_FAENA + ' puntos.', f.id);
              }
            });
            f.attendanceSaved = true;
            S.save();
            EV.ui.toast('Asistencia guardada en el historial de la faena.', 'success');
            dibujar();
          });
        }
      }
      dibujar();
    }

    draw();
    return { refresh: draw };
  }

  // HU-38 Subir evidencia con fecha y hora, HU-39 Reportar sin identificar al vecino y HU-40 Seguir protocolo por fases
  function evidencia(root) {
    let foto = null;
    root.innerHTML = `
      <div class="card"><h2>Registrar evidencia sin confrontar</h2>
        <p class="text-muted">Toma una foto del punto donde se arroja basura. La app registra fecha, hora y ubicación. <strong>No escribas nombres ni datos de personas:</strong> el caso registra solo el punto geográfico y es visible únicamente para tu junta y el personal municipal.</p>
        <div id="evCam"></div>
        <form id="evf" class="form-group" novalidate>
          <label for="evDesc">Breve descripción del punto *</label>
          <textarea id="evDesc" rows="2" maxlength="200" aria-describedby="eEv"></textarea>
          <p class="field-error" id="eEv" role="alert"></p>
          <button class="btn btn-primary" type="submit">Guardar evidencia y abrir caso</button>
        </form>
      </div>
      <div class="card"><h2>Casos del protocolo por fases</h2><div id="cases" aria-live="polite"></div></div>`;

    const cam = EV.camera.mount(root.querySelector('#evCam'), { onChange: p => { foto = p; } });

    root.querySelector('#evf').addEventListener('submit', e => {
      e.preventDefault();
      const desc = root.querySelector('#evDesc').value.trim();
      if (!foto) {
        EV.ui.toast('Primero toma la foto de evidencia.', 'error');
        return;
      }
      if (!setError(root, 'eEv', desc ? '' : 'Agrega una breve descripción del punto.')) return;
      S.s.casos.push({
        id: S.nextId('CAS', 'cas'), juntaId: JID, zone: zonaDeLaJunta().id, createdAt: Date.now(), desc: desc, phase: 0,
        evidence: [{ photo: foto, desc: desc }], actions: [], escalated: false, reportId: null
      });
      if (S.save()) {
        EV.ui.toast('Caso abierto en la fase de sensibilización.', 'success');
        cam.reset();
        foto = null;
        root.querySelector('#evDesc').value = '';
      }
    });

    function draw() {
      const lista = S.s.casos.filter(c => c.juntaId === JID).sort((a, b) => b.createdAt - a.createdAt);
      if (!lista.length) {
        root.querySelector('#cases').innerHTML = '<p class="empty">No hay casos abiertos.</p>';
        return;
      }
      root.querySelector('#cases').innerHTML = '<ul class="item-list">' + lista.map(c => {
        const acciones = c.actions.filter(a => a.phase === c.phase).length;
        const ultima = c.phase === S.FASES.length - 1;

        const fases = S.FASES.map((nombre, i) => {
          const actual = i === c.phase && !c.escalated ? 'aria-current="step"' : '';
          const hecha = i < c.phase || c.escalated ? 'done' : '';
          return `<li ${actual} class="${hecha}">${i + 1}. ${nombre}</li>`;
        }).join('');

        let historial = '';
        if (c.actions.length) {
          historial = '<ul class="plain-list">' + c.actions.map(a =>
            `<li><strong>${S.FASES[a.phase]}:</strong> ${esc(a.text)} <span class="text-muted">(${U.fmtDate(a.ts)})</span></li>`
          ).join('') + '</ul>';
        }

        let controles = `<p class="status-text">Caso escalado al municipio como ${esc(c.reportId)}.</p>`;
        if (!c.escalated) {
          let boton;
          if (ultima) {
            boton = `<button class="btn btn-primary" data-esc="${c.id}">Escalar al municipio</button>`;
          } else if (acciones) {
            boton = `<button class="btn btn-primary" data-next="${c.id}">Avanzar a "${S.FASES[c.phase + 1]}"</button>`;
          } else {
            boton = `<button class="btn btn-primary" data-next="${c.id}" disabled aria-describedby="hint-${c.id}">Avanzar a "${S.FASES[c.phase + 1]}"</button>
              <span class="text-muted" id="hint-${c.id}">Registra al menos una acción de esta fase para avanzar.</span>`;
          }
          controles = `<form data-act="${c.id}" class="form-row">
              <label for="act-${c.id}">Acción realizada en la fase "${S.FASES[c.phase]}"</label>
              <input id="act-${c.id}" type="text" maxlength="120">
              <button class="btn btn-secondary btn-sm" type="submit">Registrar acción</button>
            </form>
            <div class="form-actions">${boton}
              ${ultima ? '' : '<span class="text-muted">El caso solo puede escalarse desde la fase final.</span>'}
            </div>`;
        }

        return `<li class="item item--col">
          <div class="feed-header"><strong>${esc(c.id)}</strong><span class="text-muted">${U.fmtDate(c.createdAt)} - ${esc(S.zoneById(c.zone).name)}</span></div>
          <div class="evidence">${c.evidence.map(ev => `<figure><img class="thumb thumb--lg" src="${ev.photo.dataUrl}" alt="Evidencia fotográfica del caso ${esc(c.id)}"><figcaption>${esc(ev.desc)}</figcaption></figure>`).join('')}</div>
          <ol class="phases" aria-label="Fases del protocolo">${fases}</ol>
          ${historial}
          ${controles}
        </li>`;
      }).join('') + '</ul>';
    }

    root.addEventListener('submit', e => {
      const form = e.target.closest('form[data-act]');
      if (!form) return;
      e.preventDefault();
      const c = S.s.casos.find(x => x.id === form.dataset.act);
      const input = form.querySelector('input');
      const texto = input.value.trim();
      if (!texto) {
        EV.ui.toast('Describe la acción realizada.', 'error');
        input.focus();
        return;
      }
      c.actions.push({ phase: c.phase, text: texto, ts: Date.now() });
      S.save();
      EV.ui.toast('Acción registrada.', 'success');
    });

    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.next) avanzarFase(S.s.casos.find(x => x.id === b.dataset.next));
      if (b.dataset.esc) escalar(S.s.casos.find(x => x.id === b.dataset.esc));
    });

    function avanzarFase(c) {
      if (!c.actions.some(a => a.phase === c.phase)) {
        EV.ui.toast('Registra al menos una acción de la fase actual.', 'error');
        return;
      }
      c.phase++;
      S.save();
      EV.ui.toast('Avanzaste a "' + S.FASES[c.phase] + '".', 'success');
    }

    function escalar(c) {
      if (c.phase !== S.FASES.length - 1) return;
      const ev = c.evidence[0];
      const zona = S.zoneById(c.zone);
      const r = {
        id: S.nextId('REP', 'rep'), createdAt: Date.now(), zone: c.zone, lat: ev.photo.lat, lng: ev.photo.lng, tipo: null, tamano: null,
        reserved: false, reporterId: 'junta-' + JID, source: 'junta', status: 'pending', photo: ev.photo, supporters: [], thread: [],
        after: null, override: null, closedAt: null, closedBy: null
      };
      S.s.reports.push(r);
      c.escalated = true;
      c.reportId = r.id;
      S.notify('municipal', 'La ' + junta().name + ' escaló el caso ' + c.id + ' como reporte ' + r.id + ' (' + zona.name + ').', r.id);
      S.save();
      EV.ui.toast('Caso escalado al municipio como ' + r.id + '.', 'success');
    }

    draw();
    return { refresh: draw, destroy: () => cam.destroy() };
  }

  // HU-29 Compartir estado con la junta y HU-31 Responder un reporte derivado
  function zona(root) {
    root.innerHTML = `<div class="card"><h2>Estado de los reportes de mi zona</h2>
      <p class="notice notice--soft" id="zInfo"></p>
      <div id="zl" aria-live="polite"></div>
    </div>`;

    function draw() {
      const zonas = S.ZONES.filter(z => S.s.settings.zoneJunta[z.id] === JID);
      if (zonas.length) {
        root.querySelector('#zInfo').textContent = junta().name + '. Zonas: ' + zonas.map(z => z.name).join(', ') +
          '. Vista de solo lectura: los datos municipales no se pueden editar. Los cambios se reflejan en tiempo real.';
      } else {
        root.querySelector('#zInfo').textContent = 'Tu junta aún no está vinculada a una zona. La municipalidad debe vincularla.';
      }

      const lista = S.reportsOfJunta(JID).sort((a, b) => b.createdAt - a.createdAt);
      if (!lista.length) {
        root.querySelector('#zl').innerHTML = '<p class="empty">No hay reportes en tu zona.</p>';
        return;
      }
      root.querySelector('#zl').innerHTML = '<ul class="item-list">' + lista.map(r => `<li class="item">
        <img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}">
        <div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status)}<br>
          <span class="text-muted">${U.fmtDateTime(r.createdAt)} - ${esc(S.zoneById(r.zone).name)} - ${r.thread.length} comentario(s)</span>
        </div>
        <button class="btn btn-secondary btn-sm" data-thread="${r.id}">Comentarios</button>
      </li>`).join('') + '</ul>';
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-thread]');
      if (b) abrirComentarios(b.dataset.thread);
    });
    draw();
    return { refresh: draw };
  }

  function abrirComentarios(id) {
    const body = EV.ui.openDialog('Comentarios - ' + id, '');
    function dibujar() {
      const r = S.s.reports.find(x => x.id === id);
      let hilo = '<p class="text-muted">Sin comentarios todavía.</p>';
      if (r.thread.length) {
        hilo = '<ul class="thread">' + r.thread.map(m =>
          `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`
        ).join('') + '</ul>';
      }
      body.innerHTML = `<p>${EV.ui.badge(r.status)}</p>${hilo}
        <form id="tf" class="form-group">
          <label for="tt">Responder a la municipalidad</label>
          <textarea id="tt" rows="2" maxlength="280" required></textarea>
          <button class="btn btn-primary" type="submit">Enviar</button>
        </form>`;
      body.querySelector('#tf').addEventListener('submit', e => {
        e.preventDefault();
        const texto = body.querySelector('#tt').value.trim();
        if (!texto) return;
        S.addMessage(r.thread, 'dirigente', texto);
        S.notify('municipal', 'La junta comentó en el reporte ' + r.id + '.', r.id);
        S.save();
        EV.ui.toast('Comentario enviado.', 'success');
      });
    }
    EV.ui.currentDetail = dibujar;
    dibujar();
  }

  // HU-43 Ver estado de solicitudes y HU-44 Notificar solicitud sin respuesta
  function solicitudes(root) {
    const tipos = Object.keys(S.SOL_TIPOS);
    root.innerHTML = `
      <div class="card"><h2>Nueva solicitud al municipio</h2>
        <form id="sf" novalidate>
          <div class="form-grid">
            <div class="form-group"><label for="sTipo">Tipo</label>
              <select id="sTipo">${tipos.map(k => `<option value="${k}">${S.SOL_TIPOS[k]}</option>`).join('')}</select></div>
            <div class="form-group"><label for="sAsunto">Asunto *</label>
              <input id="sAsunto" type="text" maxlength="100" aria-describedby="eAs"><p class="field-error" id="eAs" role="alert"></p></div>
          </div>
          <div class="form-group"><label for="sMsg">Mensaje</label><textarea id="sMsg" rows="2" maxlength="280"></textarea></div>
          <button class="btn btn-primary" type="submit">Enviar solicitud</button>
        </form>
      </div>
      <div class="card"><h2>Tiempo límite de respuesta</h2>
        <p class="text-muted">Si una solicitud supera este tiempo sin respuesta, recibirás una notificación de seguimiento.</p>
        <form id="lf" class="form-grid">
          ${tipos.map(k => `<div class="form-group"><label for="lim-${k}">${S.SOL_TIPOS[k]} (horas)</label><input id="lim-${k}" type="number" min="1" max="720" value="${S.s.settings.requestHours[k]}"></div>`).join('')}
          <div class="form-group"><button class="btn btn-secondary" type="submit">Guardar tiempos</button></div>
        </form>
      </div>
      <div class="card"><h2>Mis solicitudes</h2><div id="sl" aria-live="polite"></div></div>`;

    // Lógica de nueva solicitud y tiempos límite

    root.querySelector('#sf').addEventListener('submit', e => {
      e.preventDefault();
      const asunto = root.querySelector('#sAsunto').value.trim();
      const mensaje = root.querySelector('#sMsg').value.trim();
      if (!setError(root, 'eAs', asunto ? '' : 'Indica el asunto de la solicitud.')) return;
      const s = {
        id: S.nextId('SOL', 'sol'), juntaId: JID, tipo: root.querySelector('#sTipo').value, asunto: asunto,
        createdAt: Date.now(), status: 'enviada', lastChange: Date.now(), zone: zonaDeLaJunta().id, reminders: 0, thread: []
      };
      if (mensaje) S.addMessage(s.thread, 'dirigente', mensaje);
      S.s.solicitudes.push(s);
      S.notify('municipal', 'Nueva solicitud ' + s.id + ' de la ' + junta().name + ': ' + asunto + '.', s.id);
      S.save();
      EV.ui.toast('Solicitud ' + s.id + ' enviada.', 'success');
      e.target.reset();
    });

    root.querySelector('#lf').addEventListener('submit', e => {
      e.preventDefault();
      tipos.forEach(k => {
        const valor = Number(root.querySelector('#lim-' + k).value);
        if (valor >= 1) S.s.settings.requestHours[k] = valor;
      });
      checkAlerts();
      EV.ui.toast('Tiempos guardados.', 'success');
    });

    function draw() {
      const lista = S.s.solicitudes.filter(s => s.juntaId === JID).sort((a, b) => b.createdAt - a.createdAt);
      if (!lista.length) {
        root.querySelector('#sl').innerHTML = '<p class="empty">No has enviado solicitudes.</p>';
        return;
      }
      root.querySelector('#sl').innerHTML = '<ul class="item-list">' + lista.map(s => {
        const vencida = S.overdueSolicitud(s);
        return `<li class="item item--col">
          <div class="feed-header"><div><strong>${esc(s.id)}</strong> - ${esc(s.asunto)}</div><span class="badge badge--sol-${s.status}">${S.SOL_ESTADOS[s.status]}</span></div>
          <span class="text-muted">${esc(S.SOL_TIPOS[s.tipo])}. Enviada: ${U.fmtDate(s.createdAt)}. Último cambio de estado: ${U.fmtDateTime(s.lastChange)}</span>
          ${vencida ? `<p class="notice notice--warn">Sin respuesta hace ${Math.round(U.hoursSince(s.lastChange))} h (límite: ${S.s.settings.requestHours[s.tipo]} h).</p>` : ''}
          <div class="form-actions">
            <button class="btn btn-secondary btn-sm" data-sol="${s.id}">Ver hilo (${s.thread.length})</button>
            ${vencida ? `<button class="btn btn-primary btn-sm" data-remind="${s.id}">Reenviar recordatorio</button>` : ''}
          </div>
        </li>`;
      }).join('') + '</ul>';
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.sol) abrirHilo(b.dataset.sol);
      if (b.dataset.remind) remind(b.dataset.remind);
    });

    draw();
    return { refresh: draw };
  }

  function remind(id) {
    const s = S.s.solicitudes.find(x => x.id === id);
    S.addMessage(s.thread, 'dirigente', 'Recordatorio: seguimos esperando respuesta a esta solicitud.');
    s.reminders++;
    S.notify('municipal', 'Recordatorio de la ' + junta().name + ' sobre la solicitud ' + s.id + '.', s.id);
    S.save();
    EV.ui.toast('Recordatorio enviado al municipio.', 'success');
  }

  // HU-47 Responder dentro del hilo
  function abrirHilo(id) {
    const body = EV.ui.openDialog('Solicitud ' + id, '');
    function dibujar() {
      const s = S.s.solicitudes.find(x => x.id === id);
      const mensajes = s.thread.slice().sort((a, b) => a.ts - b.ts);
      let hilo = '<p class="text-muted">Sin mensajes.</p>';
      if (mensajes.length) {
        hilo = '<ul class="thread">' + mensajes.map(m =>
          `<li class="msg msg--${m.from}"><strong>${FROM[m.from]}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`
        ).join('') + '</ul>';
      }
      body.innerHTML = `<p><span class="badge badge--sol-${s.status}">${S.SOL_ESTADOS[s.status]}</span> <span class="text-muted">Último cambio: ${U.fmtDateTime(s.lastChange)}</span></p>
        <h3>${esc(s.asunto)}</h3>${hilo}
        <form id="sm" class="form-group">
          <label for="smt">Escribir en el hilo</label>
          <textarea id="smt" rows="2" maxlength="280" required></textarea>
          <button class="btn btn-primary" type="submit">Enviar</button>
        </form>`;
      body.querySelector('#sm').addEventListener('submit', e => {
        e.preventDefault();
        const texto = body.querySelector('#smt').value.trim();
        if (!texto) return;
        S.addMessage(s.thread, 'dirigente', texto);
        S.notify('municipal', 'Nuevo mensaje de la junta en la solicitud ' + s.id + '.', s.id);
        S.save();
      });
    }
    EV.ui.currentDetail = dibujar;
    dibujar();
  }

  return {
    checkAlerts: checkAlerts,
    remind: remind,
    tabs: [
      { id: 'faenas', icon: '../assets/faena.svg', label: 'Faenas', render: faenas },
      { id: 'evidencia', icon: '../assets/camara.svg', label: 'Casos', render: evidencia },
      { id: 'zona', icon: '../assets/cercaMio.svg', label: 'Mi zona', render: zona },
      { id: 'solicitudes', icon: '../assets/solicitud.svg', label: 'Solicitudes', render: solicitudes }
    ]
  };
})();
