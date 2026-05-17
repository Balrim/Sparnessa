import { fmtEur, fmtShortDate, escapeHtml, INTERVAL_LABELS } from '../format.js';
import { iconFor } from '../icons.js';

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
  root.innerHTML = items.map(e => `
    <div class="v3-mini-item" data-id="${escapeHtml(e.id)}" data-type="${type}">
      <div class="v3-mini-icon" style="${color}"><svg width="16" height="16"><use href="#i-${iconFor(e)}"/></svg></div>
      <div>
        <div class="v3-mini-name">${escapeHtml(e.name)}</div>
        <div class="v3-mini-meta">${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval} · nächst. ${escapeHtml(fmtShortDate(e.next_date))}${e.end_date ? ' · bis ' + escapeHtml(fmtShortDate(e.end_date)) : ''}</div>
      </div>
      <div class="v3-mini-amount ${type === 'income' ? 'pos' : 'neg'}">${type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(e.amount).replace('−', ''))}</div>
      <div class="row-actions">
        <button class="row-action" data-action="edit" aria-label="Bearbeiten"><svg width="13" height="13"><use href="#i-pencil"/></svg></button>
        <button class="row-action danger" data-action="delete" aria-label="Löschen"><svg width="13" height="13"><use href="#i-trash"/></svg></button>
      </div>
    </div>`).join('');
}
