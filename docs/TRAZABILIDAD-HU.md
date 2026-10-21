# Trazabilidad HU → implementación

HU del Product Backlog (17 Must + 13 Should). `Rol` indica dónde se ve en la demo.

| HU | Prior. | Rol / pestaña | Implementación | Qué se verifica |
|---|---|---|---|---|
| HU-01 | Must | Vecino · Reportar (paso 1) | `camera.js`, `vecino.js › step1` | Foto solo con cámara, sellada con fecha/hora/GPS; sin foto no se continúa; se puede repetir |
| HU-02 | Must | Vecino · Reportar (paso 2) | `geo.js`, `store.zoneFor`, `vecino.js › step2` | Permiso de ubicación explicado y solicitado al iniciar; pin ajustable; derivación automática a municipalidad y junta |
| HU-03 | Must | Vecino · Reportar | `vecino.js › reportar` | 3 pantallas (foto → ubicación/envío → confirmación); sin texto obligatorio |
| HU-05 | Must | Vecino · confirmación, campana | `store.nextId`, `store.notify` | Código único `REP-xxxx` y notificación |
| HU-06 | Must | Vecino · detalle | evento `storage` + `ev:data` | El estado se actualiza sin recargar (también entre pestañas) |
| HU-08 | Must | Vecino · Mis reportes | `vecino.js › mis` | Más reciente primero, filtro por estado, fecha y ubicación |
| HU-17 | Must | Municipal · Panel | `municipal.js › panel` | Todos los reportes de la jurisdicción con mapa y lista |
| HU-18 | Must | Municipal · Panel | filtros en `store.s.filters` | Filtros combinables por zona, fechas y estado; se conservan al navegar |
| HU-21 | Must | Municipal · detalle | `store.priority` | Puntaje 0–100 con 4 factores visibles; ajuste manual con motivo registrado |
| HU-25 | Must | Municipal · detalle | `municipal.js › openReport` | La cuadrilla sube foto de «después» tomada con la cámara |
| HU-26 | Must | Municipal · detalle | idem | Comparación antes/después lado a lado; aprobar o rechazar (motivo obligatorio) |
| HU-27 | Must | Municipal · detalle | `act('resolve')` | «Resolver» solo con evidencia aprobada; notifica al vecino con la foto |
| HU-33 | Must | Dirigente · Faenas | `dirigente.js › faenas` | Fecha, hora, lugar y descripción validados; visible a vecinos |
| HU-38 | Must | Dirigente · Evidencia | `dirigente.js › evidencia` | Foto con fecha, hora y ubicación asociada a un caso |
| HU-39 | Must | Vecino (reporte reservado) · Dirigente | casilla «reporte reservado»; avisos de privacidad | El nombre no se muestra a otros; no se piden datos de terceros |
| HU-43 | Must | Dirigente · Solicitudes | `dirigente.js › solicitudes` | Estado (enviada / en revisión / atendida) y fecha del último cambio |
| HU-47 | Must | Dirigente y Municipal · hilo | `openSolThread` | Comunicación en un solo hilo cronológico |
| HU-04 | Should | Vecino · Cerca de mí | `vecino.js › cerca` | Reportes activos en radio configurable, con estado y distancia |
| HU-10 | Should | Vecino · detalle | `vecino.js › openDetail` | Comentario con fecha y hora; no en reportes resueltos |
| HU-11 | Should | Vecino · Faenas | `vecino.js › faenas` | Lista con filtro de cercanía y datos de la faena |
| HU-12 | Should | Vecino · Faenas | idem | Inscripción, calendario y cancelación hasta 24 h antes |
| HU-20 | Should | Municipal · Panel y Zonas | `store.isOverdue` | Plazo por prioridad; marca «atrasado» y alerta al ingresar |
| HU-22 | Should | Municipal · Panel | `store.clusters` | Agrupa reportes a ≤ 50 m; al resolver se cierran todos |
| HU-29 | Should | Municipal · Zonas / Dirigente · Mi zona | `municipal.js › zonas`, `dirigente.js › zona` | Vinculación zona–junta; la junta ve el estado en solo lectura |
| HU-31 | Should | Municipal y Dirigente · comentarios | `thread` del reporte | Respuesta visible para ambas partes y notificada |
| HU-34 | Should | Dirigente · Faenas | `data-invite` | Invitación a vecinos y conteo de inscritos |
| HU-35 | Should | Dirigente · Faenas / Vecino | campos de insumos | Lista de insumos editable hasta el día anterior; visible al inscrito |
| HU-36 | Should | Dirigente · Faenas | `attendance()` | Asistencia por faena; solo asistentes reciben puntos |
| HU-40 | Should | Dirigente · Evidencia | casos con 4 fases | No se avanza sin una acción de la fase; solo se escala desde la fase final |
| HU-44 | Should | Dirigente · Solicitudes / campana | `checkAlerts`, `remind` | Alerta por plazo vencido y reenvío de recordatorio desde la notificación |

> Reglas del puntaje de prioridad (HU-21): volumen 30 + riesgo 30 + ubicación 20 + frecuencia 20 = 100. Nivel Alta ≥ 70, Media ≥ 45, Baja < 45.
