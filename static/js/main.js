import { injectIcons } from './icons.js';
import { state, subscribe, refresh } from './state.js';
import { api } from './api.js';
import { renderSummary  } from './render/summary.js';
import { renderChart    } from './render/chart.js';
import { renderTimeline } from './render/timeline.js';
import { renderMiniLists} from './render/lists.js';
import { registerSettingsModal } from './modals/settings.js';
import { openEntry, registerEntryModal } from './modals/entry.js';
import { registerResetModal } from './modals/reset.js';

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelector('.modal-overlay.open'))
    document.body.style.overflow = '';
}

let _statusTimer = null;
function showStatus(type, msg) {
  const el = document.getElementById('save-status');
  if (!el) return;
  clearTimeout(_statusTimer);
  el.className = 'save-status ' + type;
  el.textContent = msg;
  _statusTimer = setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 2500);
}

function renderAll(s) {
  renderSummary(s);
  renderChart(s);
  renderTimeline(s);
  renderMiniLists(s);
  const el = document.getElementById('next-salary-text');
  if (el) {
    el.textContent = s.settings.next_salary_date
      ? `Bis ${new Date(s.settings.next_salary_date + 'T00:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
      : 'Kein Gehaltsdatum';
  }
}

async function _delete(type, id) {
  if (type === 'expense') await api.deleteExpense(id);
  else await api.deleteIncome(id);
  await refresh();
}

async function init() {
  injectIcons();
  subscribe(renderAll);

  registerSettingsModal(openModal, closeModal, showStatus);
  registerEntryModal(openModal, closeModal, showStatus);
  registerResetModal(closeModal);

  document.getElementById('btn-add-expense').addEventListener('click',
    () => openEntry('expense', null, openModal));
  document.getElementById('btn-add-expense-2').addEventListener('click',
    () => openEntry('expense', null, openModal));
  document.getElementById('btn-add-income').addEventListener('click',
    () => openEntry('income', null, openModal));

  document.body.addEventListener('click', e => {
    const row = e.target.closest('.v3-mini-item');
    if (!row) return;
    const { id, type } = row.dataset;
    const btn = e.target.closest('.row-action');
    if (btn) {
      if (btn.dataset.action === 'edit')   openEntry(type, id, openModal);
      if (btn.dataset.action === 'delete') _delete(type, id);
    } else {
      openEntry(type, id, openModal);
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(o =>
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); }));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const open = document.querySelectorAll('.modal-overlay.open');
      if (open.length) closeModal(open[open.length - 1].id);
    }
    if (e.key === 'Enter' && document.getElementById('entry-modal').classList.contains('open')
        && e.target.tagName !== 'BUTTON' && !e.target.closest('.csel')) {
      e.preventDefault();
      document.getElementById('btn-save-entry').click();
    }
  });

  await refresh();

  if (!state.settings.next_salary_date && !state.expenses.length && !state.incomes.length)
    setTimeout(() => openModal('settings-modal'), 350);
}

document.addEventListener('DOMContentLoaded', init);
