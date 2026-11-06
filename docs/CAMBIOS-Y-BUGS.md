# Bitácora de revisión del código inicial

## Errores corregidos en el código original
| Archivo | Problema | Efecto | Corrección |
|---|---|---|---|
| `styles.css` | `padding: 0.75rem, 1.5rem` (coma) | Declaración inválida: los botones perdían su relleno | Padding válido con alto mínimo de 44 px |
| `styles.css` | `line-height: 1,2` | Inválido: títulos con interlineado por defecto | `1.2` |
| `styles.css` | `.btn-secundary` (typo) y colores | Clase inexistente; botón blanco sobre ámbar (contraste ≈ 2:1) | Texto oscuro sobre ámbar (≈ 8:1) |
| `styles.css` | `--color-text-muted: #718096` | Contraste 3.9:1 (< 4.5:1 exigido) | `#4a5568` (7:1) |
| `index.html` | Rutas `../css`, `../js` con `index.html` en la raíz | Habría fallado el despliegue | `index.html` raíz redirige a `pages/index.html` |
| `main.js` | La foto capturada no se guardaba en el reporte | El reporte no tenía evidencia | Se guarda miniatura JPEG sellada |
| `main.js` | `photoCaptured` nunca se reiniciaba tras capturar | Segundo clic fallaba (cámara detenida) | Componente `camera.js` con «Repetir foto» |
| `main.js` | Posición del reporte desplazada al azar | Datos de ubicación falsos | Se usa el pin confirmado por el vecino |
| `main.js` | GPS pedido al cargar la página | Permiso sin contexto (privacidad) | Aviso previo y permiso al iniciar el reporte |
| `main.js` | Selector de rol sin efecto real para dirigente | HU no demostrables | Vistas completas por rol |
| `main.js` | Estado `active`/`delayed` sin soporte | Insignias vacías | Estados pendiente / en atención / resuelto + atraso calculado |
| `index.html` | «Anónimo» marcado por defecto | Sesgaba la medición de H3 | Casilla desmarcada por defecto |
| `index.html` | Un `h1` dentro del header sin estructura | Jerarquía de encabezados débil | Landing con `h1` único y secciones |

## Decisiones de diseño
- **Sin módulos ES:** scripts clásicos con espacio de nombres `EV`, para que funcione también con Live Server y sin configuración.
- **`storage` event:** simula el tiempo real entre roles abiertos en dos pestañas.
- **Foto de prueba:** permite evaluar en equipos sin cámara, marcada como no real.
- **Textos del usuario** siempre escapados (`EV.util.esc`) antes de usar `innerHTML`.

## Auditoría frontend (noviembre 2026)

### Errores corregidos
| Archivo | Problema | Efecto | Corrección |
|---|---|---|---|
| `map.js` | `invalidateSize` con `setTimeout` y animación de zoom sin cancelar al destruir el mapa | Error `Cannot read properties of undefined (reading '_leaflet_pos')` al cambiar de pestaña tras mover un mapa | `ResizeObserver` que se desconecta en `destroy()` y cierre explícito de la animación |
| `camera.js` | Si se cambiaba de pestaña mientras se concedía el permiso, el stream llegaba tarde y nadie lo detenía | La cámara quedaba encendida | Bandera `destroyed`: el stream tardío se detiene |
| `main.js` | Refresco por `ev:data` reescribía los diálogos completos | Se perdía el texto que se estaba escribiendo cuando otra pestaña cambiaba datos | Se conservan valores, foco y scroll, salvo los del formulario recién enviado |
| `main.js`, `store.js` | `localStorage` sin `try/catch` al leer el rol | La app no arrancaba con el almacenamiento bloqueado | `EV.util.storage` seguro |
| `main.js`, `styles.css` | Código de `.tarjeta-interactiva` / `#tarjeta-reporta` sin elementos que lo usen | Listener en cada clic del documento sin efecto | Eliminado; las tarjetas de «Cómo funciona» ahora llevan a la pestaña de la demo correspondiente |
| `main.js` | Clic en el padding del diálogo lo cerraba | Cierre accidental | Solo cierra al pulsar fuera de la caja |
| `dirigente.js` | Solicitudes nuevas siempre en zona `z1` | Zona incorrecta si se revincula la junta | `store.zoneOfJunta` |
| `pages/index.html` | «Se parte… unete» | Faltas de ortografía en el titular | «Sé parte… únete» |
| `styles.css` | Desborde horizontal de 2 px en «Evidencia» a 320 px | Scroll lateral | Revisión de anchos mínimos |

### Mejoras
- **Responsive real:** barra de pestañas inferior y diálogos como hoja inferior en móvil (≤ 767 px); tablas apiladas y botones a ancho completo (< 480 px); hero reorganizado en tablet y en dos columnas desde 1024 px; panel municipal con mapa fijo y lista lado a lado en laptop; tipografía fluida con `clamp()`.
- **Interacción:** confirmación accesible para acciones irreversibles (cancelar faena, escalar caso, restablecer datos); estados de carga en cámara y geolocalización; notificaciones con botón «Ver» que abre el reporte, la solicitud o la faena; la foto se conserva al volver al paso 1; campos inválidos marcados con `aria-invalid` y foco en el primer error; menú con sección activa.
- **Accesibilidad:** emojis decorativos ocultos a lectores de pantalla, foco visible sobre fondos oscuros, efectos de hover solo en dispositivos con puntero, `prefers-reduced-motion` respetado también en los desplazamientos por JavaScript y en los mapas.
- **Rendimiento:** la agrupación de reportes (O(n²)) se memoriza por estado en lugar de recalcularse por cada reporte de la lista.
- **Seguridad:** Leaflet desde CDN con integridad SRI.
