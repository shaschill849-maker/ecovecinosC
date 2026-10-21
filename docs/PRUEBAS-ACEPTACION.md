# Pruebas de aceptación (plantilla para el capítulo 6.1)

Ejecutar sobre la URL de **GitHub Pages**, no sobre el prototipo de Figma. Completar *Resultado obtenido* y *Estado* (Cumple / No cumple). Si algo no cumple: registrar, corregir y volver a ejecutar.

| ID | HU | Criterio / escenario | Acción de prueba | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| PA-01 | HU-01 | Foto solo con cámara | Reportar → abrir cámara → tomar foto | La foto se muestra con fecha, hora y ubicación | | |
| PA-02 | HU-01 | Sin foto no se envía | Intentar continuar sin foto | «Continuar» deshabilitado y mensaje visible | | |
| PA-03 | HU-02 | Permiso de ubicación | Paso 2 por primera vez | Aviso de uso de ubicación antes del permiso del navegador | | |
| PA-04 | HU-02 | Ubicación denegada | Elegir «Ahora no» | Se puede mover el pin y enviar | | |
| PA-05 | HU-02 | Derivación | Mover el pin a otra zona | Cambia la municipalidad/junta indicada | | |
| PA-06 | HU-03 | Envío en 3 pantallas | Reportar de principio a fin | Foto → ubicación/envío → confirmación, sin texto obligatorio | | |
| PA-07 | HU-05 | Código | Enviar un reporte | Se muestra `REP-xxxx` y llega notificación | | |
| PA-08 | HU-04 | Cercanos | Pestaña «Cerca de mí», cambiar radio | La lista y el mapa se ajustan al radio | | |
| PA-09 | HU-06 | Estado en vivo | Cambiar estado como Municipalidad (otra pestaña) | El vecino ve el nuevo estado sin recargar | | |
| PA-10 | HU-08 | Historial | Mis reportes → filtrar por estado | Más recientes primero; el filtro funciona | | |
| PA-11 | HU-10 | Comentario | Abrir detalle → comentar | Se guarda con fecha y hora; sin comentarios si está resuelto | | |
| PA-12 | HU-11 | Faenas cercanas | Filtrar por distancia | Solo faenas dentro del radio | | |
| PA-13 | HU-12 | Inscripción / cancelación | Inscribirse; cancelar con < 24 h | Calendario actualizado; cancelación bloqueada con mensaje | | |
| PA-14 | HU-17 | Panel | Ingresar como Municipalidad | Todos los reportes en mapa y lista | | |
| PA-15 | HU-18 | Filtros combinados | Zona + estado + fechas; cambiar de pestaña y volver | Resultados correctos y filtros conservados | | |
| PA-16 | HU-20 | Atrasados | Reducir el plazo en «Zonas y plazos» | Reportes marcados «Atrasado» y alerta visible | | |
| PA-17 | HU-21 | Prioridad | Abrir detalle de un reporte | Puntaje con 4 factores; ajuste manual exige motivo | | |
| PA-18 | HU-22 | Agrupación | Revisar REP-0001 y REP-0002 | Aparece «3 vecinos reportaron»; al resolver se cierran ambos | | |
| PA-19 | HU-25 | Foto de después | Subir foto como cuadrilla | Queda «por validar» con fecha y hora | | |
| PA-20 | HU-26 | Comparar | Ver antes/después; rechazar sin motivo | Lado a lado; el rechazo exige motivo y pide nueva foto | | |
| PA-21 | HU-27 | Resolver | Intentar resolver sin aprobar; luego aprobar | Botón bloqueado → habilitado; el vecino recibe la foto | | |
| PA-22 | HU-29 | Zona–junta | Vincular zona z2 con otra junta | La junta ve esos reportes en solo lectura | | |
| PA-23 | HU-31 | Responder | Municipalidad comenta un reporte | La junta lo ve y recibe notificación | | |
| PA-24 | HU-33 | Crear faena | Enviar el formulario vacío / válido | Errores por campo / faena visible para vecinos | | |
| PA-25 | HU-34 | Invitar | «Invitar a vecinos» | Confirmación con número de invitados; vecino recibe aviso | | |
| PA-26 | HU-35 | Insumos | Editar insumos el mismo día | Campos bloqueados con explicación | | |
| PA-27 | HU-36 | Asistencia | Registrar asistencia | Solo asistentes reciben 10 puntos | | |
| PA-28 | HU-38 | Evidencia | Foto + descripción | Se abre un caso con evidencia sellada | | |
| PA-29 | HU-39 | Reservado | Reportar con «reporte reservado» | El nombre no aparece en vistas de vecinos; sin campos de terceros | | |
| PA-30 | HU-40 | Protocolo | Intentar avanzar sin acción / escalar antes de la fase final | Avance bloqueado; escalar solo en la fase final | | |
| PA-31 | HU-43 | Estado de solicitud | Revisar «Mis solicitudes» | Estado y fecha del último cambio | | |
| PA-32 | HU-44 | Alerta | Ingresar como dirigente con solicitud vencida | Notificación; botón «Reenviar recordatorio» | | |
| PA-33 | HU-47 | Hilo | Escribir como junta y responder como municipio | Un solo hilo cronológico | | |

**Síntesis a incluir en el informe:** 30 HU implementadas → HU que cumplen → HU que no cumplen → correcciones realizadas → resultado final.
