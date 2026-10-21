/* ==========================================================================
   EcoVecinos · map.js
   Envoltorio de Leaflet. Los marcadores son círculos de color según el estado;
   el estado también se indica con texto en el popup y en las listas (no solo color).
   ========================================================================== */
EV.map = (function () {
  const COLORS = { pending: '#b7791f', active: '#2b6cb0', resolved: '#2f855a' };

  function create(containerId, center, zoom) {
    const el = document.getElementById(containerId);
    if (typeof L === 'undefined') {
      el.innerHTML = '<p class="text-muted map-fallback">No se pudo cargar el mapa (sin conexión). La lista de reportes sigue disponible.</p>';
      return null;
    }
    const map = L.map(el, { scrollWheelZoom: false }).setView([center.lat, center.lng], zoom || 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    // El mapa se crea con el contenedor recién visible: se recalcula el tamaño.
    setTimeout(() => map.invalidateSize(), 80);

    return {
      map, layer,
      /** items: [{id,lat,lng,status,label}] */
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
      destroy() { map.remove(); }
    };
  }
  return { create, COLORS };
})();
