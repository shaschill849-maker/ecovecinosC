/* ==========================================================================
   EcoVecinos · camera.js
   Componente de captura de foto SOLO con cámara (sin galería): HU-01, HU-25,
   HU-38. Cada foto se "sella" con fecha, hora y coordenadas.
   Si el dispositivo no tiene cámara se ofrece una foto de PRUEBA (source:'demo')
   para poder evaluar la demo en computadoras sin webcam.
   ========================================================================== */
EV.camera = (function () {
  const streams = new Set();

  function stopAll() {
    streams.forEach(s => s.getTracks().forEach(t => t.stop()));
    streams.clear();
  }

  function stampText() {
    const g = EV.geo.get();
    const d = new Date();
    return `${d.toLocaleDateString('es-PE')} ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · ${EV.util.fmtCoords(g.lat, g.lng)}`;
  }

  /** Imagen de relleno en SVG (para datos de ejemplo y foto de prueba). */
  function placeholder(title, color, stamp) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="${color}"/>
      <text x="320" y="190" font-family="Arial" font-size="34" font-weight="bold" text-anchor="middle" fill="#fff">${title}</text>
      <text x="320" y="232" font-family="Arial" font-size="20" text-anchor="middle" fill="#fff" opacity=".85">Imagen de demostración</text>
      <rect y="360" width="640" height="40" fill="rgba(11, 136, 32, 0.6)"/>
      <text x="12" y="386" font-family="Arial" font-size="18" fill="#fff">${stamp}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /**
   * Monta el componente dentro de `root`.
   * opts.onChange(photo|null) se llama al capturar o reiniciar.
   * Devuelve { getPhoto, reset, destroy }.
   */
  function mount(root, opts = {}) {
    root.innerHTML = `
      <div class="camera">
        <video class="camera-video" autoplay playsinline muted hidden aria-label="Vista previa de la cámara"></video>
        <img class="camera-result" alt="Foto capturada con fecha, hora y ubicación" hidden>
        <p class="camera-msg text-muted" role="status"></p>
        <div class="camera-actions">
          <button type="button" class="btn btn-secondary" data-cam="open">📷 Abrir cámara</button>
          <button type="button" class="btn btn-primary" data-cam="shoot" hidden>📸 Tomar foto</button>
          <button type="button" class="btn btn-secondary" data-cam="retake" hidden>↺ Repetir foto</button>
          <button type="button" class="btn btn-ghost" data-cam="demo" hidden>Usar foto de prueba</button>
        </div>
      </div>`;
    const $ = s => root.querySelector(s);
    const video = $('.camera-video'), img = $('.camera-result'), msg = $('.camera-msg');
    const btn = { open: $('[data-cam=open]'), shoot: $('[data-cam=shoot]'), retake: $('[data-cam=retake]'), demo: $('[data-cam=demo]') };
    let stream = null, photo = null;

    function show(el, v) { el.hidden = !v; }
    function stopStream() {
      if (stream) { stream.getTracks().forEach(t => t.stop()); streams.delete(stream); stream = null; }
      video.srcObject = null;
    }
    function setPhoto(p) {
      photo = p;
      if (p) {
        img.src = p.dataUrl;
        show(img, true); show(video, false);
        show(btn.open, false); show(btn.shoot, false); show(btn.demo, false); show(btn.retake, true);
        msg.textContent = p.source === 'demo' ? 'Foto de prueba registrada (no es una foto real).' : 'Foto capturada. Puedes repetirla si no se ve bien.';
      } else {
        show(img, false); show(btn.retake, false); show(btn.open, true);
        msg.textContent = '';
      }
      if (opts.onChange) opts.onChange(p);
    }

    btn.open.addEventListener('click', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg.textContent = 'Este navegador no permite usar la cámara (se requiere HTTPS). Puedes usar una foto de prueba.';
        show(btn.demo, true); return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        streams.add(stream);
        video.srcObject = stream;
        show(video, true); show(btn.open, false); show(btn.shoot, true); show(btn.demo, false);
        msg.textContent = 'Apunta al foco de basura y toma la foto.';
      } catch (err) {
        msg.textContent = 'No pudimos acceder a la cámara (permiso denegado o sin cámara). Puedes usar una foto de prueba.';
        show(btn.demo, true);
      }
    });

    btn.shoot.addEventListener('click', () => {
      if (!video.videoWidth) { msg.textContent = 'La cámara aún está iniciando. Intenta de nuevo.'; return; }
      const scale = Math.min(1, 640 / video.videoWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(video.videoWidth * scale); c.height = Math.round(video.videoHeight * scale);
      const ctx = c.getContext('2d');
      ctx.drawImage(video, 0, 0, c.width, c.height);
      const text = stampText();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, c.height - 30, c.width, 30);
      ctx.fillStyle = '#fff'; ctx.font = '15px Arial'; ctx.fillText(text, 10, c.height - 10);
      const g = EV.geo.get();
      stopStream();
      setPhoto({ dataUrl: c.toDataURL('image/jpeg', 0.6), ts: Date.now(), lat: g.lat, lng: g.lng, source: 'camera' });
    });

    btn.retake.addEventListener('click', () => { setPhoto(null); btn.open.click(); });

    btn.demo.addEventListener('click', () => {
      const g = EV.geo.get();
      setPhoto({ dataUrl: placeholder('FOTO DE PRUEBA', '#5b6b5f', stampText()), ts: Date.now(), lat: g.lat, lng: g.lng, source: 'demo' });
    });

    return {
      getPhoto: () => photo,
      reset: () => { stopStream(); setPhoto(null); },
      destroy: () => stopStream()
    };
  }
  return { mount, stopAll, placeholder };
})();
