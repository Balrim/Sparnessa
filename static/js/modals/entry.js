'use strict';
import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { CATEGORIES, INCOME_CATEGORIES, isoToday } from '../format.js';
import { initCustomSelect } from '../custom-select.js';
import { initCustomDatePicker } from '../custom-datepicker.js';

let _type = null, _id = null;

export function openEntry(type, id, openFn) {
  _type = type; _id = id || null;
  const isIncome = type === 'income';
  document.getElementById('entry-modal-title').textContent =
    _id ? (isIncome ? 'Einnahme bearbeiten' : 'Ausgabe bearbeiten')
        : (isIncome ? 'Einnahme hinzufügen' : 'Ausgabe hinzufügen');

  const sel = document.getElementById('e-category');
  sel.innerHTML = '';
  (isIncome ? INCOME_CATEGORIES : CATEGORIES).forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c; sel.appendChild(o);
  });

  const list  = isIncome ? state.incomes : state.expenses;
  const entry = _id ? list.find(e => e.id === _id) : null;
  document.getElementById('e-name').value     = entry?.name     ?? '';
  document.getElementById('e-amount').value   = entry?.amount   ?? '';
  document.getElementById('e-date').value     = entry?.next_date ?? isoToday();
  document.getElementById('e-end-date').value = entry?.end_date  ?? '';
  initCustomDatePicker(document.getElementById('e-date'));
  initCustomDatePicker(document.getElementById('e-end-date'));
  document.getElementById('e-interval').value = entry?.interval ?? 'monthly';
  document.getElementById('e-category').value = entry?.category ?? (isIncome ? 'Hauptjob' : 'Wohnen');

  initCustomSelect(document.getElementById('e-interval'));
  initCustomSelect(document.getElementById('e-category'));

  openFn('entry-modal');
  setTimeout(() => document.getElementById('e-name').focus(), 50);
}

export function registerEntryModal(openFn, closeFn, showStatus) {
  document.getElementById('btn-close-entry').addEventListener('click',  () => closeFn('entry-modal'));
  document.getElementById('btn-cancel-entry').addEventListener('click', () => closeFn('entry-modal'));
  document.getElementById('btn-save-entry').addEventListener('click',   () => _save(closeFn, showStatus));
}

async function _save(closeFn, showStatus) {
  const name     = document.getElementById('e-name').value.trim();
  const amount   = parseFloat(document.getElementById('e-amount').value);
  const nextDate = document.getElementById('e-date').value;
  const endDate  = document.getElementById('e-end-date').value || null;
  const interval = document.getElementById('e-interval').value;
  const category = document.getElementById('e-category').value;

  if (!name || isNaN(amount) || !nextDate)
    return _flashError('Bitte Name, Betrag und Datum ausfüllen.', showStatus);
  if (amount <= 0)
    return _flashError('Betrag muss größer als 0 sein.', showStatus);
  if (endDate && endDate < nextDate)
    return _flashError('Enddatum darf nicht vor dem Startdatum liegen.', showStatus);

  const data = { name, amount, next_date: nextDate, end_date: endDate, interval, category };

  try {
    if (_type === 'expense')
      _id ? await api.updateExpense(_id, data) : await api.createExpense(data);
    else
      _id ? await api.updateIncome(_id, data)  : await api.createIncome(data);
    await refresh();
    closeFn('entry-modal');
  } catch (err) {
    _flashError(err.message, showStatus);
  }
}

function _flashError(msg, showStatus) {
  showStatus('error', msg);
  const modal = document.querySelector('#entry-modal .modal');
  if (modal) {
    modal.style.boxShadow = '0 24px 60px rgba(0,0,0,0.5),0 0 0 1px var(--red)';
    setTimeout(() => { modal.style.boxShadow = ''; }, 600);
  }
}
