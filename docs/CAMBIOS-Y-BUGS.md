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
