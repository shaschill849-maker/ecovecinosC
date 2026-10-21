/* ==========================================================================
   EcoVecinos · geo.js
   Ubicación del usuario. El permiso se solicita SOLO cuando el vecino inicia
   la función de reporte (HU-02), con un aviso previo de privacidad.
   ========================================================================== */
EV.geo = (function () {
  // Ubicación por defecto (centro de Lima) hasta que el usuario conceda el permiso.
  let loc = { lat: -12.04318, lng: -77.02824, exact: false };

  function request() {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'unsupported' });
      navigator.geolocation.getCurrentPosition(
        p => {
          loc = { lat: p.coords.latitude, lng: p.coords.longitude, exact: true };
          resolve({ ok: true });
        },
        err => resolve({ ok: false, reason: err.code === 1 ? 'denied' : 'error' }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  }
  return {
    request,
    get: () => ({ ...loc }),
    set: (lat, lng, exact) => { loc = { lat, lng, exact: !!exact }; }
  };
})();
