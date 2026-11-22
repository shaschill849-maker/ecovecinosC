# EcoVecinos

Landing page del proyecto EcoVecinos para el curso HCI for UX Design (1ASI0784), UPC, ciclo 202620.

EcoVecinos conecta a vecinos, juntas vecinales y municipalidad para reportar focos de basura con foto y ubicación, hacer seguimiento del estado del reporte y verificar la limpieza con fotos de antes y después.

## Cómo verla

- Versión publicada: [poner aquí la URL del GitHub]
- En local: abrir la carpeta en VS Code y usar Live Server sobre `pages/index.html`.

La demo no usa servidor. Los datos de ejemplo se guardan en el navegador (localStorage). Con el botón "Restablecer datos de demostración" del pie de página se vuelve a los datos iniciales.

En el selector "Ver como" se cambia entre los tres roles: Vecino, Dirigente de junta y Municipalidad.

## Estructura

index.html          redirige a pages/index.html (para GitHub)
pages/index.html    página principal
css/styles.css      estilos 
js/util.js          funciones generales, mensajes y ventanas
js/geo.js           ubicación del usuario
js/camera.js        cámara y foto con fecha, hora y ubicación
js/store.js         datos de ejemplo y reglas (prioridad, atrasos, agrupación)
js/map.js           mapa con Leaflet
js/vecino.js        vistas del vecino
js/dirigente.js     vistas del dirigente de junta
js/municipal.js     vistas de la municipalidad y de la cuadrilla
js/main.js          selector de rol, pestañas y notificaciones
assets/             logo e íconos
docs/               trazabilidad de HU y pruebas de aceptación

Cada archivo está ordenado por bloques: un comentario indica la HU que implementa cada parte y otros separan la lógica y las animaciones.

## Historias de usuario implementadas

Se implementan las 30 HU core del Product Backlog (17 Must y 13 Should). El detalle de dónde se ve cada una está en `docs/TRAZABILIDAD-HU.md`.

## Limitaciones de la demo

- Los datos de ejemplo están en Lima. Si el navegador da una ubicación fuera de esas zonas, la página ofrece usar la ubicación de demostración.
- Si el dispositivo no tiene cámara, se puede usar una foto de prueba marcada como no real.
- La cuadrilla no es un rol aparte: tiene su propia pestaña "Cuadrilla" dentro del rol de Municipalidad.
- Los vecinos registrados por zona son datos de ejemplo.

## Equipo

Integrante - Código 
Dean Parodi, Gabriel Eduardo - u202510159 
Vargas Huamán, Ronaldo Agusto - u20241i517 
Castillo Gonza, Fabricio Maximiliano - u202513594 
Camara Bardales, Jeyson - u20251g147 
Ballesteros Martinez, Katrin Danae - u20251e587 
Sanabria Serva, John Rodrigo - u20251b322 
