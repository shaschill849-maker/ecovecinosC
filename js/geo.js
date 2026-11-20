EV.geo = (function () {
  const LIMA = { lat: -12.04318, lng: -77.02824 };
  let ubicacion = { lat: LIMA.lat, lng: LIMA.lng, exact: false, demo: true };

  function request() {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        resolve({ ok: false });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          ubicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude, exact: true, demo: false };
          resolve({ ok: true });
        },
        () => resolve({ ok: false }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }

  function get() {
    return { lat: ubicacion.lat, lng: ubicacion.lng, exact: ubicacion.exact, demo: ubicacion.demo };
  }

  function fueraDeZona() {
    if (ubicacion.demo) return false;
    let menor = Infinity;
    EV.store.ZONES.forEach(zona => {
      const d = EV.util.dist(ubicacion, zona);
      if (d < menor) menor = d;
    });
    return menor > 20000;
  }

  function usarDemo() {
    ubicacion = { lat: LIMA.lat, lng: LIMA.lng, exact: false, demo: true };
  }

  return { request, get, fueraDeZona, usarDemo };
})();
