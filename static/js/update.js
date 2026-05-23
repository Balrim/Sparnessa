'use strict';

export function initUpdateBanner() {
  const banner       = document.getElementById('update-banner');
  const label        = document.getElementById('update-banner-text');
  const btnDl        = document.getElementById('btn-download-update');
  const btnDism      = document.getElementById('btn-dismiss-update');
  const progressWrap = document.getElementById('update-progress-wrap');
  const progressBar  = document.getElementById('update-progress-bar');

  async function poll(attemptsLeft = 15) {
    if (attemptsLeft <= 0) return;
    let info;
    try {
      const res = await fetch('/api/update-info');
      info = await res.json();
    } catch {
      return;
    }
    if (!info.checked) {
      setTimeout(() => poll(attemptsLeft - 1), 1000);
      return;
    }
    if (info.available) {
      label.textContent = `Neue Version verfügbar (v${info.version}) — Jetzt updaten`;
      banner.style.display = 'flex';
    }
  }

  btnDl.addEventListener('click', () => {
    btnDl.disabled = true;
    btnDl.textContent = 'Wird heruntergeladen…';
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';

    const source = new EventSource('/api/download-update-stream');

    source.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.percent !== undefined) {
        if (data.percent < 0) {
          progressBar.classList.add('indeterminate');
        } else {
          progressBar.classList.remove('indeterminate');
          progressBar.style.width = data.percent + '%';
        }
      } else if (data.done) {
        source.close();
        progressBar.classList.remove('indeterminate');
        progressBar.style.width = '100%';
        setTimeout(() => {
          progressWrap.style.display = 'none';
          label.textContent = 'Download abgeschlossen — bitte alte .exe ersetzen und neu starten.';
          btnDl.style.display = 'none';
        }, 400);
      } else if (data.error) {
        source.close();
        progressWrap.style.display = 'none';
        label.textContent = `Fehler: ${data.error}`;
        btnDl.disabled = false;
        btnDl.textContent = 'Erneut versuchen';
      }
    };

    source.onerror = () => {
      source.close();
      progressWrap.style.display = 'none';
      label.textContent = 'Netzwerkfehler beim Download.';
      btnDl.disabled = false;
      btnDl.textContent = 'Erneut versuchen';
    };
  });

  btnDism.addEventListener('click', () => {
    banner.style.display = 'none';
  });

  setTimeout(() => poll(), 1000);
}
