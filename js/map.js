/* EcoVecinos · map.js
   Envoltorio de Leaflet. Los marcadores se colorean por estado, y el estado
   también se indica con texto en el tooltip y en las listas. */
EV.map = (function () {
  const COLORS = { pending: '#b7791f', active: '#2b6cb0', resolved: '#2f855a' };

  function create(containerId, center, zoom) {
    const el = document.getElementById(containerId);
    if (typeof L === 'undefined') {
      el.innerHTML = '<p class="text-muted map-fallback">No se pudo cargar el mapa (sin conexión). La lista de reportes sigue disponible.</p>';
      return null;
    }
    const animate = !EV.util.reducedMotion();
    const map = L.map(el, { scrollWheelZoom: false, zoomAnimation: animate, fadeAnimation: animate, markerZoomAnimation: animate })
      .setView([center.lat, center.lng], zoom || 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    // Leaflet solo escucha el resize de la ventana; el contenedor también cambia
    // al aparecer, al rotar el móvil o al pasar de un breakpoint a otro.
    let alive = true, timer = null;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { if (alive) map.invalidateSize(); }) : null;
    if (ro) ro.observe(el); else timer = setTimeout(() => alive && map.invalidateSize(), 80);

    return {
      map, layer,
      /** items: [{ id, lat, lng, status }] */
      setMarkers(items, onClick) {
        layer.clearLayers();
        items.forEach(it => {
          const m = L.circleMarker([it.lat, it.lng], { radius: 9, color: '#fff', weight: 2, fillColor: COLORS[it.status] || '#555', fillOpacity: 0.95 });
          m.bindTooltip(`${it.id} · ${EV.ui.STATUS[it.status].label}`);
          if (onClick) m.on('click', () => onClick(it.id));
          m.addTo(layer);
        });
      },
      fit(points) {
        if (points.length > 1) map.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 16 });
        else if (points.length === 1) map.setView([points[0].lat, points[0].lng], 16);
      },
      destroy() {
        alive = false;
        if (ro) ro.disconnect();
        clearTimeout(timer);
        map.stop();
        // Leaflet 1.9 cierra la animación de zoom con un setTimeout que no cancela al
        // destruir el mapa; si se cambia de pestaña en ese intervalo, lanza
        // «Cannot read properties of undefined (reading '_leaflet_pos')».
        map._animatingZoom = false;
        map.remove();
      }
    };
  }
  return { create, COLORS };
})();
