/* ==========================================================================
   EcoVecinos · store.js
   Capa de datos (simula un backend con localStorage) y reglas de negocio:
   jurisdicción por GPS (HU-02), puntaje de prioridad (HU-21), agrupación de
   reportes (HU-22), atrasos (HU-20, HU-44) y notificaciones.
   Todo cambio llama a save(), que emite el evento 'ev:data' para que las
   vistas se actualicen solas (también entre pestañas del navegador).
   ========================================================================== */
EV.store = (function () {
  const KEY = 'ecovecinos.v2';
  const H = 36e5, D = 864e5;

  /* ---------- Catálogos (datos de demostración) ---------- */
  const ZONES = [
    { id: 'z1', name: 'Cercado – Barrios Altos', lat: -12.0464, lng: -77.0306, density: 3 },
    { id: 'z2', name: 'Rímac – Alameda',         lat: -12.0300, lng: -77.0400, density: 2 },
    { id: 'z3', name: 'La Victoria – Gamarra',   lat: -12.0650, lng: -77.0150, density: 1 }
  ];
  const JUNTAS = [
    { id: 'j1', name: 'Junta Vecinal Barrios Altos' },
    { id: 'j2', name: 'Junta Vecinal Alameda' },
    { id: 'j3', name: 'Junta Vecinal Gamarra' }
  ];
  const MUNI = 'Municipalidad (demo)';
  const TIPOS = {
    domiciliario: { label: 'Residuos domiciliarios',             risk: 2 },
    desmonte:     { label: 'Desmonte o escombros',               risk: 1 },
    organico:     { label: 'Residuos orgánicos (malos olores)',  risk: 3 },
    peligroso:    { label: 'Residuos peligrosos o médicos',      risk: 3 }
  };
  const TAMANOS = { pequeno: { label: 'Pequeño (una bolsa o poco más)', v: 1 }, mediano: { label: 'Mediano (varias bolsas)', v: 2 }, grande: { label: 'Grande (ocupa la vereda o pista)', v: 3 } };
  const FASES = ['Sensibilización', 'Cartelería', 'Evidencia', 'Denuncia al municipio'];
  const SOL_TIPOS = { limpieza: 'Limpieza de punto crítico', carteleria: 'Cartelería o señalización', otro: 'Otro' };
  const SOL_ESTADOS = { enviada: 'Enviada', revision: 'En revisión', atendida: 'Atendida' };
  const CLUSTER_RADIUS = 50; // metros para agrupar reportes del mismo punto (HU-22)
  const USER = 'vecino-demo';

  /* ---------- Estado ---------- */
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* datos corruptos: se regeneran */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { EV.ui.toast('No se pudo guardar: el almacenamiento del navegador está lleno. Usa "Restablecer datos de demo".', 'error'); return false; }
    document.dispatchEvent(new CustomEvent('ev:data'));
    return true;
  }
  // Si otra pestaña modifica los datos (p. ej. la municipalidad), esta se actualiza (HU-06, HU-17, HU-29).
  window.addEventListener('storage', e => {
    if (e.key === KEY) { state = load(); document.dispatchEvent(new CustomEvent('ev:data')); }
  });

  function nextId(prefix, key) {
    state.seq[key] = (state.seq[key] || 0) + 1;
    return `${prefix}-${String(state.seq[key]).padStart(4, '0')}`;
  }

  /* ---------- Datos de ejemplo ---------- */
  function seed() {
    const now = Date.now(), ph = EV.camera.placeholder;
    const stamp = (ts, lat, lng) => `${new Date(ts).toLocaleDateString('es-PE')} · ${EV.util.fmtCoords(lat, lng)}`;
    const photo = (t, c, ts, lat, lng) => ({ dataUrl: ph(t, c, stamp(ts, lat, lng)), ts, lat, lng, source: 'demo' });
    const rep = (n, o) => ({
      id: `REP-${String(n).padStart(4, '0')}`, source: 'vecino', reserved: false, reporterId: 'otro', supporters: [],
      thread: [], after: null, override: null, closedAt: null, closedBy: null, tipo: null, tamano: null, ...o
    });
    const t = (ago) => now - ago;
    const reports = [
      rep(1, { createdAt: t(3 * D), zone: 'z1', lat: -12.0468, lng: -77.0310, tipo: 'organico', tamano: 'grande', status: 'pending', supporters: ['otro2'],
        photo: photo('Basura acumulada', '#7a5c3e', t(3 * D), -12.0468, -77.0310) }),
      rep(2, { createdAt: t(1.2 * D), zone: 'z1', lat: -12.04695, lng: -77.03115, tipo: 'domiciliario', tamano: 'mediano', status: 'pending',
        photo: photo('Bolsas en la vereda', '#6b6f4a', t(1.2 * D), -12.04695, -77.03115) }),
      rep(3, { createdAt: t(5 * D), zone: 'z2', lat: -12.0302, lng: -77.0405, tipo: 'desmonte', tamano: 'pequeno', status: 'active',
        photo: photo('Desmonte', '#6a6a6a', t(5 * D), -12.0302, -77.0405),
        thread: [{ id: 'm1', from: 'municipal', text: 'Cuadrilla programada para esta semana.', ts: t(2 * D) }] }),
      rep(4, { createdAt: t(8 * D), zone: 'z3', lat: -12.0652, lng: -77.0148, tipo: 'domiciliario', tamano: 'mediano', status: 'resolved',
        photo: photo('Antes', '#7a5c3e', t(8 * D), -12.0652, -77.0148),
        after: { photo: photo('Después: limpio', '#2f7d4f', t(6 * D), -12.0652, -77.0148), status: 'approved', note: '', ts: t(6 * D) },
        closedAt: t(6 * D), closedBy: 'Personal municipal (demo)' }),
      rep(5, { createdAt: t(6 * H), zone: 'z1', lat: -12.0440, lng: -77.0270, tipo: 'domiciliario', tamano: 'mediano', status: 'pending', reporterId: USER,
        photo: photo('Mi reporte reciente', '#6b6f4a', t(6 * H), -12.0440, -77.0270) }),
      rep(6, { createdAt: t(10 * D), zone: 'z1', lat: -12.0450, lng: -77.0290, tipo: 'desmonte', tamano: 'pequeno', status: 'resolved', reporterId: USER, reserved: true,
        photo: photo('Antes', '#6a6a6a', t(10 * D), -12.0450, -77.0290),
        after: { photo: photo('Después: limpio', '#2f7d4f', t(8 * D), -12.0450, -77.0290), status: 'approved', note: '', ts: t(8 * D) },
        closedAt: t(8 * D), closedBy: 'Personal municipal (demo)' }),
      rep(7, { createdAt: t(4 * D), zone: 'z2', lat: -12.0285, lng: -77.0420, tipo: 'peligroso', tamano: 'grande', status: 'pending', source: 'junta',
        photo: photo('Residuos peligrosos', '#8a3b3b', t(4 * D), -12.0285, -77.0420) })
    ];
    const ymd = EV.util.isoFromOffset;
    const faenas = [
      { id: 'FAE-0001', organizer: 'junta', organizerName: 'Junta Vecinal Barrios Altos', juntaId: 'j1', zone: 'z1', date: ymd(-3), time: '08:00', place: 'Jr. Ancash cdra. 4', lat: -12.0460, lng: -77.0300,
        desc: 'Limpieza del punto crítico junto al mercado.', implementos: true, insumosJunta: 'Guantes y bolsas', insumosVecinos: 'Escobas y agua', cancelled: false, invited: 40, attendanceSaved: false,
        inscritos: [{ id: 'v-rosa', name: 'Rosa M.', attended: null }, { id: 'v-carlos', name: 'Carlos P.', attended: null }, { id: 'v-lucila', name: 'Lucila H.', attended: null }] },
      { id: 'FAE-0002', organizer: 'municipio', organizerName: MUNI, juntaId: null, zone: 'z2', date: ymd(4), time: '09:00', place: 'Alameda Los Descalzos', lat: -12.0300, lng: -77.0400,
        desc: 'Faena municipal con apoyo de la cuadrilla.', implementos: true, insumosJunta: 'Guantes, bolsas y mascarillas', insumosVecinos: '', cancelled: false, invited: 0, attendanceSaved: false,
        inscritos: [{ id: 'v-ana', name: 'Ana T.', attended: null }] },
      { id: 'FAE-0003', organizer: 'junta', organizerName: 'Junta Vecinal Barrios Altos', juntaId: 'j1', zone: 'z1', date: ymd(9), time: '07:30', place: 'Parque Neptuno', lat: -12.0455, lng: -77.0320,
        desc: 'Jornada de limpieza y pintado de muros.', implementos: false, insumosJunta: 'Bolsas', insumosVecinos: 'Guantes, escobas y recogedores', cancelled: false, invited: 0, attendanceSaved: false, inscritos: [] }
    ];
    const solicitudes = [
      { id: 'SOL-0001', juntaId: 'j1', tipo: 'limpieza', asunto: 'Limpieza del punto crítico en Jr. Ancash', createdAt: t(5 * D), status: 'enviada', lastChange: t(5 * D), zone: 'z1', reminders: 0,
        thread: [{ id: 's1', from: 'dirigente', text: 'Solicitamos limpieza urgente del punto frente al mercado.', ts: t(5 * D) }] },
      { id: 'SOL-0002', juntaId: 'j1', tipo: 'carteleria', asunto: 'Cartel de prohibido arrojar basura', createdAt: t(2 * D), status: 'revision', lastChange: t(1 * D), zone: 'z1', reminders: 0,
        thread: [{ id: 's2', from: 'dirigente', text: 'Pedimos instalar cartelería en la esquina.', ts: t(2 * D) }, { id: 's3', from: 'municipal', text: 'Estamos evaluando el presupuesto de la señalización.', ts: t(1 * D) }] }
    ];
    const casos = [
      { id: 'CAS-0001', juntaId: 'j1', zone: 'z1', createdAt: t(6 * D), desc: 'Se arroja basura de noche en la esquina del mercado.', phase: 1,
        evidence: [{ photo: photo('Evidencia: esquina del mercado', '#7a5c3e', t(6 * D), -12.0462, -77.0308), desc: 'Bolsas dejadas durante la madrugada.' }],
        actions: [{ phase: 0, text: 'Reunión de sensibilización con 12 vecinos de la cuadra.', ts: t(5 * D) }], escalated: false, reportId: null }
    ];
    return {
      v: 2, seq: { rep: 7, fae: 3, sol: 2, cas: 1, not: 0, msg: 10 },
      reports, faenas, solicitudes, casos, notifications: [],
      settings: {
        overdueHours: { Alta: 24, Media: 72, Baja: 168 },           // HU-20
        requestHours: { limpieza: 48, carteleria: 72, otro: 96 },   // HU-44
        zoneJunta: { z1: 'j1', z2: 'j2', z3: 'j3' },                // HU-29
        geoConsent: false, points: {}
      },
      filters: { zona: 'all', desde: '', hasta: '', estado: 'all', orden: 'prioridad' }
    };
  }

  /* ---------- Notificaciones por rol ---------- */
  function notify(to, text, ref, photo) {
    state.notifications.unshift({ id: nextId('NOT', 'not'), to, text, ts: Date.now(), read: false, ref: ref || null, photo: photo || null });
    state.notifications = state.notifications.slice(0, 60);
  }

  /* ---------- Jurisdicción (HU-02) ---------- */
  function zoneFor(lat, lng) {
    let best = ZONES[0], bd = Infinity;
    ZONES.forEach(z => { const d = EV.util.dist({ lat, lng }, z); if (d < bd) { bd = d; best = z; } });
    return best;
  }
  const zoneById = id => ZONES.find(z => z.id === id);
  const juntaById = id => JUNTAS.find(j => j.id === id);
  const juntaOfZone = zid => juntaById(state.settings.zoneJunta[zid]);

  /* ---------- Agrupación de reportes del mismo punto (HU-22) ---------- */
  function clusters() {
    const open = state.reports.filter(r => r.status !== 'resolved');
    const parent = {};
    open.forEach(r => parent[r.id] = r.id);
    const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
    for (let i = 0; i < open.length; i++)
      for (let j = i + 1; j < open.length; j++)
        if (EV.util.dist(open[i], open[j]) <= CLUSTER_RADIUS) parent[find(open[i].id)] = find(open[j].id);
    const groups = {};
    open.forEach(r => { (groups[find(r.id)] = groups[find(r.id)] || []).push(r); });
    const byReport = {};
    Object.values(groups).forEach(members => {
      const people = members.reduce((n, m) => n + 1 + m.supporters.length, 0); // vecinos distintos que reportaron
      members.forEach(m => byReport[m.id] = { members, people });
    });
    return byReport;
  }

  /* ---------- Puntaje de prioridad (HU-21) ---------- */
  // Pesos: volumen 30 + riesgo 30 + ubicación 20 + frecuencia 20 = 100
  function priority(r) {
    const hasSize = !!r.tamano, hasTipo = !!r.tipo;
    const vol = hasSize ? TAMANOS[r.tamano].v : 2, risk = hasTipo ? TIPOS[r.tipo].risk : 2;
    const dens = zoneById(r.zone).density;
    const g = clusters()[r.id];
    const people = g ? g.people : 1 + r.supporters.length;
    const recurrent = state.reports.filter(o => o.status === 'resolved' && EV.util.dist(o, r) <= CLUSTER_RADIUS).length;
    const freqN = Math.min(people - 1 + recurrent, 3);
    const factors = [
      { name: 'Volumen', pts: Math.round(vol / 3 * 30), max: 30, note: hasSize ? TAMANOS[r.tamano].label : 'Sin dato: se asume mediano' },
      { name: 'Riesgo', pts: Math.round(risk / 3 * 30), max: 30, note: hasTipo ? TIPOS[r.tipo].label : 'Sin dato: se asume riesgo medio' },
      { name: 'Ubicación', pts: Math.round(dens / 3 * 20), max: 20, note: `Cercanía a viviendas: densidad ${['', 'baja', 'media', 'alta'][dens]} en la zona` },
      { name: 'Frecuencia', pts: Math.round(freqN / 3 * 20), max: 20, note: `${people} vecino(s) reportaron este punto y ${recurrent} reincidencia(s) ya resueltas` }
    ];
    const score = factors.reduce((s, f) => s + f.pts, 0);
    const level = score >= 70 ? 'Alta' : score >= 45 ? 'Media' : 'Baja';
    const eff = r.override ? r.override.level : level;
    const effScore = r.override ? { Alta: 100, Media: 60, Baja: 20 }[r.override.level] : score;
    return { score, level, factors, eff, effScore };
  }

  /* ---------- Atrasos (HU-20) ---------- */
  function isOverdue(r) {
    if (r.status === 'resolved') return false;
    const lim = state.settings.overdueHours[priority(r).eff];
    return EV.util.hoursSince(r.createdAt) > lim;
  }
  function overdueSolicitud(s) {
    return s.status !== 'atendida' && EV.util.hoursSince(s.lastChange) > state.settings.requestHours[s.tipo];
  }

  /* ---------- Operaciones de reportes ---------- */
  function setStatus(r, status) { r.status = status; }
  function addMessage(list, from, text) {
    list.push({ id: nextId('MSG', 'msg'), from, text, ts: Date.now() });
  }

  return {
    ZONES, JUNTAS, MUNI, TIPOS, TAMANOS, FASES, SOL_TIPOS, SOL_ESTADOS, CLUSTER_RADIUS, USER,
    get s() { return state; },
    save, nextId, notify, zoneFor, zoneById, juntaById, juntaOfZone, clusters, priority, isOverdue, overdueSolicitud, setStatus, addMessage,
    reset() { localStorage.removeItem(KEY); state = seed(); save(); },
    /** Reportes que ve una junta: los de las zonas vinculadas a ella (HU-29). */
    reportsOfJunta(jid) { return state.reports.filter(r => state.settings.zoneJunta[r.zone] === jid); }
  };
})();
