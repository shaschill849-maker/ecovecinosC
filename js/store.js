EV.store = (function () {
  const KEY = 'ecovecinos.v3';

  const ZONES = [
    { id: 'z1', name: 'Cercado - Barrios Altos', lat: -12.0464, lng: -77.0306, density: 3 },
    { id: 'z2', name: 'Rímac - Alameda', lat: -12.0300, lng: -77.0400, density: 2 },
    { id: 'z3', name: 'La Victoria - Gamarra', lat: -12.0650, lng: -77.0150, density: 1 }
  ];
  const JUNTAS = [
    { id: 'j1', name: 'Junta Vecinal Barrios Altos' },
    { id: 'j2', name: 'Junta Vecinal Alameda' },
    { id: 'j3', name: 'Junta Vecinal Gamarra' }
  ];
  const MUNI = 'Municipalidad (demo)';
  const TIPOS = {
    domiciliario: { label: 'Residuos domiciliarios', risk: 2 },
    desmonte: { label: 'Desmonte o escombros', risk: 1 },
    organico: { label: 'Residuos orgánicos (malos olores)', risk: 3 },
    peligroso: { label: 'Residuos peligrosos o médicos', risk: 3 }
  };
  const TAMANOS = {
    pequeno: { label: 'Pequeño (una bolsa o poco más)', v: 1 },
    mediano: { label: 'Mediano (varias bolsas)', v: 2 },
    grande: { label: 'Grande (ocupa la vereda o pista)', v: 3 }
  };
  const FASES = ['Sensibilización', 'Cartelería', 'Evidencia', 'Denuncia al municipio'];
  const SOL_TIPOS = { limpieza: 'Limpieza de punto crítico', carteleria: 'Cartelería o señalización', otro: 'Otro' };
  const SOL_ESTADOS = { enviada: 'Enviada', revision: 'En revisión', atendida: 'Atendida' };
  const CLUSTER_RADIUS = 50;
  const USER = 'vecino-demo';

  let state = load();

  function load() {
    try {
      const guardado = localStorage.getItem(KEY);
      if (guardado) return JSON.parse(guardado);
    } catch (e) {
      console.log('No se pudieron leer los datos guardados');
    }
    return seed();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      EV.ui.toast('No se pudo guardar: el almacenamiento del navegador está lleno. Usa "Restablecer datos de demostración".', 'error');
      return false;
    }
    document.dispatchEvent(new CustomEvent('ev:data'));
    return true;
  }

  window.addEventListener('storage', e => {
    if (e.key === KEY) {
      state = load();
      document.dispatchEvent(new CustomEvent('ev:data'));
    }
  });

  function nextId(prefijo, clave) {
    state.seq[clave] = (state.seq[clave] || 0) + 1;
    return prefijo + '-' + String(state.seq[clave]).padStart(4, '0');
  }

  function seed() {
    const now = Date.now();
    const hace = tiempo => now - tiempo;
    const foto = (titulo, color, ts, lat, lng) => {
      const texto = new Date(ts).toLocaleDateString('es-PE') + ' - ' + EV.util.fmtCoords(lat, lng);
      return { dataUrl: EV.camera.placeholder(titulo, color, texto), ts: ts, lat: lat, lng: lng, source: 'demo' };
    };
    const reporte = (n, datos) => Object.assign({
      id: 'REP-' + String(n).padStart(4, '0'), source: 'vecino', reserved: false, reporterId: 'otro', supporters: [],
      thread: [], after: null, override: null, closedAt: null, closedBy: null, tipo: null, tamano: null
    }, datos);

    const reports = [
      reporte(1, {
        createdAt: hace(3 * DIA), zone: 'z1', lat: -12.0468, lng: -77.0310, tipo: 'organico', tamano: 'grande', status: 'pending', supporters: ['otro2'],
        photo: foto('Basura acumulada', '#7a5c3e', hace(3 * DIA), -12.0468, -77.0310)
      }),
      reporte(2, {
        createdAt: hace(1.2 * DIA), zone: 'z1', lat: -12.04695, lng: -77.03115, tipo: 'domiciliario', tamano: 'mediano', status: 'pending',
        photo: foto('Bolsas en la vereda', '#6b6f4a', hace(1.2 * DIA), -12.04695, -77.03115)
      }),
      reporte(3, {
        createdAt: hace(5 * DIA), zone: 'z2', lat: -12.0302, lng: -77.0405, tipo: 'desmonte', tamano: 'pequeno', status: 'active',
        photo: foto('Desmonte', '#6a6a6a', hace(5 * DIA), -12.0302, -77.0405),
        thread: [{ id: 'm1', from: 'municipal', text: 'Cuadrilla programada para esta semana.', ts: hace(2 * DIA) }]
      }),
      reporte(4, {
        createdAt: hace(8 * DIA), zone: 'z3', lat: -12.0652, lng: -77.0148, tipo: 'domiciliario', tamano: 'mediano', status: 'resolved',
        photo: foto('Antes', '#7a5c3e', hace(8 * DIA), -12.0652, -77.0148),
        after: { photo: foto('Después: limpio', '#2f7d4f', hace(6 * DIA), -12.0652, -77.0148), status: 'approved', note: '', ts: hace(6 * DIA) },
        closedAt: hace(6 * DIA), closedBy: 'Personal municipal (demo)'
      }),
      reporte(5, {
        createdAt: hace(6 * HORA), zone: 'z1', lat: -12.0440, lng: -77.0270, tipo: 'domiciliario', tamano: 'mediano', status: 'pending', reporterId: USER,
        photo: foto('Mi reporte reciente', '#6b6f4a', hace(6 * HORA), -12.0440, -77.0270)
      }),
      reporte(6, {
        createdAt: hace(10 * DIA), zone: 'z1', lat: -12.0450, lng: -77.0290, tipo: 'desmonte', tamano: 'pequeno', status: 'resolved', reporterId: USER, reserved: true,
        photo: foto('Antes', '#6a6a6a', hace(10 * DIA), -12.0450, -77.0290),
        after: { photo: foto('Después: limpio', '#2f7d4f', hace(8 * DIA), -12.0450, -77.0290), status: 'approved', note: '', ts: hace(8 * DIA) },
        closedAt: hace(8 * DIA), closedBy: 'Personal municipal (demo)'
      }),
      reporte(7, {
        createdAt: hace(4 * DIA), zone: 'z2', lat: -12.0285, lng: -77.0420, tipo: 'peligroso', tamano: 'grande', status: 'pending', source: 'junta',
        photo: foto('Residuos peligrosos', '#8a3b3b', hace(4 * DIA), -12.0285, -77.0420)
      })
    ];

    const ymd = EV.util.isoFromOffset;
    const pronto = new Date(now + 10 * HORA);
    const yo = { id: USER, name: 'Tú (vecino demo)', attended: null };

    const faenas = [
      {
        id: 'FAE-0001', organizer: 'junta', organizerName: 'Junta Vecinal Barrios Altos', juntaId: 'j1', zone: 'z1', date: ymd(-3), time: '08:00',
        place: 'Jr. Ancash cdra. 4', lat: -12.0460, lng: -77.0300, desc: 'Limpieza del punto crítico junto al mercado.', implementos: true,
        insumosJunta: 'Guantes y bolsas', insumosVecinos: 'Escobas y agua', cancelled: false, invited: 40, attendanceSaved: false,
        inscritos: [
          { id: 'v-rosa', name: 'Rosa M.', attended: null },
          { id: 'v-carlos', name: 'Carlos P.', attended: null },
          { id: 'v-lucila', name: 'Lucila H.', attended: null },
          Object.assign({}, yo)
        ]
      },
      {
        id: 'FAE-0002', organizer: 'municipio', organizerName: MUNI, juntaId: null, zone: 'z2', date: ymd(4), time: '09:00',
        place: 'Alameda Los Descalzos', lat: -12.0300, lng: -77.0400, desc: 'Faena municipal con apoyo de la cuadrilla.', implementos: true,
        insumosJunta: 'Guantes, bolsas y mascarillas', insumosVecinos: '', cancelled: false, invited: 0, attendanceSaved: false,
        inscritos: [{ id: 'v-ana', name: 'Ana T.', attended: null }]
      },
      {
        id: 'FAE-0003', organizer: 'junta', organizerName: 'Junta Vecinal Barrios Altos', juntaId: 'j1', zone: 'z1', date: ymd(9), time: '07:30',
        place: 'Parque Neptuno', lat: -12.0455, lng: -77.0320, desc: 'Jornada de limpieza y pintado de muros.', implementos: false,
        insumosJunta: 'Bolsas', insumosVecinos: 'Guantes, escobas y recogedores', cancelled: false, invited: 0, attendanceSaved: false, inscritos: []
      },
      {
        id: 'FAE-0004', organizer: 'junta', organizerName: 'Junta Vecinal Barrios Altos', juntaId: 'j1', zone: 'z1',
        date: EV.util.fechaISO(pronto), time: EV.util.horaTexto(pronto),
        place: 'Pasaje Huanta', lat: -12.0472, lng: -77.0295, desc: 'Recojo de desmonte en el pasaje.', implementos: true,
        insumosJunta: 'Bolsas y guantes', insumosVecinos: 'Recogedores', cancelled: false, invited: 0, attendanceSaved: false,
        inscritos: [Object.assign({}, yo)]
      }
    ];

    const solicitudes = [
      {
        id: 'SOL-0001', juntaId: 'j1', tipo: 'limpieza', asunto: 'Limpieza del punto crítico en Jr. Ancash', createdAt: hace(5 * DIA), status: 'enviada',
        lastChange: hace(5 * DIA), zone: 'z1', reminders: 0,
        thread: [{ id: 's1', from: 'dirigente', text: 'Solicitamos limpieza urgente del punto frente al mercado.', ts: hace(5 * DIA) }]
      },
      {
        id: 'SOL-0002', juntaId: 'j1', tipo: 'carteleria', asunto: 'Cartel de prohibido arrojar basura', createdAt: hace(2 * DIA), status: 'revision',
        lastChange: hace(1 * DIA), zone: 'z1', reminders: 0,
        thread: [
          { id: 's2', from: 'dirigente', text: 'Pedimos instalar cartelería en la esquina.', ts: hace(2 * DIA) },
          { id: 's3', from: 'municipal', text: 'Estamos evaluando el presupuesto de la señalización.', ts: hace(1 * DIA) }
        ]
      }
    ];

    const casos = [
      {
        id: 'CAS-0001', juntaId: 'j1', zone: 'z1', createdAt: hace(6 * DIA), desc: 'Se arroja basura de noche en la esquina del mercado.', phase: 1,
        evidence: [{ photo: foto('Evidencia: esquina del mercado', '#7a5c3e', hace(6 * DIA), -12.0462, -77.0308), desc: 'Bolsas dejadas durante la madrugada.' }],
        actions: [{ phase: 0, text: 'Reunión de sensibilización con 12 vecinos de la cuadra.', ts: hace(5 * DIA) }],
        escalated: false, reportId: null
      }
    ];

    return {
      seq: { rep: 7, fae: 4, sol: 2, cas: 1, not: 0, msg: 10 },
      reports: reports,
      faenas: faenas,
      solicitudes: solicitudes,
      casos: casos,
      notifications: [],
      settings: {
        overdueHours: { Alta: 24, Media: 72, Baja: 168 },
        requestHours: { limpieza: 48, carteleria: 72, otro: 96 },
        zoneJunta: { z1: 'j1', z2: 'j2', z3: 'j3' },
        geoConsent: false,
        points: {}
      },
      filters: { zona: 'all', desde: '', hasta: '', estado: 'all', orden: 'prioridad' }
    };
  }

  function notify(para, texto, ref, foto, tipo) {
    state.notifications.unshift({
      id: nextId('NOT', 'not'), to: para, text: texto, ts: Date.now(), read: false,
      ref: ref || null, photo: foto || null, tipo: tipo || null
    });
    state.notifications = state.notifications.slice(0, 60);
  }

  function quitarAvisos(tipo, ref) {
    state.notifications = state.notifications.filter(n => !(n.tipo === tipo && (!ref || n.ref === ref)));
  }

  // HU-02 Derivar el reporte a la zona según el GPS
  function zoneFor(lat, lng) {
    let mejor = ZONES[0];
    let menor = Infinity;
    ZONES.forEach(zona => {
      const d = EV.util.dist({ lat: lat, lng: lng }, zona);
      if (d < menor) {
        menor = d;
        mejor = zona;
      }
    });
    return mejor;
  }

  function zoneById(id) {
    return ZONES.find(z => z.id === id);
  }

  function juntaById(id) {
    return JUNTAS.find(j => j.id === id);
  }

  function juntaOfZone(idZona) {
    return juntaById(state.settings.zoneJunta[idZona]);
  }

  // HU-22 Agrupar reportes de un mismo punto
  function clusters() {
    const abiertos = state.reports.filter(r => r.status !== 'resolved');
    const grupos = [];
    abiertos.forEach(r => {
      const grupo = grupos.find(g => g.some(otro => EV.util.dist(otro, r) <= CLUSTER_RADIUS));
      if (grupo) grupo.push(r);
      else grupos.push([r]);
    });
    const porReporte = {};
    grupos.forEach(miembros => {
      let personas = 0;
      miembros.forEach(m => { personas += 1 + m.supporters.length; });
      miembros.forEach(m => { porReporte[m.id] = { members: miembros, people: personas }; });
    });
    return porReporte;
  }

  // HU-21 Priorizar reportes por criterios
  function priority(r) {
    const vol = r.tamano ? TAMANOS[r.tamano].v : 2;
    const riesgo = r.tipo ? TIPOS[r.tipo].risk : 2;
    const densidad = zoneById(r.zone).density;
    const grupo = clusters()[r.id];
    const personas = grupo ? grupo.people : 1 + r.supporters.length;
    const reincidencias = state.reports.filter(o => o.status === 'resolved' && EV.util.dist(o, r) <= CLUSTER_RADIUS).length;
    const frecuencia = Math.min(personas - 1 + reincidencias, 3);
    const nivelDensidad = ['', 'baja', 'media', 'alta'][densidad];

    const factors = [
      { name: 'Volumen', pts: Math.round(vol / 3 * 30), max: 30, note: r.tamano ? TAMANOS[r.tamano].label : 'Sin dato: se asume mediano' },
      { name: 'Riesgo', pts: Math.round(riesgo / 3 * 30), max: 30, note: r.tipo ? TIPOS[r.tipo].label : 'Sin dato: se asume riesgo medio' },
      { name: 'Ubicación', pts: Math.round(densidad / 3 * 20), max: 20, note: 'Cercanía a viviendas: densidad ' + nivelDensidad + ' en la zona' },
      { name: 'Frecuencia', pts: Math.round(frecuencia / 3 * 20), max: 20, note: personas + ' vecino(s) reportaron este punto y ' + reincidencias + ' reincidencia(s) ya resueltas' }
    ];

    let score = 0;
    factors.forEach(f => { score += f.pts; });
    let level = 'Baja';
    if (score >= 70) level = 'Alta';
    else if (score >= 45) level = 'Media';

    let eff = level;
    let effScore = score;
    if (r.override) {
      eff = r.override.level;
      effScore = { Alta: 100, Media: 60, Baja: 20 }[r.override.level];
    }
    return { score: score, level: level, factors: factors, eff: eff, effScore: effScore };
  }

  // HU-20 Alertar reporte atrasado
  function isOverdue(r) {
    if (r.status === 'resolved') return false;
    const limite = state.settings.overdueHours[priority(r).eff];
    return EV.util.hoursSince(r.createdAt) > limite;
  }

  // HU-44 Notificar solicitud sin respuesta
  function overdueSolicitud(s) {
    return s.status !== 'atendida' && EV.util.hoursSince(s.lastChange) > state.settings.requestHours[s.tipo];
  }

  function addMessage(lista, de, texto) {
    lista.push({ id: nextId('MSG', 'msg'), from: de, text: texto, ts: Date.now() });
  }

  function reset() {
    localStorage.removeItem(KEY);
    state = seed();
    save();
  }

  // HU-29 Compartir estado con la junta
  function reportsOfJunta(idJunta) {
    return state.reports.filter(r => state.settings.zoneJunta[r.zone] === idJunta);
  }

  return {
    ZONES, JUNTAS, MUNI, TIPOS, TAMANOS, FASES, SOL_TIPOS, SOL_ESTADOS, CLUSTER_RADIUS, USER,
    get s() { return state; },
    save, nextId, notify, quitarAvisos, zoneFor, zoneById, juntaById, juntaOfZone, clusters,
    priority, isOverdue, overdueSolicitud, addMessage, reset, reportsOfJunta
  };
})();
