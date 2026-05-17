import { api } from '../api.js';
import { refresh } from '../state.js';

export function registerResetModal(closeFn) {
  document.getElementById('btn-close-reset').addEventListener('click',   () => closeFn('reset-modal'));
  document.getElementById('btn-cancel-reset').addEventListener('click',  () => closeFn('reset-modal'));
  document.getElementById('btn-confirm-reset').addEventListener('click', async () => {
    await api.resetData();
    await refresh();
    closeFn('reset-modal');
  });
}
