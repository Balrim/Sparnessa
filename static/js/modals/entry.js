import { api } from '../api.js';
import { state, refresh } from '../state.js';
import { CATEGORIES, INCOME_CATEGORIES, isoToday, fmtEur } from '../format.js';
import {
  calculateMonthlyRate,
  calculateTermFromRate,
  calculateEndDate,
  calculateTotalInterest,
} from '../loan.js';
import { initCustomSelect } from '../custom-select.js';
import { initCustomDatePicker } from '../custom-datepicker.js';

let _type = null, _id = null;
let _currentLoanCalc = null;
let _loanListenersAttached = false;

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

  if (!isIncome) {
    _initLoanSection(entry);
    const catEl = document.getElementById('e-category');
    catEl.removeEventListener('change', _onCategoryChange);
    catEl.addEventListener('change', _onCategoryChange);
  } else {
    _toggleLoanSection(false);
  }

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

  let loanDetails = null;
  if (category === 'Darlehen') {
    if (!_currentLoanCalc) return _flashError('Bitte Darlehensdaten vollständig eingeben.', showStatus);
    const { rate, termMonths, endDate: loanEndDate, loanDetails: ld } = _currentLoanCalc;
    // Preserve existing special payments when editing
    const existingEntry = _id ? (state.expenses.find(e => e.id === _id)) : null;
    const existingSp = existingEntry?.loan_details?.special_payments || [];
    loanDetails = { ...ld, special_payments: existingSp };
    data.amount   = rate;
    data.end_date = loanEndDate;
    data.interval = 'monthly';
  }
  Object.assign(data, { loan_details: loanDetails });

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

function _onCategoryChange() {
  const cat = document.getElementById('e-category').value;
  _toggleLoanSection(cat === 'Darlehen');
  if (cat === 'Darlehen') _recalcLoan();
}

function _toggleLoanSection(show) {
  document.getElementById('loan-section').style.display = show ? '' : 'none';
}

function _initLoanSection(entry) {
  const cat = entry?.category || '';
  _toggleLoanSection(cat === 'Darlehen');

  const ctrl = document.getElementById('loan-mode-ctrl');
  // Reset to default mode
  ctrl.querySelectorAll('.seg-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
  document.getElementById('l-term-field').style.display = '';
  document.getElementById('l-rate-field').style.display = 'none';

  // Wire up mode toggle buttons (only once)
  if (!_loanListenersAttached) {
    ctrl.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const isCalculate = btn.dataset.val === 'calculate';
        document.getElementById('l-term-field').style.display  = isCalculate ? '' : 'none';
        document.getElementById('l-rate-field').style.display  = isCalculate ? 'none' : '';
        _recalcLoan();
      });
    });
  }

  // Load existing loan data
  const ld = entry?.loan_details;
  document.getElementById('l-principal').value = ld?.principal    ?? '';
  document.getElementById('l-interest').value  = ld?.interest_rate ?? '';
  document.getElementById('l-term').value      = ld?.term_months   ?? '';
  document.getElementById('l-start').value     = ld?.start_date    ?? isoToday();
  document.getElementById('l-rate').value      = '';

  // Live recalc on input (only once)
  if (!_loanListenersAttached) {
    ['l-principal','l-interest','l-term','l-rate','l-start'].forEach(id => {
      document.getElementById(id).addEventListener('input', _recalcLoan);
    });
    _loanListenersAttached = true;
  }

  _recalcLoan();
}

function _recalcLoan() {
  const principal = parseFloat(document.getElementById('l-principal').value);
  const interest  = parseFloat(document.getElementById('l-interest').value) || 0;
  const termInput = parseFloat(document.getElementById('l-term').value);
  const rateInput = parseFloat(document.getElementById('l-rate').value);
  const startDate = document.getElementById('l-start').value;
  const modeBtn   = document.querySelector('#loan-mode-ctrl .seg-btn.active');
  const mode      = modeBtn?.dataset.val || 'calculate';

  const resultEl = document.getElementById('loan-result');
  if (!principal || !startDate || isNaN(principal)) { resultEl.style.display = 'none'; return; }

  let rate, termMonths;
  if (mode === 'calculate') {
    if (!termInput || isNaN(termInput)) { resultEl.style.display = 'none'; return; }
    termMonths = Math.round(termInput);
    rate = calculateMonthlyRate(principal, interest, termMonths);
  } else {
    if (!rateInput || isNaN(rateInput)) { resultEl.style.display = 'none'; return; }
    rate = rateInput;
    termMonths = calculateTermFromRate(principal, interest, rate);
  }

  const endDate     = calculateEndDate(startDate, termMonths);
  const loanDetails = { principal, interest_rate: interest, term_months: termMonths,
                        start_date: startDate, amount: rate, special_payments: [] };
  const totalInterest = calculateTotalInterest(loanDetails);

  document.getElementById('lr-rate').textContent     = fmtEur(rate);
  document.getElementById('lr-term').textContent     = `${termMonths} Monate`;
  document.getElementById('lr-end').textContent      = endDate;
  document.getElementById('lr-interest').textContent = fmtEur(totalInterest);
  resultEl.style.display = '';

  _currentLoanCalc = { rate, termMonths, endDate, loanDetails };
}
