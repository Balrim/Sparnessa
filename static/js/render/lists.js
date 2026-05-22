import { fmtEur, fmtShortDate, fmtMonthYear, escapeHtml, INTERVAL_LABELS, isoToday } from '../format.js';
import { iconFor } from '../icons.js';
import { calculatePayoffDate, calculateRemainingDebt, calculateCurrentPayment, calculateTotalInterest } from '../loan.js';

export function renderMiniLists(state) {
  const expensesSorted = [...state.expenses].sort((a, b) => b.amount - a.amount);
  _render('expenses-list', expensesSorted, 'expense');
  const incomesSorted = [...state.incomes].sort((a, b) => b.amount - a.amount);
  _render('incomes-list',  incomesSorted,  'income');
}

function _loanDonePanel(e) {
  const ld = e.loan_details;
  const totalInterest = calculateTotalInterest(ld);
  const totalPaid = ld.principal + totalInterest;
  const payoffDate = calculatePayoffDate(ld);
  const sps = [...(ld.special_payments || [])].sort((a, b) => a.date.localeCompare(b.date));
  const spRows = sps.length === 0
    ? `<span style="color:var(--label-tertiary);font-size:12px">Keine Sondertilgungen</span>`
    : sps.map(sp => `
        <div class="ldp-sp-item">
          <span class="ldp-sp-date">${escapeHtml(fmtShortDate(sp.date))}${escapeHtml(sp.date.slice(2, 4))}</span>
          <span class="ldp-sp-amt">+${escapeHtml(fmtEur(sp.amount))}</span>
        </div>`).join('');

  return `
  <div class="loan-done-panel" id="ldp-${escapeHtml(e.id)}">
    <div class="loan-done-panel-inner">
      <div class="ldp-grid">
        <div class="ldp-row">
          <div class="ldp-label">Ursprungsbetrag</div>
          <div class="ldp-value">${escapeHtml(fmtEur(ld.principal))}</div>
        </div>
        <div class="ldp-row">
          <div class="ldp-label">Zinssatz</div>
          <div class="ldp-value">${escapeHtml(String(ld.interest_rate))} %</div>
        </div>
        <div class="ldp-row">
          <div class="ldp-label">Abgeschlossen</div>
          <div class="ldp-value green">${escapeHtml(fmtMonthYear(payoffDate))}</div>
        </div>
        <div class="ldp-row">
          <div class="ldp-label">Laufzeit</div>
          <div class="ldp-value">${escapeHtml(String(ld.term_months))} Monate</div>
        </div>
        <div class="ldp-divider"></div>
        <div class="ldp-row">
          <div class="ldp-label">Gesamt gezahlt</div>
          <div class="ldp-value accent">${escapeHtml(fmtEur(totalPaid))}</div>
        </div>
        <div class="ldp-row">
          <div class="ldp-label">davon Zinsen</div>
          <div class="ldp-value red">+${escapeHtml(fmtEur(totalInterest))}</div>
        </div>
        <div class="ldp-divider"></div>
        <div class="ldp-sp-section">
          <div class="ldp-sp-title">Sondertilgungen</div>
          ${spRows}
        </div>
      </div>
    </div>
  </div>`;
}

function _render(rootId, items, type) {
  const root = document.getElementById(rootId);
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-${type === 'income' ? 'bag' : 'tag'}"/></svg></div>${type === 'income' ? 'Noch keine Einnahmen' : 'Noch keine Ausgaben'} eingetragen.</div>`;
    return;
  }
  const color = type === 'income'
    ? 'background:rgba(48,209,88,0.15);color:var(--green)'
    : 'background:rgba(191,90,242,0.15);color:var(--accent)';
  const today = isoToday();
  root.innerHTML = items.map(e => {
    const isLoan         = type === 'expense' && e.category === 'Darlehen';
    const isIncomeLoan   = type === 'income'  && e.category === 'Privatdarlehen';
    const hasLoan        = isLoan || isIncomeLoan;
    const loanEndDate    = hasLoan && e.loan_details ? calculatePayoffDate(e.loan_details) : e.end_date;
    const meta = isLoan && e.loan_details
      ? `Kredit · ${escapeHtml(fmtEur(e.loan_details.principal, {}))} · ${escapeHtml(String(e.loan_details.interest_rate))}% · bis ${escapeHtml(fmtMonthYear(loanEndDate))}`
      : isIncomeLoan && e.loan_details
        ? `Privatdarlehen · ${escapeHtml(fmtEur(e.loan_details.principal, {}))} · ${escapeHtml(String(e.loan_details.interest_rate))}% · bis ${escapeHtml(fmtMonthYear(loanEndDate))}`
        : `${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval}${e.end_date ? ' · bis ' + escapeHtml(fmtMonthYear(e.end_date)) : ''}`;
    const remaining = hasLoan && e.loan_details
      ? calculateRemainingDebt(e.loan_details, today) : null;
    const isPaidOff = hasLoan && e.loan_details && remaining <= 0.01;

    const loanBtn = isPaidOff
      ? `<button class="row-action info-btn" data-action="loan-done-info" aria-label="Darlehensübersicht"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
      : isLoan
        ? `<button class="row-action loan-info" data-action="loan-detail" aria-label="Darlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
        : isIncomeLoan
          ? `<button class="row-action income-loan-info" data-action="income-loan-detail" aria-label="Privatdarlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
          : '';

    let progressBar = '';
    if (hasLoan && e.loan_details) {
      if (isPaidOff) {
        const cls = isIncomeLoan ? 'loan-progress-bar income' : 'loan-progress-bar';
        progressBar = `<div class="${cls}"><div class="loan-progress-fill" style="width:100%;background:linear-gradient(90deg,rgba(48,209,88,0.45),rgba(48,209,88,0.85))"></div></div>`;
      } else {
        const pct = Math.min(100, Math.max(0, (1 - remaining / e.loan_details.principal) * 100));
        const cls = isIncomeLoan ? 'loan-progress-bar income' : 'loan-progress-bar';
        progressBar = `<div class="${cls}"><div class="loan-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>`;
      }
    }

    const displayAmount = hasLoan && e.loan_details && !isPaidOff
      ? calculateCurrentPayment(e.loan_details, today)
      : e.amount;
    const iconColor = isPaidOff
      ? 'background:rgba(48,209,88,0.12);color:#30D158'
      : color;
    const iconSvg = isPaidOff
      ? `<svg width="16" height="16"><use href="#i-check"/></svg>`
      : `<svg width="16" height="16"><use href="#i-${iconFor(e)}"/></svg>`;
    const metaEl = isPaidOff
      ? `<div class="v3-mini-meta" style="color:#30D158;opacity:0.85">Vollständig abbezahlt · ${escapeHtml(fmtMonthYear(calculatePayoffDate(e.loan_details)))}</div>`
      : `<div class="v3-mini-meta">${meta}</div>`;
    const amountEl = isPaidOff
      ? `<div class="loan-done-badge"><svg width="12" height="12"><use href="#i-check"/></svg>Abbezahlt</div>`
      : `<div class="v3-mini-amount ${type === 'income' ? 'pos' : 'neg'}">${type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(displayAmount).replace('−', ''))}</div>`;
    const editBtn = isPaidOff
      ? ''
      : `<button class="row-action" data-action="edit" aria-label="Bearbeiten"><svg width="13" height="13"><use href="#i-pencil"/></svg></button>`;

    const itemHtml = `
    <div class="v3-mini-item${isPaidOff ? ' loan-done' : ''}" data-id="${escapeHtml(e.id)}" data-type="${type}"${isLoan ? ' data-loan="true"' : ''}${isIncomeLoan ? ' data-income-loan="true"' : ''}>
      <div class="v3-mini-icon" style="${iconColor}">${iconSvg}</div>
      <div>
        <div class="v3-mini-name">${escapeHtml(e.name)}</div>
        ${metaEl}
      </div>
      ${amountEl}
      <div class="row-actions">
        ${loanBtn}
        ${editBtn}
        <button class="row-action danger" data-action="delete" aria-label="Löschen"><svg width="13" height="13"><use href="#i-trash"/></svg></button>
      </div>
      ${progressBar}
    </div>`;

    return isPaidOff ? itemHtml + _loanDonePanel(e) : itemHtml;
  }).join('');
}
