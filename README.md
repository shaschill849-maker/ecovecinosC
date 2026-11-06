# EcoVecinos

Demo web para reportar focos de basura, darles seguimiento y verificar su limpieza con evidencia. Conecta tres roles: **vecino**, **dirigente de junta vecinal** y **municipalidad**. Proyecto académico (UPC); todos los datos son de demostración y se guardan solo en el navegador (`localStorage`).

## Cómo ejecutarlo

No requiere instalación ni compilación. Sirve la carpeta con cualquier servidor estático y abre la raíz:

# http://localhost:8000 → redirige a pages/index.html


La cámara y la geolocalización solo funcionan en `localhost` o con HTTPS (GitHub Pages lo cumple). Sin cámara se ofrece una «foto de prueba».

## Estructura

```
index.html          Redirección a pages/ (raíz que sirve GitHub Pages)
pages/index.html    Landing + demo interactiva
css/styles.css      Estilos mobile first (breakpoints 376 · 480 · 560 · 768 · 1024 · 1440)
js/util.js          Utilidades y componentes de UI (toast, diálogos, confirmación, errores de campo)
js/geo.js           Geolocalización con permiso diferido
js/camera.js        Captura de fotos solo con cámara, con sello de fecha/hora/GPS
js/store.js         Datos de demo, persistencia y reglas de negocio (prioridad, agrupación, atrasos)
js/map.js           Envoltorio de Leaflet
js/vecino.js        Vistas del vecino
js/dirigente.js     Vistas del dirigente
js/municipal.js     Vistas de la municipalidad
js/main.js          Arranque, pestañas, notificaciones y refresco automático
docs/               Trazabilidad de HU, pruebas de aceptación y bitácora de cambios
```

Los scripts son clásicos (sin módulos ES) y comparten el espacio de nombres `EV`; el orden de carga en `pages/index.html` importa. La única dependencia externa es Leaflet 1.9.4 (CDN con integridad SRI).

## Probar el tiempo real entre roles

Abre la demo en dos pestañas, elige un rol distinto en cada una y actúa en una de ellas: la otra se actualiza sola (evento `storage`). «Restablecer datos de demostración», en el pie de página, vuelve al estado inicial.
