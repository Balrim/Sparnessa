'use strict';
import { state, refresh } from '../state.js';
import { api } from '../api.js';
import { fmtEur, fmtShortDate, isoToday } from '../format.js';
import { initCustomDatePicker } from '../custom-datepicker.js';
import {
  calculateRemainingDebt,
  calculateTotalInterest,
  calculateRemainingTerm,
  calculateSpecialPaymentSavings,
  calculatePayoffDate,
} from '../loan.js';

let _activeId = null;

export function openIncomeLoanDetail(id, openFn) {
  _activeId = id;
  const inc = state.incomes.find(e => e.id === id);
  if (!inc?.loan_details) return;
  _render(inc);
  openFn('income-loan-detail-modal');
}

export function registerIncomeLoanDetailModal(closeFn) {
  document.getElementById('btn-close-income-loan-detail')
    .addEventListener('click', () => closeFn('income-loan-detail-modal'));
  document.getElementById('btn-close-income-loan-detail-foot')
    .addEventListener('click', () => closeFn('income-loan-detail-modal'));
  document.getElementById('btn-add-ild-sp')
    .addEventListener('click', _showSpForm);
  document.getElementById('btn-cancel-ild-sp')
    .addEventListener('click', _hideSpForm);
  document.getElementById('btn-confirm-ild-sp')
    .addEventListener('click', _confirmSp);
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function _render(inc) {
  const ld      = inc.loan_details;
  const today   = isoToday();
  const debt    = calculateRemainingDebt(ld, today);
  const total   = calculateTotalInterest(ld);
  const remTerm = calculateRemainingTerm(ld, today);
  const savings = calculateSpecialPaymentSavings(ld);
  const payoff  = calculatePayoffDate(ld);

  document.getElementById('ild-title').textContent    = inc.name;
  document.getElementById('ild-debt').textContent     = fmtEur(debt);
  document.getElementById('ild-rate').textContent     = fmtEur(inc.amount);
  document.getElementById('ild-term').textContent     = `${remTerm} Monate`;
  document.getElementById('ild-interest').textContent = fmtEur(total);
  document.getElementById('ild-end').textContent      = _fmtDate(payoff);

  const sorted = [...(ld.special_payments || [])].sort((a, b) => a.date.localeCompare(b.date));
  const spList = document.getElementById('ild-sp-list');
  spList.innerHTML = sorted.length === 0
    ? '<div class="ld-empty">Keine Sonderzahlungen eingetragen</div>'
    : sorted.map((sp, i) => `
        <div class="ld-sp-item">
          <span class="ld-sp-date">${fmtShortDate(sp.date)}${sp.date.slice(2,4)}</span>
          <span class="ld-sp-amount">${fmtEur(sp.amount)}</span>
          <button class="row-action danger" data-sp-idx="${i}" aria-label="Löschen">
            <svg width="12" height="12"><use href="#i-trash"/></svg>
          </button>
        </div>`).join('');

  spList.querySelectorAll('[data-sp-idx]').forEach(btn => {
    btn.addEventListener('click', () => _deleteSp(parseInt(btn.dataset.spIdx)));
  });

  const savingsEl = document.getElementById('ild-savings');
  if (savings.saved_months > 0 || savings.saved_interest > 0) {
    savingsEl.style.display = '';
    document.getElementById('ild-savings-text').innerHTML =
      `−${savings.saved_months} Monat${savings.saved_months !== 1 ? 'e' : ''} · −${fmtEur(savings.saved_interest)} Zinsen<br>neues Ende: ${_fmtDate(payoff)}`;
  } else {
    savingsEl.style.display = 'none';
  }

  _hideSpForm();
}

function _showSpForm() {
  document.getElementById('ild-sp-form').style.display = '';
  document.getElementById('btn-add-ild-sp').style.display = 'none';
  document.getElementById('ild-sp-amount').value = '';
  const spDateEl = document.getElementById('ild-sp-date');
  spDateEl.value = isoToday();
  initCustomDatePicker(spDateEl);
}

function _hideSpForm() {
  document.getElementById('ild-sp-form').style.display = 'none';
  document.getElementById('btn-add-ild-sp').style.display = '';
}

async function _confirmSp() {
  const inc = state.incomes.find(e => e.id === _activeId);
  if (!inc?.loan_details) return;
  const date   = document.getElementById('ild-sp-date').value;
  const amount = parseFloat(document.getElementById('ild-sp-amount').value);
  if (!date || isNaN(amount) || amount <= 0) return;

  const newLd = {
    ...inc.loan_details,
    special_payments: [...(inc.loan_details.special_payments || []), { date, amount }],
  };
  try {
    await api.updateIncome(_activeId, { ...inc, loan_details: newLd });
    await refresh();
    _render(state.incomes.find(e => e.id === _activeId));
  } catch (err) {
    console.error('Sonderzahlung konnte nicht gespeichert werden:', err);
  }
}

async function _deleteSp(index) {
  const inc = state.incomes.find(e => e.id === _activeId);
  if (!inc?.loan_details) return;
  const sorted   = [...inc.loan_details.special_payments].sort((a, b) => a.date.localeCompare(b.date));
  const toRemove = sorted[index];
  let removed = false;
  const newSps = inc.loan_details.special_payments.filter(sp => {
    if (!removed && sp.date === toRemove.date && sp.amount === toRemove.amount) {
      removed = true;
      return false;
    }
    return true;
  });
  const newLd = { ...inc.loan_details, special_payments: newSps };
  try {
    await api.updateIncome(_activeId, { ...inc, loan_details: newLd });
    await refresh();
    _render(state.incomes.find(e => e.id === _activeId));
  } catch (err) {
    console.error('Sonderzahlung konnte nicht gelöscht werden:', err);
  }
}
