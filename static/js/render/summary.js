import { fmtEur, daysBetween, escapeHtml } from '../format.js';

export function renderSummary(state) {
  const { settings: s, forecast: fc } = state;
  const availEl     = document.getElementById('stat-available');
  const availSub    = document.getElementById('stat-available-sub');
  const banner      = document.getElementById('dispo-warning');
  const bannerTxt   = document.getElementById('dispo-warning-text');
  const dispoHead   = document.getElementById('dispo-head-right');
  const dispoFoot   = document.getElementById('dispo-foot-right');
  const dispoFill   = document.getElementById('dispo-fill');
  const dispoSection = document.querySelector('.dispo');

  const dispoActive = (s.disposition_limit ?? 0) < 0;
  dispoSection.style.display = dispoActive ? '' : 'none';

  if (!fc) {
    availEl.textContent = '—';
    availEl.className = 'num num-xl';
    availSub.textContent = 'Bitte erst Datum + Gehaltsdatum in Einstellungen setzen';
    _set('stat-balance', fmtEur(s.balance || 0), s.balance < 0 ? 'neg' : '');
    _set('stat-lowest', '—');
    _set('stat-out', '—', 'neg');
    _set('stat-in', '—', 'pos');
    if (dispoActive) {
      dispoHead.innerHTML = '<strong>—</strong>';
      dispoFoot.textContent = `Limit ${fmtEur(s.disposition_limit)}`;
      dispoFill.style.width = '0%';
    }
    banner.classList.remove('show');
    return;
  }

  availEl.textContent = fmtEur(fc.frei_inkl_dispo);
  availEl.className = 'num num-xl' + (fc.frei_inkl_dispo < 0 ? ' neg' : '');
  const days = daysBetween(s.current_date, s.next_salary_date);
  const salaryHtml = s.next_salary_amount
    ? ` · in <strong style="color:var(--label-primary)">${days} Tagen</strong> kommt <span class="pos">+${escapeHtml(fmtEur(s.next_salary_amount))}</span>`
    : '';
  availSub.innerHTML = dispoActive ? `inkl. Dispo${salaryHtml}` : `verfügbar${salaryHtml}`;

  _set('stat-balance', fmtEur(s.balance), s.balance < 0 ? 'neg' : 'pos');
  _set('stat-lowest',  fmtEur(fc.lowest),
    fc.lowest < s.disposition_limit ? 'neg' : fc.lowest < 0 ? 'warn' : 'pos');
  _set('stat-out', '−' + fmtEur(fc.total_out).replace('−', ''), 'neg');
  _set('stat-in',  '+' + fmtEur(fc.total_in).replace('−', ''),  'pos');

  if (dispoActive) {
    let pct = 0;
    if (fc.lowest < 0)
      pct = Math.min(100, Math.max(0, (fc.lowest / s.disposition_limit) * 100));
    const warn = pct > 85 || !fc.dispo_ok;
    dispoFill.className = 'dispo-fill' + (warn ? ' warn' : '');
    dispoFill.style.width = pct + '%';
    dispoHead.innerHTML = `<strong>${Math.round(pct)} %</strong> · Tiefpunkt ${escapeHtml(fmtEur(fc.lowest))}`;
    dispoFoot.textContent = `Limit ${fmtEur(s.disposition_limit)}`;

    if (!fc.dispo_ok) {
      bannerTxt.textContent = `Dispo-Überschreitung! Tiefpunkt ${fmtEur(fc.lowest)} · Limit ${fmtEur(s.disposition_limit)}`;
      banner.classList.add('show');
      return;
    }
  }
  banner.classList.remove('show');
}

function _set(id, text, cls = '') {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.className = 'num num-md ' + cls; }
}
