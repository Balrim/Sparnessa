'use strict';
import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { isoToday, fmtEur } from '../format.js';
import {
  calculateMonthlyRate,
  calculateTermFromRate,
  calculateEndDate,
  calculateTotalInterest,
} from '../loan.js';
import { initCustomDatePicker } from '../custom-datepicker.js';

let _id = null;
let _calc = null;
let _listenersAttached = false;

export function openLoan(id, openFn) {
  _id = id || null;
  document.getElementById('loan-modal-title').textContent =
    _id ? 'Kredit bearbeiten' : 'Kredit hinzufügen';

  const entry = _id ? state.expenses.find(e => e.id === _id) : null;
  const ld    = entry?.loan_details;

  document.getElementById('lm-name').value      = entry?.name       ?? '';
  document.getElementById('lm-principal').value = ld?.principal     ?? '';
  document.getElementById('lm-interest').value  = ld?.interest_rate ?? '';
  document.getElementById('lm-start').value     = ld?.start_date    ?? isoToday();
  document.getElementById('lm-next').value      = entry?.next_date  ?? isoToday();
  initCustomDatePicker(document.getElementById('lm-start'));
  initCustomDatePicker(document.getElementById('lm-next'));

  const rateMode = ld?.rate_mode || 'calculate';
  const ctrl = document.getElementById('lm-mode-ctrl');
  ctrl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === rateMode);
  });
  _toggleMode(rateMode);

  if (rateMode === 'calculate') {
    document.getElementById('lm-term').value = ld?.term_months ?? '';
    document.getElementById('lm-rate').value = '';
  } else {
    document.getElementById('lm-term').value = '';
    document.getElementById('lm-rate').value = entry?.amount ?? '';
  }

  if (!_listenersAttached) {
    ctrl.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _toggleMode(btn.dataset.val);
        _recalc();
      });
    });
    ['lm-principal', 'lm-interest', 'lm-term', 'lm-rate'].forEach(id => {
      document.getElementById(id).addEventListener('input', _recalc);
    });
    document.getElementById('lm-start').addEventListener('change', _recalc);
    _listenersAttached = true;
  }

  _calc = null;
  _recalc();
  openFn('loan-modal');
  setTimeout(() => document.getElementById('lm-name').focus(), 50);
}

export function registerLoanModal(openFn, closeFn, showStatus) {
  document.getElementById('btn-close-loan').addEventListener('click',  () => closeFn('loan-modal'));
  document.getElementById('btn-cancel-loan').addEventListener('click', () => closeFn('loan-modal'));
  document.getElementById('btn-save-loan').addEventListener('click',   () => _save(closeFn, showStatus));
}

function _toggleMode(mode) {
  document.getElementById('lm-term-field').style.display = mode === 'calculate' ? '' : 'none';
  document.getElementById('lm-rate-field').style.display = mode === 'enter'     ? '' : 'none';
}

function _recalc() {
  const principal = parseFloat(document.getElementById('lm-principal').value);
  const interest  = parseFloat(document.getElementById('lm-interest').value) || 0;
  const startDate = document.getElementById('lm-start').value;
  const modeBtn   = document.querySelector('#lm-mode-ctrl .seg-btn.active');
  const mode      = modeBtn?.dataset.val || 'calculate';
  const resultEl  = document.getElementById('lm-result');

  if (!principal || !startDate || isNaN(principal)) { resultEl.style.display = 'none'; _calc = null; return; }

  let rate, termMonths;
  if (mode === 'calculate') {
    const termInput = parseFloat(document.getElementById('lm-term').value);
    if (!termInput || isNaN(termInput)) { resultEl.style.display = 'none'; _calc = null; return; }
    termMonths = Math.round(termInput);
    rate = calculateMonthlyRate(principal, interest, termMonths);
  } else {
    const rateInput = parseFloat(document.getElementById('lm-rate').value);
    if (!rateInput || isNaN(rateInput)) { resultEl.style.display = 'none'; _calc = null; return; }
    rate = rateInput;
    termMonths = calculateTermFromRate(principal, interest, rate);
  }

  const endDate      = calculateEndDate(startDate, termMonths);
  const loanDetails  = { principal, interest_rate: interest, term_months: termMonths,
                         start_date: startDate, amount: rate, rate_mode: mode, special_payments: [] };
  const totalInterest = calculateTotalInterest(loanDetails);

  document.getElementById('lm-res-calc-label').textContent = mode === 'calculate' ? 'Monatsrate' : 'Laufzeit';
  document.getElementById('lm-res-calc-value').textContent = mode === 'calculate' ? fmtEur(rate) : `${termMonths} Monate`;
  document.getElementById('lm-res-end').textContent        = endDate;
  document.getElementById('lm-res-interest').textContent   = fmtEur(totalInterest);
  document.getElementById('lm-res-total').textContent      = fmtEur(principal + totalInterest);
  resultEl.style.display = '';

  _calc = { rate, termMonths, endDate, loanDetails };
}

async function _save(closeFn, showStatus) {
  const name     = document.getElementById('lm-name').value.trim();
  const nextDate = document.getElementById('lm-next').value;

  if (!name)     return _flashError('Bitte eine Bezeichnung eingeben.', showStatus);
  if (!nextDate) return _flashError('Bitte nächstes Datum ausfüllen.', showStatus);
  if (!_calc)    return _flashError('Bitte Kreditdaten vollständig eingeben.', showStatus);

  const { rate, endDate, loanDetails: ld } = _calc;
  const existing   = _id ? state.expenses.find(e => e.id === _id) : null;
  const existingSp = existing?.loan_details?.special_payments || [];
  const loanDetails = { ...ld, special_payments: existingSp };

  const data = {
    name,
    amount:      rate,
    next_date:   nextDate,
    end_date:    endDate,
    interval:    'monthly',
    category:    'Darlehen',
    loan_details: loanDetails,
  };

  try {
    _id ? await api.updateExpense(_id, data) : await api.createExpense(data);
    await refresh();
    closeFn('loan-modal');
  } catch (err) {
    _flashError(err.message, showStatus);
  }
}

function _flashError(msg, showStatus) {
  showStatus('error', msg);
  const modal = document.querySelector('#loan-modal .modal');
  if (modal) {
    modal.style.boxShadow = '0 24px 60px rgba(0,0,0,0.5),0 0 0 1px var(--red)';
    setTimeout(() => { modal.style.boxShadow = ''; }, 600);
  }
}
