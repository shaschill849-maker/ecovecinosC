EV.views.municipal = (function () {
  const S = EV.store;
  const U = EV.util;
  const esc = U.esc;
  const QUIEN = 'Personal municipal (demo)';
  const FROM = { vecino: 'Vecino', municipal: 'Tú (municipalidad)', dirigente: 'Junta vecinal' };

  // HU-20 Alertar reporte atrasado al ingresar
  function checkAlerts() {
    const atrasados = S.s.reports.filter(r => S.isOverdue(r));
    S.quitarAvisos('atrasados');
    if (atrasados.length) {
      S.notify('municipal', atrasados.length + ' reporte(s) superaron el tiempo límite sin atenderse. Revisa el panel.', null, null, 'atrasados');
    }
    S.save();
  }

  function openReport(id) {
    const r0 = S.s.reports.find(x => x.id === id);
    const body = EV.ui.openDialog('Reporte ' + r0.id, '');
    let cam = null;
    let fotoDespues = null;
    const abiertos = { evidencia: true, prioridad: false, grupo: true, comentarios: false };

    function seccion(clave, titulo, contenido) {
      return `<details class="seccion" data-sec="${clave}" ${abiertos[clave] ? 'open' : ''}>
        <summary>${titulo}</summary>
        <div class="seccion-body">${contenido}</div>
      </details>`;
    }

    function draw() {
      const r = S.s.reports.find(x => x.id === id);
      const p = S.priority(r);
      const grupo = S.clusters()[r.id];
      const zona = S.zoneById(r.zone);
      const junta = S.juntaOfZone(r.zone);
      const despues = r.after;
      const puedeCerrar = r.status !== 'resolved' && despues && despues.status === 'approved';
      const faltaFoto = r.status !== 'resolved' && (!despues || despues.status === 'rejected');

      let origen = 'Vecino registrado';
      if (r.source === 'junta') origen = 'Escalado por una junta';
      else if (r.reserved) origen = 'Vecino (identidad reservada)';

      let fotoDespuesHtml = '<div class="placeholder-box">Aún no hay foto de "después".</div>';
      if (despues) {
        let estadoFoto = 'Por validar';
        if (despues.status === 'approved') estadoFoto = 'Aprobada';
        if (despues.status === 'rejected') estadoFoto = 'Rechazada';
        fotoDespuesHtml = `<figure><img src="${despues.photo.dataUrl}" alt="Foto de después"><figcaption>Después - ${U.fmtDateTime(despues.photo.ts)} - ${estadoFoto}</figcaption></figure>`;
      }

      let grupoHtml = '';
      if ((grupo && grupo.members.length > 1) || r.supporters.length) {
        const personas = grupo ? grupo.people : 1 + r.supporters.length;
        const ids = grupo && grupo.members.length > 1 ? ' (' + grupo.members.map(m => esc(m.id)).join(', ') + ')' : '';
        grupoHtml = seccion('grupo', 'Punto crítico agrupado', `<p><strong>${personas} vecino(s)</strong> reportaron este punto${ids}. Al resolverlo, todos los reportes asociados cambian de estado.</p>`);
      }

      let comentarios = '<p class="text-muted">Sin comentarios.</p>';
      if (r.thread.length) {
        comentarios = '<ul class="thread">' + r.thread.map(m =>
          `<li class="msg msg--${m.from}"><strong>${FROM[m.from] || m.from}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`
        ).join('') + '</ul>';
      }

      const evidencia = `
        <div class="before-after">
          <figure><img src="${r.photo.dataUrl}" alt="Foto de antes"><figcaption>Antes - ${U.fmtDateTime(r.photo.ts)}</figcaption></figure>
          ${fotoDespuesHtml}
        </div>
        ${despues && despues.status === 'rejected' ? `<p class="notice notice--warn">Evidencia rechazada: ${esc(despues.note)}. Se solicitó una nueva foto a la cuadrilla.</p>` : ''}
        ${despues && despues.status === 'pending' ? `<div class="form-group">
            <label for="rejNote">Motivo (obligatorio si rechazas)</label>
            <input id="rejNote" type="text" maxlength="120" aria-describedby="rejErr">
            <p class="field-error" id="rejErr" role="alert"></p>
            <div class="form-actions">
              <button class="btn btn-primary" data-act="approve">Aprobar evidencia</button>
              <button class="btn btn-secondary" data-act="reject">Rechazar y pedir nueva foto</button>
            </div>
          </div>` : ''}
        ${faltaFoto ? `<div class="card card--inner"><h4>Cuadrilla: subir foto de "después"</h4>
            <p class="text-muted">Solo se admite una foto tomada con la cámara en el momento, con fecha, hora y ubicación.</p>
            <div id="aCam"></div>
            <button class="btn btn-primary" data-act="upload" id="upBtn" disabled>Subir foto de después</button>
          </div>` : ''}
        <div class="form-actions">
          <button class="btn btn-primary" data-act="resolve" ${puedeCerrar ? '' : 'disabled aria-describedby="rHint"'}>Marcar como resuelto</button>
          ${r.status === 'pending' ? '<button class="btn btn-secondary" data-act="start">Iniciar atención</button>' : ''}
        </div>
        ${puedeCerrar || r.status === 'resolved' ? '' : '<p class="text-muted" id="rHint">Se habilita solo con una foto de "después" aprobada.</p>'}
        ${r.status === 'resolved' ? `<p class="status-text">Resuelto el ${U.fmtDateTime(r.closedAt)}. Validado por ${esc(r.closedBy)}.</p>` : ''}`;

      // HU-21 Ver los factores de la prioridad y ajustarla con motivo
      const prioridad = `
        <p class="status-text">Puntaje sugerido: ${p.score}/100 (${p.level})</p>
        <div class="table-wrap"><table class="table">
          <caption class="sr-only">Factores del puntaje de prioridad</caption>
          <thead><tr><th scope="col">Factor</th><th scope="col">Puntos</th><th scope="col">Por qué</th></tr></thead>
          <tbody>${p.factors.map(f => `<tr><th scope="row">${f.name}</th><td>${f.pts}/${f.max}</td><td>${esc(f.note)}</td></tr>`).join('')}</tbody>
        </table></div>
        ${r.override ? `<p class="notice notice--soft">Ajuste manual a "${r.override.level}": ${esc(r.override.reason)} <span class="text-muted">(${esc(r.override.by)}, ${U.fmtDateTime(r.override.ts)})</span>
          <button class="btn btn-ghost btn-sm" data-act="clearov">Quitar ajuste</button></p>` : ''}
        <form id="ovf" class="form-grid" novalidate>
          <div class="form-group"><label for="ovl">Prioridad manual</label>
            <select id="ovl"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
          <div class="form-group"><label for="ovr">Motivo (queda registrado) *</label>
            <input id="ovr" type="text" maxlength="120" aria-describedby="ovErr">
            <p class="field-error" id="ovErr" role="alert"></p></div>
          <div class="form-group"><button class="btn btn-secondary" type="submit">Aplicar</button></div>
        </form>`;

      const conversacion = `${comentarios}
        <form id="rf" class="form-group">
          <label for="rt">Responder</label>
          <textarea id="rt" rows="2" maxlength="280"></textarea>
          <div class="form-actions"><button class="btn btn-secondary" type="submit">Enviar respuesta</button></div>
        </form>`;

      body.innerHTML = `
        <div class="badges">${EV.ui.badge(r.status)}
          ${S.isOverdue(r) ? '<span class="badge badge--late">Atrasado</span>' : ''}
        </div>
        <p>${EV.ui.prioridad(p, r.override)}</p>
        <dl class="dl">
          <dt>Zona</dt><dd>${esc(zona.name)}, ${esc(junta ? junta.name : 'sin junta')}</dd>
          <dt>Ubicación</dt><dd>${U.fmtCoords(r.lat, r.lng)}</dd>
          <dt>Enviado</dt><dd>${U.fmtDateTime(r.createdAt)} - ${origen}</dd>
        </dl>
        ${seccion('evidencia', 'Evidencia y cierre', evidencia)}
        ${seccion('prioridad', 'Prioridad', prioridad)}
        ${grupoHtml}
        ${seccion('comentarios', 'Comentarios para la junta (' + r.thread.length + ')', conversacion)}`;

      body.querySelectorAll('details[data-sec]').forEach(d => {
        d.addEventListener('toggle', () => { abiertos[d.dataset.sec] = d.open; });
      });

      if (cam) {
        cam.destroy();
        cam = null;
      }
      EV.ui.currentCleanup = () => { if (cam) cam.destroy(); };
      if (faltaFoto) {
        cam = EV.camera.mount(body.querySelector('#aCam'), {
          onChange: foto => {
            fotoDespues = foto;
            body.querySelector('#upBtn').disabled = !foto;
          }
        });
      }

      body.querySelector('#ovf').addEventListener('submit', e => {
        e.preventDefault();
        const motivo = body.querySelector('#ovr').value.trim();
        if (!EV.ui.setError(body, 'ovErr', motivo ? '' : 'Indica el motivo del ajuste.')) return;
        r.override = { level: body.querySelector('#ovl').value, reason: motivo, ts: Date.now(), by: QUIEN };
        S.save();
        EV.ui.toast('Prioridad ajustada; el motivo quedó registrado.', 'success');
      });

      body.querySelector('#rf').addEventListener('submit', e => {
        e.preventDefault();
        const texto = body.querySelector('#rt').value.trim();
        if (!texto) return;
        S.addMessage(r.thread, 'municipal', texto);
        S.notify('dirigente', 'La municipalidad respondió en el reporte ' + r.id + '.', r.id);
        S.save();
        EV.ui.toast('Respuesta enviada a la junta.', 'success');
      });

      body.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (b && !b.disabled) accion(b.dataset.act, r);
      };
    }

    function miembros(r) {
      const grupo = S.clusters()[r.id];
      return grupo ? grupo.members : [r];
    }

    function avisarVecino(lista, texto, foto) {
      const esDelVecino = lista.some(m => m.reporterId === S.USER || m.supporters.includes(S.USER));
      if (esDelVecino) S.notify('vecino', texto, lista[0].id, foto);
    }

    function accion(tipo, r) {
      if (tipo === 'start') {
        miembros(r).forEach(m => { m.status = 'active'; });
        avisarVecino(miembros(r), 'Tu reporte ' + r.id + ' ahora está en atención.');
        S.save();
        EV.ui.toast('Reporte(s) en atención.', 'success');
      }

      // HU-25 Subir foto de "después"
      if (tipo === 'upload' && fotoDespues) {
        r.after = { photo: fotoDespues, status: 'pending', note: '', ts: Date.now() };
        if (r.status === 'pending') miembros(r).forEach(m => { m.status = 'active'; });
        S.save();
        EV.ui.toast('Foto de "después" subida. Falta validarla.', 'success');
      }

      // HU-26 Comparar fotos antes/después
      if (tipo === 'approve') {
        r.after.status = 'approved';
        S.save();
        EV.ui.toast('Evidencia aprobada. Ya puedes marcar como resuelto.', 'success');
      }
      if (tipo === 'reject') {
        const motivo = body.querySelector('#rejNote').value.trim();
        if (!EV.ui.setError(body, 'rejErr', motivo ? '' : 'Indica por qué rechazas la evidencia.')) return;
        EV.ui.confirmar('¿Rechazar la evidencia y pedir una nueva foto a la cuadrilla?', 'Sí, rechazar', () => {
          r.after.status = 'rejected';
          r.after.note = motivo;
          S.notify('municipal', 'Se solicitó una nueva foto de "después" a la cuadrilla para ' + r.id + '.', r.id);
          S.save();
          EV.ui.toast('Evidencia rechazada; se solicitó una nueva foto.', 'warn');
        });
      }

      if (tipo === 'clearov') {
        r.override = null;
        S.save();
      }

      // HU-27 Marcar reporte como resuelto
      if (tipo === 'resolve') {
        if (!(r.after && r.after.status === 'approved')) return;
        const lista = miembros(r);
        const ahora = Date.now();
        lista.forEach(m => {
          m.status = 'resolved';
          m.closedAt = ahora;
          m.closedBy = QUIEN;
          if (m !== r) m.after = Object.assign({}, r.after);
        });
        avisarVecino(lista, 'Tu reporte ' + r.id + ' fue resuelto. Esta es la evidencia de la limpieza.', r.after.photo.dataUrl);
        S.save();
        if (lista.length > 1) EV.ui.toast('Resuelto: se cerraron ' + lista.length + ' reportes del mismo punto.', 'success');
        else EV.ui.toast('Resuelto.', 'success');
      }
    }

    EV.ui.currentDetail = draw;
    draw();
  }

  // HU-17 Ver reportes de la jurisdicción y HU-18 Filtrar reportes por zona, fecha y estado
  function panel(root) {
    const filtros = S.s.filters;
    const opcionesZona = S.ZONES.map(z => `<option value="${z.id}">${esc(z.name)}</option>`).join('');
    root.innerHTML = `<div class="card"><h2>Panel de reportes de la jurisdicción</h2>
      <p class="text-muted">${esc(S.MUNI)}. Todos los reportes llegan aquí directamente, sin pasar por el filtro de otra área.</p>
      <div id="alerts" aria-live="polite"></div>
      <div id="kpis" class="kpis"></div>
      <form id="flt" class="form-grid" aria-label="Filtros del panel">
        <div class="form-group"><label for="fz">Zona</label><select id="fz"><option value="all">Todas</option>${opcionesZona}</select></div>
        <div class="form-group"><label for="fd">Desde</label><input id="fd" type="date"></div>
        <div class="form-group"><label for="fh">Hasta</label><input id="fh" type="date"></div>
        <div class="form-group"><label for="fe">Estado</label>
          <select id="fe">
            <option value="all">Activos (sin resueltos)</option>
            <option value="pending">Pendiente</option>
            <option value="active">En atención</option>
            <option value="resolved">Resuelto</option>
            <option value="todos">Todos, incluidos resueltos</option>
          </select></div>
        <div class="form-group"><label for="fo">
          <select id="fo">
            <option value="prioridad">Prioridad (mayor primero)</option>
            <option value="recientes">Más recientes</option>
          </select></div>
        <div class="form-group"><button type="button" class="btn btn-secondary" id="fclear">Limpiar filtros</button></div>
      </form>
      <div class="panel-grid">
        <div id="pMap" class="map" role="region" aria-label="Mapa de reportes de la jurisdicción"></div>
        <div id="pList" aria-live="polite"></div>
      </div>
    </div>`;

    const $ = selector => root.querySelector(selector);
    const mapa = EV.map.create('pMap', { lat: -12.045, lng: -77.03 }, 13);
    const campos = { fz: 'zona', fd: 'desde', fh: 'hasta', fe: 'estado', fo: 'orden' };

    Object.keys(campos).forEach(idCampo => {
      const clave = campos[idCampo];
      $('#' + idCampo).value = filtros[clave];
      $('#' + idCampo).addEventListener('change', e => {
        S.s.filters[clave] = e.target.value;
        S.save();
      });
    });

    $('#fclear').addEventListener('click', () => {
      S.s.filters.zona = 'all';
      S.s.filters.desde = '';
      S.s.filters.hasta = '';
      S.s.filters.estado = 'all';
      S.s.filters.orden = 'prioridad';
      Object.keys(campos).forEach(idCampo => { $('#' + idCampo).value = S.s.filters[campos[idCampo]]; });
      EV.selector.sincronizarTodos(root);
      S.save();
    });

    let primeraVez = true;
    let anteriores = {};
    let saliendo = false;
    const dialogo = document.getElementById('dialog');

    function estadoActual(id) {
      const r = S.s.reports.find(x => x.id === id);
      return r ? r.status : null;
    }

    function animarSalida(ids) {
      saliendo = true;
      const tarjetas = ids
        .map(id => $('#pList [data-open="' + id + '"]'))
        .filter(b => b)
        .map(b => b.closest('li'));
      let faltan = tarjetas.length;
      const terminar = () => {
        saliendo = false;
        ids.forEach(id => delete anteriores[id]);
        draw();
      };
      if (!faltan) {
        terminar();
        return;
      }
      tarjetas.forEach(li => {
        const alto = li.offsetHeight;
        li.style.overflow = 'hidden';
        const desliza = li.animate(
          [{ transform: 'none', opacity: 1 }, { transform: 'translateX(110%)', opacity: 0 }],
          { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
        );
        desliza.onfinish = () => {
          const cierra = li.animate(
            [
              { height: alto + 'px', paddingTop: getComputedStyle(li).paddingTop, paddingBottom: getComputedStyle(li).paddingBottom, marginBottom: getComputedStyle(li).marginBottom },
              { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginBottom: '0px', borderWidth: '0px' }
            ],
            { duration: 280, easing: 'ease', fill: 'forwards' }
          );
          cierra.onfinish = () => {
            faltan--;
            if (faltan === 0) terminar();
          };
        };
      });
    }

    function draw() {
      if (saliendo) return;
      const f = S.s.filters;
      const todos = S.s.reports;
      const desde = f.desde ? new Date(f.desde + 'T00:00:00').getTime() : -Infinity;
      const hasta = f.hasta ? new Date(f.hasta + 'T23:59:59').getTime() : Infinity;

      let lista = todos.filter(r =>
        (f.zona === 'all' || r.zone === f.zona) &&
        (f.estado === 'todos' || (f.estado === 'all' ? r.status !== 'resolved' : r.status === f.estado)) &&
        r.createdAt >= desde && r.createdAt <= hasta
      );
      lista = lista.map(r => ({ r: r, p: S.priority(r) }));
      if (f.orden === 'prioridad') {
        lista.sort((a, b) => (b.p.effScore - a.p.effScore) || (a.r.createdAt - b.r.createdAt));
      } else {
        lista.sort((a, b) => b.r.createdAt - a.r.createdAt);
      }

      const ids = lista.map(x => x.r.id);
      const recienResueltos = Object.keys(anteriores).filter(id =>
        anteriores[id] !== 'resolved' && !ids.includes(id) && estadoActual(id) === 'resolved'
      );
      if (recienResueltos.length && EV.ui.isDialogOpen()) {
        recienResueltos.forEach(id => {
          const r = S.s.reports.find(x => x.id === id);
          lista.push({ r: r, p: S.priority(r) });
        });
      } else if (recienResueltos.length && !EV.ui.movimientoReducido()) {
        animarSalida(recienResueltos);
        return;
      }
      const nuevos = {};
      lista.forEach(x => {
        nuevos[x.r.id] = recienResueltos.includes(x.r.id) ? anteriores[x.r.id] : x.r.status;
      });
      anteriores = nuevos;

      const atrasados = todos.filter(r => S.isOverdue(r));
      if (atrasados.length) {
        $('#alerts').innerHTML = `<p class="notice notice--warn" role="alert"><strong>${atrasados.length} reporte(s) atrasado(s)</strong> superaron el tiempo límite sin atenderse: ${atrasados.map(r => esc(r.id)).join(', ')}.</p>`;
      } else {
        $('#alerts').innerHTML = '';
      }

      const indicadores = [
        ['Total', todos.length],
        ['Pendientes', todos.filter(r => r.status === 'pending').length],
        ['En atención', todos.filter(r => r.status === 'active').length],
        ['Resueltos', todos.filter(r => r.status === 'resolved').length]
      ];
      $('#kpis').innerHTML = indicadores.map(k => `<div class="kpi"><span class="kpi-n">${k[1]}</span><span class="kpi-l">${k[0]}</span></div>`).join('');

      if (mapa) {
        mapa.setMarkers(lista.map(x => x.r), openReport);
        if (primeraVez && lista.length) {
          mapa.fit(lista.map(x => x.r));
          primeraVez = false;
        }
      }

      const posiciones = {};
      $('#pList').querySelectorAll('[data-open]').forEach(boton => {
        posiciones[boton.dataset.open] = boton.closest('li').getBoundingClientRect().top;
      });
      if (lista.length) {
        const grupos = S.clusters();
        $('#pList').innerHTML = `<p class="status-text">${lista.length} reporte(s) con los filtros aplicados.</p><ul class="item-list">` + lista.map(x => {
          const r = x.r;
          const grupo = grupos[r.id];
          return `<li class="item">
            <img class="thumb" src="${r.photo.dataUrl}" alt="Foto del reporte ${esc(r.id)}">
            <div class="item-main"><strong>${esc(r.id)}</strong> ${EV.ui.badge(r.status)}
              ${S.isOverdue(r) ? '<span class="badge badge--late">Atrasado</span>' : ''}<br>
              ${EV.ui.prioridad(x.p, r.override)}<br>
              <span class="text-muted">${U.fmtDateTime(r.createdAt)} - ${esc(S.zoneById(r.zone).name)}${grupo && grupo.people > 1 ? ' - ' + grupo.people + ' vecinos reportaron este punto' : ''}</span>
            </div>
            <button class="btn btn-secondary btn-sm" data-open="${r.id}">Ver detalle</button>
          </li>`;
        }).join('') + '</ul>';
      } else {
        $('#pList').innerHTML = '<p class="empty">No hay reportes con estos filtros.</p>';
      }

      if (!EV.ui.movimientoReducido()) {
        $('#pList').querySelectorAll('[data-open]').forEach(boton => {
          const antes = posiciones[boton.dataset.open];
          if (antes === undefined) return;
          const li = boton.closest('li');
          const distancia = antes - li.getBoundingClientRect().top;
          if (Math.abs(distancia) < 2) return;
          li.animate(
            [{ transform: 'translateY(' + distancia + 'px)' }, { transform: 'none' }],
            { duration: 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
        });
      }
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b) openReport(b.dataset.open);
    });
    draw();
    return { refresh: draw, destroy: () => { if (mapa) mapa.destroy(); } };
  }

  // HU-29 Compartir estado con la junta y HU-20 configurar el tiempo límite
  function zonas(root) {
    const filas = S.ZONES.map(z => {
      const opciones = S.JUNTAS.map(j => `<option value="${j.id}" ${S.s.settings.zoneJunta[z.id] === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('');
      return `<tr>
        <th scope="row" data-label="Zona"><label for="zj-${z.id}">${esc(z.name)}</label></th>
        <td data-label="Junta vecinal"><select id="zj-${z.id}" data-zone="${z.id}">${opciones}</select></td>
      </tr>`;
    }).join('');

    const plazos = ['Alta', 'Media', 'Baja'].map(k => `<div class="form-group">
      <label for="ov-${k}">Prioridad ${k} (horas)</label>
      <input id="ov-${k}" type="number" min="1" max="720" value="${S.s.settings.overdueHours[k]}">
    </div>`).join('');

    root.innerHTML = `<div class="card"><h2>Zonas y juntas vecinales</h2>
        <p class="text-muted">Vincula cada zona con su junta: la junta verá el estado de los reportes de su zona, sin poder editarlos.</p>
        <div class="table-wrap"><table class="table table--cards">
          <caption class="sr-only">Vinculación de zonas con juntas vecinales</caption>
          <thead><tr><th scope="col">Zona</th><th scope="col">Junta vecinal</th></tr></thead>
          <tbody>${filas}</tbody>
        </table></div>
      </div>
      <div class="card"><h2>Tiempo límite sin atender</h2>
        <p class="text-muted">Pasado este tiempo, el reporte se marca como atrasado y se genera una alerta.</p>
        <form id="lim" class="form-grid">${plazos}
          <div class="form-group"><button class="btn btn-primary" type="submit">Guardar plazos</button></div>
        </form>
      </div>`;

    root.addEventListener('change', e => {
      const select = e.target.closest('[data-zone]');
      if (!select) return;
      S.s.settings.zoneJunta[select.dataset.zone] = select.value;
      S.save();
      EV.ui.toast(S.zoneById(select.dataset.zone).name + ' vinculada a ' + S.juntaById(select.value).name + '.', 'success');
    });

    root.querySelector('#lim').addEventListener('submit', e => {
      e.preventDefault();
      ['Alta', 'Media', 'Baja'].forEach(k => {
        const valor = Number(root.querySelector('#ov-' + k).value);
        if (valor >= 1) S.s.settings.overdueHours[k] = valor;
      });
      checkAlerts();
      EV.ui.toast('Plazos guardados.', 'success');
    });
    return {};
  }

  // HU-43 Ver estado de solicitudes y HU-47 Responder dentro del hilo
  function solicitudes(root) {
    root.innerHTML = '<div class="card"><h2>Solicitudes de las juntas vecinales</h2><div id="sl" aria-live="polite"></div></div>';

    function draw() {
      const lista = S.s.solicitudes.slice().sort((a, b) => b.createdAt - a.createdAt);
      if (!lista.length) {
        root.querySelector('#sl').innerHTML = '<p class="empty">No hay solicitudes.</p>';
        return;
      }
      root.querySelector('#sl').innerHTML = '<ul class="item-list">' + lista.map(s => {
        const opciones = Object.keys(S.SOL_ESTADOS).map(k => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${S.SOL_ESTADOS[k]}</option>`).join('');
        return `<li class="item item--col">
          <div class="feed-header">
            <div><strong>${esc(s.id)}</strong> - ${esc(s.asunto)}<br>
              <span class="text-muted">${esc(S.juntaById(s.juntaId).name)} - ${U.fmtDateTime(s.createdAt)}${S.overdueSolicitud(s) ? ' - Sin respuesta a tiempo' : ''}</span>
            </div>
            <div class="form-row"><label for="st-${s.id}">Estado</label><select id="st-${s.id}" data-sol="${s.id}">${opciones}</select></div>
          </div>
          <button class="btn btn-secondary btn-sm" data-thread="${s.id}">Ver hilo y responder (${s.thread.length})</button>
        </li>`;
      }).join('') + '</ul>';
    }

    root.addEventListener('change', e => {
      const select = e.target.closest('[data-sol]');
      if (!select) return;
      const s = S.s.solicitudes.find(x => x.id === select.dataset.sol);
      s.status = select.value;
      s.lastChange = Date.now();
      S.notify('dirigente', 'La solicitud ' + s.id + ' cambió a "' + S.SOL_ESTADOS[s.status] + '".', s.id);
      S.save();
      EV.ui.toast('Estado actualizado.', 'success');
    });

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-thread]');
      if (b) abrirHilo(b.dataset.thread);
    });

    function abrirHilo(id) {
      const body = EV.ui.openDialog('Solicitud ' + id, '');
      function d() {
        const s = S.s.solicitudes.find(x => x.id === id);
        const mensajes = s.thread.slice().sort((a, b) => a.ts - b.ts);
        let hilo = '<p class="text-muted">Sin mensajes.</p>';
        if (mensajes.length) {
          hilo = '<ul class="thread">' + mensajes.map(m => {
            const autor = m.from === 'municipal' ? 'Tú (municipalidad)' : 'Junta vecinal';
            return `<li class="msg msg--${m.from}"><strong>${autor}</strong> <span class="text-muted">${U.fmtDateTime(m.ts)}</span><br>${esc(m.text)}</li>`;
          }).join('') + '</ul>';
        }
        body.innerHTML = `<h3>${esc(s.asunto)}</h3>${hilo}
          <form id="mr" class="form-group">
            <label for="mrt">Responder dentro del hilo</label>
            <textarea id="mrt" rows="2" maxlength="280" required></textarea>
            <button class="btn btn-primary" type="submit">Enviar respuesta</button>
          </form>`;
        body.querySelector('#mr').addEventListener('submit', e => {
          e.preventDefault();
          const texto = body.querySelector('#mrt').value.trim();
          if (!texto) return;
          S.addMessage(s.thread, 'municipal', texto);
          if (s.status === 'enviada') {
            s.status = 'revision';
            s.lastChange = Date.now();
          }
          S.notify('dirigente', 'Respuesta nueva del municipio en la solicitud ' + s.id + '.', s.id);
          S.save();
          EV.ui.toast('Respuesta enviada.', 'success');
        });
      }
      EV.ui.currentDetail = d;
      d();
    }

    draw();
    return { refresh: draw };
  }

  return {
    checkAlerts: checkAlerts,
    tabs: [
      { id: 'panel', icon: '../assets/panel.svg', label: 'Panel', render: panel },
      { id: 'zonas', icon: '../assets/zonas.svg', label: 'Zonas', render: zonas },
      { id: 'solicitudes', icon: '../assets/solicitud.svg', label: 'Solicitudes', render: solicitudes }
    ]
  };
})();
