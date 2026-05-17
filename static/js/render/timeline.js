import { fmtEur, fmtShortDate, daysBetween, weekdayLong, dayOfMonth, escapeHtml, INTERVAL_LABELS } from '../format.js';

export function renderTimeline(state) {
  const root    = document.getElementById('timeline');
  const countEl = document.getElementById('timeline-count');
  const { settings: s, forecast: fc } = state;

  if (!fc) {
    root.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-calendar"/></svg></div>Trage erst dein aktuelles Datum und das Gehaltsdatum in den Einstellungen ein.</div>`;
    countEl.textContent = '—';
    return;
  }

  const days = daysBetween(s.current_date, s.next_salary_date);

  const groups = new Map();
  for (const ev of fc.upcoming) {
    if (!groups.has(ev.date)) groups.set(ev.date, []);
    groups.get(ev.date).push(ev);
  }

  const salaryBlock = s.next_salary_amount ? 1 : 0;
  countEl.textContent = `${groups.size + 1 + salaryBlock} Termine · ${days} Tag${days === 1 ? '' : 'e'}`;

  let html = _dayBlock({ iso: s.current_date, title: 'Heute',
    subtitle: `Kontostand ${fmtEur(s.balance)}`, kind: 'today', items: [] });

  let running = s.balance;
  for (const dateStr of [...groups.keys()].sort()) {
    const items = groups.get(dateStr);
    const net = items.reduce((acc, e) => acc + (e.type === 'income' ? e.amount : -e.amount), 0);
    running += net;
    const d = daysBetween(s.current_date, dateStr);
    html += _dayBlock({
      iso: dateStr, title: weekdayLong(dateStr),
      subtitle: `in ${d} Tag${d === 1 ? '' : 'en'} · Stand danach ${fmtEur(running)}`,
      net, items, kind: 'event',
    });
  }

  if (s.next_salary_amount) {
    html += _dayBlock({
      iso: s.next_salary_date, title: 'Gehalt',
      subtitle: `Kontostand ${fmtEur(fc.balance_after_salary)}`,
      net: s.next_salary_amount,
      items: [{ name: 'Gehalt', amount: s.next_salary_amount, type: 'income', category: 'Hauptjob' }],
      kind: 'salary',
    });
  }

  root.innerHTML = html;
}

function _dayBlock({ iso, title, subtitle, net, items, kind }) {
  const netHtml = typeof net === 'number' && (items || []).length > 1
    ? `<div class="v3-day-net ${net < 0 ? 'neg' : 'pos'}">${net > 0 ? '+' : ''}${escapeHtml(fmtEur(net))}</div>`
    : '';
  const itemsHtml = (items || []).map(it => `
    <div class="v3-day-item">
      <div><span>${escapeHtml(it.name)}</span><span class="v3-cat">${escapeHtml(it.category || '')}</span></div>
      <div class="v3-amount ${it.type === 'income' ? 'pos' : 'neg'}">${it.type === 'income' ? '+' : '−'}${escapeHtml(fmtEur(Math.abs(it.amount)).replace('−', ''))}</div>
    </div>`).join('');
  const kindCls = kind === 'today' ? 'today' : kind === 'salary' ? 'salary' : '';
  return `
    <div class="v3-day ${kindCls}">
      <div class="v3-day-node">${dayOfMonth(iso)}</div>
      <div class="v3-day-head">
        <div class="v3-day-title">${escapeHtml(title)} <span class="when">${escapeHtml(subtitle)}</span></div>
        ${netHtml}
      </div>
      ${items && items.length ? `<div class="v3-day-items">${itemsHtml}</div>` : ''}
    </div>`;
}
