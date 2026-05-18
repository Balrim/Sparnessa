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

let _activeLoanId = null;

export function openLoanDetail(id, openFn) {
  _activeLoanId = id;
  const exp = state.expenses.find(e => e.id === id);
  if (!exp?.loan_details) return;
  _render(exp);
  openFn('loan-detail-modal');
}

export function registerLoanDetailModal(closeFn) {
  document.getElementById('btn-close-loan-detail')
    .addEventListener('click', () => closeFn('loan-detail-modal'));
  document.getElementById('btn-close-loan-detail-foot')
    .addEventListener('click', () => closeFn('loan-detail-modal'));
  document.getElementById('btn-add-sp')
    .addEventListener('click', _showSpForm);
  document.getElementById('btn-cancel-sp')
    .addEventListener('click', _hideSpForm);
  document.getElementById('btn-confirm-sp')
    .addEventListener('click', _confirmSp);
}

function _fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function _render(exp) {
  const ld      = exp.loan_details;
  const today   = isoToday();
  const debt    = calculateRemainingDebt(ld, today);
  const total   = calculateTotalInterest(ld);
  const remTerm = calculateRemainingTerm(ld, today);
  const savings = calculateSpecialPaymentSavings(ld);
  const payoff  = calculatePayoffDate(ld);

  document.getElementById('ld-title').textContent    = exp.name;
  document.getElementById('ld-debt').textContent     = fmtEur(debt);
  document.getElementById('ld-rate').textContent     = fmtEur(exp.amount);
  document.getElementById('ld-term').textContent     = `${remTerm} Monate`;
  document.getElementById('ld-interest').textContent = fmtEur(total);
  document.getElementById('ld-end').textContent      = _fmtDate(payoff);

  const sorted = [...(ld.special_payments || [])].sort((a, b) => a.date.localeCompare(b.date));
  const spList = document.getElementById('ld-sp-list');
  spList.innerHTML = sorted.length === 0
    ? '<div class="ld-empty">Keine Sondertilgungen eingetragen</div>'
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

  const savingsEl = document.getElementById('ld-savings');
  if (savings.saved_months > 0 || savings.saved_interest > 0) {
    savingsEl.style.display = '';
    document.getElementById('ld-savings-text').innerHTML =
      `−${savings.saved_months} Monat${savings.saved_months !== 1 ? 'e' : ''} · −${fmtEur(savings.saved_interest)} Zinsen<br>neues Ende: ${_fmtDate(payoff)}`;
  } else {
    savingsEl.style.display = 'none';
  }

  _hideSpForm();
}

function _showSpForm() {
  document.getElementById('ld-sp-form').style.display = '';
  document.getElementById('btn-add-sp').style.display = 'none';
  document.getElementById('sp-amount').value = '';
  const spDateEl = document.getElementById('sp-date');
  spDateEl.value = isoToday();
  initCustomDatePicker(spDateEl);
}

function _hideSpForm() {
  document.getElementById('ld-sp-form').style.display = 'none';
  document.getElementById('btn-add-sp').style.display = '';
}

async function _confirmSp() {
  const exp = state.expenses.find(e => e.id === _activeLoanId);
  if (!exp?.loan_details) return;
  const date   = document.getElementById('sp-date').value;
  const amount = parseFloat(document.getElementById('sp-amount').value);
  if (!date || isNaN(amount) || amount <= 0) return;

  const newLd = {
    ...exp.loan_details,
    special_payments: [...(exp.loan_details.special_payments || []), { date, amount }],
  };
  try {
    await api.updateExpense(_activeLoanId, { ...exp, loan_details: newLd });
    await refresh();
    _render(state.expenses.find(e => e.id === _activeLoanId));
  } catch (err) {
    console.error('Sondertilgung konnte nicht gespeichert werden:', err);
  }
}

async function _deleteSp(index) {
  const exp = state.expenses.find(e => e.id === _activeLoanId);
  if (!exp?.loan_details) return;
  const sorted  = [...exp.loan_details.special_payments].sort((a, b) => a.date.localeCompare(b.date));
  const toRemove = sorted[index];
  let removed = false;
  const newSps = exp.loan_details.special_payments.filter(sp => {
    if (!removed && sp.date === toRemove.date && sp.amount === toRemove.amount) {
      removed = true;
      return false;
    }
    return true;
  });
  const newLd = { ...exp.loan_details, special_payments: newSps };
  try {
    await api.updateExpense(_activeLoanId, { ...exp, loan_details: newLd });
    await refresh();
    _render(state.expenses.find(e => e.id === _activeLoanId));
  } catch (err) {
    console.error('Sondertilgung konnte nicht gelöscht werden:', err);
  }
}
