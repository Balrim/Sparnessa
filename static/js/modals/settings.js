import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { isoToday } from '../format.js';
import { initCustomDatePicker } from '../custom-datepicker.js';

export function registerSettingsModal(openFn, closeFn, showStatus) {
  const ctrl = document.getElementById('chart-periods-ctrl');
  ctrl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('chart_periods', btn.dataset.val);
      ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      import('../state.js').then(m => m.refresh());
    });
  });

  document.getElementById('btn-open-settings').addEventListener('click', () => {
    _fillForm(state.settings);
    const val = localStorage.getItem('chart_periods') || '2';
    ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
    openFn('settings-modal');
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => closeFn('settings-modal'));
  document.getElementById('btn-cancel-settings').addEventListener('click', () => closeFn('settings-modal'));

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const data = {
      current_date:       document.getElementById('s-date').value,
      balance:            parseFloat(document.getElementById('s-balance').value) || 0,
      disposition_limit:  parseFloat(document.getElementById('s-dispo').value) || 0,
      next_salary_date:   document.getElementById('s-salary-date').value || null,
      next_salary_amount: parseFloat(document.getElementById('s-salary-amount').value) || 0,
    };
    try {
      await api.saveSettings(data);
      await refresh();
      closeFn('settings-modal');
    } catch (err) {
      showStatus('error', err.message);
    }
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    window.location.href = '/api/export';
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        await api.importData(data);
        await refresh();
        closeFn('settings-modal');
      } catch (err) {
        showStatus('error', 'Import fehlgeschlagen: ' + err.message);
      }
    };
    input.click();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    closeFn('settings-modal');
    openFn('reset-modal');
  });
}

function _fillForm(s) {
  document.getElementById('s-date').value          = s.current_date || isoToday();
  document.getElementById('s-balance').value       = s.balance ?? 0;
  document.getElementById('s-dispo').value         = s.disposition_limit ?? -1300;
  document.getElementById('s-salary-date').value   = s.next_salary_date || '';
  document.getElementById('s-salary-amount').value = s.next_salary_amount ?? 1800;
  initCustomDatePicker(document.getElementById('s-date'));
  initCustomDatePicker(document.getElementById('s-salary-date'));
}
