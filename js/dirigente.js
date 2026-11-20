EV.camera = (function () {
  const activos = [];
  const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stopAll() {
    activos.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    activos.length = 0;
  }

  function sello() {
    const g = EV.geo.get();
    const d = new Date();
    return d.toLocaleDateString('es-PE') + ' ' + EV.util.horaTexto(d) + ' - ' + EV.util.fmtCoords(g.lat, g.lng);
  }

  function placeholder(titulo, color, textoSello) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="${color}"/>
      <text x="320" y="190" font-family="Arial" font-size="34" font-weight="bold" text-anchor="middle" fill="#fff">${titulo}</text>
      <text x="320" y="232" font-family="Arial" font-size="20" text-anchor="middle" fill="#fff" opacity=".85">Imagen de demostración</text>
      <rect y="360" width="640" height="40" fill="rgba(0,0,0,0.5)"/>
      <text x="12" y="386" font-family="Arial" font-size="18" fill="#fff">${textoSello}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function mount(root, opciones) {
    opciones = opciones || {};
    root.innerHTML = `
      <div class="camera">
        <div class="camera-frame">
          <div class="camera-vacio">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>
            <p>La vista de la cámara aparecerá aquí</p>
          </div>
          <video class="camera-video" autoplay playsinline muted hidden aria-label="Vista previa de la cámara"></video>
          <img class="camera-result" alt="Foto capturada con fecha, hora y ubicación" hidden>
          <div class="camera-flash" aria-hidden="true"></div>
          <div class="camera-proceso" aria-hidden="true"><span class="camera-puntos"><i></i><i></i><i></i></span>Procesando foto</div>
        </div>
        <p class="camera-msg text-muted" role="status"></p>
        <div class="camera-actions">
          <button type="button" class="btn btn-secondary" data-cam="open">Abrir cámara</button>
          <button type="button" class="btn btn-primary" data-cam="shoot" hidden>Tomar foto</button>
          <button type="button" class="btn btn-secondary" data-cam="retake" hidden>Repetir foto</button>
          <button type="button" class="btn btn-ghost" data-cam="demo" hidden>Usar foto de prueba</button>
        </div>
      </div>`;

    const marco = root.querySelector('.camera-frame');
    const vacio = root.querySelector('.camera-vacio');
    const video = root.querySelector('.camera-video');
    const img = root.querySelector('.camera-result');
    const msg = root.querySelector('.camera-msg');
    const btnAbrir = root.querySelector('[data-cam=open]');
    const btnTomar = root.querySelector('[data-cam=shoot]');
    const btnRepetir = root.querySelector('[data-cam=retake]');
    const btnPrueba = root.querySelector('[data-cam=demo]');
    let stream = null;
    let foto = null;
    let espera = null;

    function detener() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        const i = activos.indexOf(stream);
        if (i >= 0) activos.splice(i, 1);
        stream = null;
      }
      video.srcObject = null;
    }

    function botones(abrir, tomar, repetir, prueba) {
      btnAbrir.hidden = !abrir;
      btnTomar.hidden = !tomar;
      btnRepetir.hidden = !repetir;
      btnPrueba.hidden = !prueba;
    }

    function mostrarFoto(nueva) {
      clearTimeout(espera);
      img.src = nueva.dataUrl;
      img.hidden = false;
      vacio.hidden = true;
      botones(false, false, false, false);
      marco.classList.remove('disparo', 'procesando', 'revelado');
      void marco.offsetWidth;

      if (sinMovimiento()) {
        video.hidden = true;
        terminar();
        return;
      }

      marco.classList.add('disparo', 'procesando');
      msg.textContent = 'Procesando foto...';
      espera = setTimeout(() => {
        video.hidden = true;
        marco.classList.remove('procesando');
        marco.classList.add('revelado');
        espera = setTimeout(terminar, 450);
      }, 650);

      function terminar() {
        marco.classList.remove('disparo');
        foto = nueva;
        botones(false, false, true, false);
        if (nueva.source === 'demo') msg.textContent = 'Foto de prueba registrada (no es una foto real).';
        else msg.textContent = 'Foto capturada. Puedes repetirla si no se ve bien.';
        if (opciones.onChange) opciones.onChange(nueva);
      }
    }

    function quitarFoto() {
      clearTimeout(espera);
      foto = null;
      img.hidden = true;
      img.removeAttribute('src');
      marco.classList.remove('disparo', 'procesando', 'revelado');
      msg.textContent = '';
      if (opciones.onChange) opciones.onChange(null);
    }

    btnAbrir.addEventListener('click', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg.textContent = 'Este navegador no permite usar la cámara. Puedes usar una foto de prueba.';
        btnPrueba.hidden = false;
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        activos.push(stream);
        video.srcObject = stream;
        vacio.hidden = true;
        video.hidden = false;
        botones(false, true, false, false);
        msg.textContent = 'Apunta al foco de basura y toma la foto.';
      } catch (err) {
        msg.textContent = 'No pudimos acceder a la cámara. Puedes usar una foto de prueba.';
        btnPrueba.hidden = false;
      }
    });

    btnTomar.addEventListener('click', () => {
      if (!video.videoWidth) {
        msg.textContent = 'La cámara aún está iniciando. Intenta de nuevo.';
        return;
      }
      const escala = Math.min(1, 640 / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * escala);
      canvas.height = Math.round(video.videoHeight * escala);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = '#fff';
      ctx.font = '15px Arial';
      ctx.fillText(sello(), 10, canvas.height - 10);
      const g = EV.geo.get();
      detener();
      mostrarFoto({ dataUrl: canvas.toDataURL('image/jpeg', 0.6), ts: Date.now(), lat: g.lat, lng: g.lng, source: 'camera' });
    });

    btnRepetir.addEventListener('click', () => {
      quitarFoto();
      vacio.hidden = false;
      botones(true, false, false, false);
      btnAbrir.click();
    });

    btnPrueba.addEventListener('click', () => {
      const g = EV.geo.get();
      mostrarFoto({ dataUrl: placeholder('FOTO DE PRUEBA', '#5b6b5f', sello()), ts: Date.now(), lat: g.lat, lng: g.lng, source: 'demo' });
    });

    return {
      getPhoto: () => foto,
      reset: () => {
        detener();
        quitarFoto();
        video.hidden = true;
        vacio.hidden = false;
        botones(true, false, false, false);
      },
      destroy: () => {
        clearTimeout(espera);
        detener();
      }
    };
  }

  return { mount, stopAll, placeholder };
})();
