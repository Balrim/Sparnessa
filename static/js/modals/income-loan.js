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

export function openIncomeLoan(id, openFn) {
  _id = id || null;
  document.getElementById('income-loan-modal-title').textContent =
    _id ? 'Privatdarlehen bearbeiten' : 'Privatdarlehen hinzufügen';

  const entry = _id ? state.incomes.find(e => e.id === _id) : null;
  const ld    = entry?.loan_details;

  document.getElementById('ilm-name').value      = entry?.name       ?? '';
  document.getElementById('ilm-principal').value = ld?.principal     ?? '';
  document.getElementById('ilm-interest').value  = ld?.interest_rate ?? '';
  document.getElementById('ilm-start').value     = ld?.start_date    ?? isoToday();
  document.getElementById('ilm-next').value      = entry?.next_date  ?? isoToday();
  initCustomDatePicker(document.getElementById('ilm-start'));
  initCustomDatePicker(document.getElementById('ilm-next'));

  const rateMode = ld?.rate_mode || 'calculate';
  const ctrl = document.getElementById('ilm-mode-ctrl');
  ctrl.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === rateMode);
  });
  _toggleMode(rateMode);

  if (rateMode === 'calculate') {
    document.getElementById('ilm-term').value = ld?.term_months ?? '';
    document.getElementById('ilm-rate').value = '';
  } else {
    document.getElementById('ilm-term').value = '';
    document.getElementById('ilm-rate').value = entry?.amount ?? '';
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
    ['ilm-principal', 'ilm-interest', 'ilm-term', 'ilm-rate'].forEach(id => {
      document.getElementById(id).addEventListener('input', _recalc);
    });
    document.getElementById('ilm-start').addEventListener('change', _recalc);
    _listenersAttached = true;
  }

  _calc = null;
  _recalc();
  openFn('income-loan-modal');
  setTimeout(() => document.getElementById('ilm-name').focus(), 50);
}

export function registerIncomeLoanModal(openFn, closeFn, showStatus) {
  document.getElementById('btn-close-income-loan').addEventListener('click',  () => closeFn('income-loan-modal'));
  document.getElementById('btn-cancel-income-loan').addEventListener('click', () => closeFn('income-loan-modal'));
  document.getElementById('btn-save-income-loan').addEventListener('click',   () => _save(closeFn, showStatus));
}

function _toggleMode(mode) {
  document.getElementById('ilm-term-field').style.display = mode === 'calculate' ? '' : 'none';
  document.getElementById('ilm-rate-field').style.display = mode === 'enter'     ? '' : 'none';
}

function _recalc() {
  const principal = parseFloat(document.getElementById('ilm-principal').value);
  const interest  = parseFloat(document.getElementById('ilm-interest').value) || 0;
  const startDate = document.getElementById('ilm-start').value;
  const modeBtn   = document.querySelector('#ilm-mode-ctrl .seg-btn.active');
  const mode      = modeBtn?.dataset.val || 'calculate';
  const resultEl  = document.getElementById('ilm-result');

  if (!principal || !startDate || isNaN(principal)) { resultEl.style.display = 'none'; _calc = null; return; }

  let rate, termMonths;
  if (mode === 'calculate') {
    const termInput = parseFloat(document.getElementById('ilm-term').value);
    if (!termInput || isNaN(termInput)) { resultEl.style.display = 'none'; _calc = null; return; }
    termMonths = Math.round(termInput);
    rate = calculateMonthlyRate(principal, interest, termMonths);
  } else {
    const rateInput = parseFloat(document.getElementById('ilm-rate').value);
    if (!rateInput || isNaN(rateInput)) { resultEl.style.display = 'none'; _calc = null; return; }
    rate = rateInput;
    termMonths = calculateTermFromRate(principal, interest, rate);
  }

  const endDate      = calculateEndDate(startDate, termMonths);
  const loanDetails  = { principal, interest_rate: interest, term_months: termMonths,
                         start_date: startDate, amount: rate, rate_mode: mode, special_payments: [] };
  const totalInterest = calculateTotalInterest(loanDetails);

  document.getElementById('ilm-res-calc-label').textContent = mode === 'calculate' ? 'Monatsrate' : 'Laufzeit';
  document.getElementById('ilm-res-calc-value').textContent = mode === 'calculate' ? fmtEur(rate) : `${termMonths} Monate`;
  document.getElementById('ilm-res-end').textContent        = endDate;
  document.getElementById('ilm-res-interest').textContent   = fmtEur(totalInterest);
  document.getElementById('ilm-res-total').textContent      = fmtEur(principal + totalInterest);
  resultEl.style.display = '';

  _calc = { rate, termMonths, endDate, loanDetails };
}

async function _save(closeFn, showStatus) {
  const name     = document.getElementById('ilm-name').value.trim();
  const nextDate = document.getElementById('ilm-next').value;

  if (!name)     return _flashError('Bitte eine Bezeichnung eingeben.', showStatus);
  if (!nextDate) return _flashError('Bitte nächstes Datum ausfüllen.', showStatus);
  if (!_calc)    return _flashError('Bitte Darlehensdaten vollständig eingeben.', showStatus);

  const { rate, endDate, loanDetails: ld } = _calc;
  const existing   = _id ? state.incomes.find(e => e.id === _id) : null;
  const existingSp = existing?.loan_details?.special_payments || [];
  const loanDetails = { ...ld, special_payments: existingSp };

  const data = {
    name,
    amount:      rate,
    next_date:   nextDate,
    end_date:    endDate,
    interval:    'monthly',
    category:    'Privatdarlehen',
    loan_details: loanDetails,
  };

  try {
    _id ? await api.updateIncome(_id, data) : await api.createIncome(data);
    await refresh();
    closeFn('income-loan-modal');
  } catch (err) {
    _flashError(err.message, showStatus);
  }
}

function _flashError(msg, showStatus) {
  showStatus('error', msg);
  const modal = document.querySelector('#income-loan-modal .modal');
  if (modal) {
    modal.style.boxShadow = '0 24px 60px rgba(0,0,0,0.5),0 0 0 1px var(--red)';
    setTimeout(() => { modal.style.boxShadow = ''; }, 600);
  }
}
