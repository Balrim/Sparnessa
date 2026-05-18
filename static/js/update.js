'use strict';

export function initUpdateBanner() {
  const banner  = document.getElementById('update-banner');
  const label   = document.getElementById('update-banner-text');
  const btnDl   = document.getElementById('btn-download-update');
  const btnDism = document.getElementById('btn-dismiss-update');

  async function check() {
    let info;
    try {
      const res = await fetch('/api/update-info');
      info = await res.json();
    } catch {
      return;
    }
    if (!info.available) return;

    label.textContent = `Neue Version verfügbar (v${info.version}) — Jetzt updaten`;
    banner.style.display = 'flex';
  }

  btnDl.addEventListener('click', async () => {
    btnDl.disabled = true;
    btnDl.textContent = 'Wird heruntergeladen…';

    try {
      const res = await fetch('/api/download-update', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        label.textContent = 'Download abgeschlossen — bitte alte .exe ersetzen und neu starten.';
        btnDl.style.display = 'none';
      } else {
        label.textContent = `Fehler: ${data.error}`;
        btnDl.disabled = false;
        btnDl.textContent = 'Erneut versuchen';
      }
    } catch {
      label.textContent = 'Netzwerkfehler beim Download.';
      btnDl.disabled = false;
      btnDl.textContent = 'Erneut versuchen';
    }
  });

  btnDism.addEventListener('click', () => {
    banner.style.display = 'none';
  });

  // Kurze Verzögerung damit Flask/Update-Thread Zeit hat
  setTimeout(check, 3000);
}
