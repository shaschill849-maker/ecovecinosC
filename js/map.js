EV.map = (function () {
  const COLORS = { pending: '#b7791f', active: '#2b6cb0', resolved: '#2f855a' };

  function create(idContenedor, centro, zoom) {
    const el = document.getElementById(idContenedor);
    if (typeof L === 'undefined') {
      el.innerHTML = '<p class="text-muted map-fallback">No se pudo cargar el mapa (sin conexión). La lista de reportes sigue disponible.</p>';
      return null;
    }
    const map = L.map(el, { scrollWheelZoom: false }).setView([centro.lat, centro.lng], zoom || 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      referrerPolicy: 'strict-origin-when-cross-origin',
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    const capa = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 80);

    return {
      map: map,
      setMarkers(items, alHacerClic) {
        capa.clearLayers();
        items.forEach(item => {
          const marcador = L.circleMarker([item.lat, item.lng], {
            radius: 9, color: '#fff', weight: 2, fillColor: COLORS[item.status] || '#555', fillOpacity: 0.95
          });
          marcador.bindTooltip(item.id + ' - ' + EV.ui.STATUS[item.status]);
          if (alHacerClic) marcador.on('click', () => alHacerClic(item.id));
          marcador.addTo(capa);
        });
      },
      fit(puntos) {
        if (puntos.length > 1) {
          map.fitBounds(puntos.map(p => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 16 });
        } else if (puntos.length === 1) {
          map.setView([puntos[0].lat, puntos[0].lng], 16);
        }
      },
      destroy() {
        map.remove();
      }
    };
  }

  return { create, COLORS };
})();
