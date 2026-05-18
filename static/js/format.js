export const CATEGORIES = [
  'Wohnen','Versicherung','Auto','Lebensmittel','Freizeit',
  'Abos','Internet','Strom','Transfer','Sonstiges',
];
export const INCOME_CATEGORIES = [
  'Hauptjob','Nebenverdienst','Familie','Unterhalt',
  'Sozialleistung','Rückerstattung','Sonstiges',
];
export const INTERVAL_LABELS = {
  once: 'einmalig', monthly: 'monatlich', quarterly: 'vierteljährlich',
  biannual: 'halbjährlich', yearly: 'jährlich',
};

export function fmtEur(n, { sign = false, decimals = 2 } = {}) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  const num = Math.abs(n).toLocaleString('de-DE', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  const prefix = n < 0 ? '−' : (sign && n > 0 ? '+' : '');
  return `${prefix}${num} €`;
}

export function fmtEurCompact(n) {
  const abs = Math.abs(n);
  const prefix = n < 0 ? '−' : '';
  if (abs >= 1000)
    return prefix + (abs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'k €';
  return prefix + abs.toLocaleString('de-DE', { maximumFractionDigits: 0 }) + ' €';
}

export function fmtDay(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function fmtDayLong(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

export function fmtShortDate(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function daysBetween(isoA, isoB) {
  return Math.round((_toDate(isoB) - _toDate(isoA)) / 86_400_000);
}

export function weekdayLong(iso) {
  return _toDate(iso).toLocaleDateString('de-DE', { weekday: 'long' });
}

export function dayOfMonth(iso) {
  return _toDate(iso).getDate();
}

export function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function _toDate(iso) {
  if (!iso) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
