import { fmtEur, fmtShortDate, escapeHtml, INTERVAL_LABELS } from '../format.js';
import { iconFor } from '../icons.js';
import { calculatePayoffDate } from '../loan.js';

export function renderMiniLists(state) {
  const expensesSorted = [...state.expenses].sort((a, b) => b.amount - a.amount);
  _render('expenses-list', expensesSorted, 'expense');
  const incomesSorted = [...state.incomes].sort((a, b) => b.amount - a.amount);
  _render('incomes-list',  incomesSorted,  'income');
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
  root.innerHTML = items.map(e => {
    const isLoan = type === 'expense' && e.category === 'Darlehen';
    const loanEndDate = isLoan && e.loan_details ? calculatePayoffDate(e.loan_details) : e.end_date;
    const meta = isLoan && e.loan_details
      ? `Kredit · ${escapeHtml(fmtEur(e.loan_details.principal, {}))} · ${escapeHtml(String(e.loan_details.interest_rate))}% · bis ${escapeHtml(fmtShortDate(loanEndDate))}`
      : `${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval} · nächst. ${escapeHtml(fmtShortDate(e.next_date))}${e.end_date ? ' · bis ' + escapeHtml(fmtShortDate(e.end_date)) : ''}`;
    const loanBtn = isLoan
      ? `<button class="row-action loan-info" data-action="loan-detail" aria-label="Darlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
      : '';
    return `
    <div class="v3-mini-item" data-id="${escapeHtml(e.id)}" data-type="${type}"${isLoan ? ' data-loan="true"' : ''}>
      <div class="v3-mini-icon" style="${color}"><svg width="16" height="16"><use href="#i-${iconFor(e)}"/></svg></div>
      <div>
        <div class="v3-mini-name">${escapeHtml(e.name)}</div>
        <div class="v3-mini-meta">${meta}</div>
      </div>
      <div class="v3-mini-amount ${type === 'income' ? 'pos' : 'neg'}">${type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(e.amount).replace('−', ''))}</div>
      <div class="row-actions">
        ${loanBtn}
        <button class="row-action" data-action="edit" aria-label="Bearbeiten"><svg width="13" height="13"><use href="#i-pencil"/></svg></button>
        <button class="row-action danger" data-action="delete" aria-label="Löschen"><svg width="13" height="13"><use href="#i-trash"/></svg></button>
      </div>
    </div>`;
  }).join('');
}
