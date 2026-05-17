import { fmtEurCompact, fmtDay } from '../format.js';

export function renderChart(state) {
  const container = document.getElementById('chart-container');
  const rangeEl   = document.getElementById('chart-range');
  const { settings: s, forecast: fc } = state;

  if (!fc) {
    container.innerHTML = `<div class="empty"><div class="empty-illu"><svg width="22" height="22"><use href="#i-calendar"/></svg></div>Noch keine Daten für ein Diagramm.</div>`;
    rangeEl.textContent = '—';
    return;
  }

  const W = 720, H = 320, pad = { l: 56, r: 24, t: 16, b: 32 };

  // Merge all past/today events into a single starting balance, only plot future.
  // The forecast may include past occurrences (e.g. overdue expenses) which would
  // produce negative x-coordinates and draw the line backwards off the chart.
  const periods = parseInt(localStorage.getItem('chart_periods') || '2');

  const allPts = fc.trajectory;
  let todayBal = allPts[0].balance;
  for (const p of allPts) {
    if (p.date <= s.current_date) todayBal = p.balance;
  }
  const allFuture = [
    { date: s.current_date, balance: todayBal, kind: 'today' },
    ...allPts.filter(p => p.date > s.current_date),
  ];

  // For 1-period view cut off after the first salary event
  let pts = allFuture;
  if (periods === 1) {
    const firstSalaryIdx = allFuture.findIndex((p, i) => i > 0 && p.kind === 'salary');
    if (firstSalaryIdx !== -1) pts = allFuture.slice(0, firstSalaryIdx + 1);
  }

  const toMs = iso => new Date(iso + 'T00:00:00').getTime();
  const minT = toMs(s.current_date), maxT = toMs(pts.at(-1).date);

  rangeEl.textContent = `${fmtDay(s.current_date)} → ${fmtDay(pts.at(-1).date)}`;
  const tRange = Math.max(1, maxT - minT);

  const bals = pts.map(p => p.balance);
  const minY = Math.min(...bals, s.disposition_limit, 0);
  const maxY = Math.max(...bals, 0) + 50;
  const yRange = Math.max(1, maxY - minY);
  const padY = 0.08 * yRange;
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const xp = iso => pad.l + ((toMs(iso) - minT) / tRange) * innerW;
  const yp = v  => pad.t + (1 - (v - (minY - padY)) / (yRange + 2 * padY)) * innerH;

  let line = '';
  pts.forEach((p, i) => {
    const cx = xp(p.date), cy = yp(p.balance);
    if (i === 0) { line += `M ${cx} ${cy} `; return; }
    const prev = pts[i - 1], px = xp(prev.date), py = yp(prev.balance), mx = (px + cx) / 2;
    line += `C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy} `;
  });
  const area = line +
    ` L ${xp(pts.at(-1).date)} ${innerH + pad.t} L ${xp(pts[0].date)} ${innerH + pad.t} Z`;

  const step = Math.max(50, Math.ceil(yRange / 4 / 50) * 50);
  const yTicks = [];
  for (let v = Math.ceil((minY - padY) / step) * step; v <= maxY + padY; v += step) yTicks.push(v);

  const dots = pts.map((p, i) => {
    if (i === 0) return '';
    const cls = p.kind === 'salary' ? 'chart-salary-marker' : 'chart-dot';
    return `<circle cx="${xp(p.date)}" cy="${yp(p.balance)}" r="${p.kind === 'salary' ? 5 : 3.5}" class="${cls}"/>`;
  }).join('');

  // Show only today + salary markers — guaranteed no overlap
  const xTicks = pts
    .filter(p => p.kind === 'today' || p.kind === 'salary')
    .map(p => `<text x="${xp(p.date)}" y="${H - pad.b + 18}" text-anchor="middle">${fmtDay(p.date)}</text>`)
    .join('');

  const zeroY = yp(0), dispoY = yp(s.disposition_limit);
  const zeroLine = (zeroY >= pad.t && zeroY <= H - pad.b)
    ? `<line class="chart-zero" x1="${pad.l}" y1="${zeroY}" x2="${W - pad.r}" y2="${zeroY}"/>` : '';
  const dispoLine = (s.disposition_limit < 0 && dispoY >= pad.t && dispoY <= H - pad.b)
    ? `<line class="chart-dispo" x1="${pad.l}" y1="${dispoY}" x2="${W - pad.r}" y2="${dispoY}"/>
       <text x="${W - pad.r - 4}" y="${dispoY - 6}" text-anchor="end" style="fill:var(--red);font-size:10px;font-weight:600;font-family:var(--font)">Dispo ${fmtEurCompact(s.disposition_limit)}</text>`
    : '';

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="chartClip">
        <rect x="${pad.l}" y="${pad.t}" width="${innerW}" height="${innerH}"/>
      </clipPath>
    </defs>
    <g class="chart-grid" clip-path="url(#chartClip)">${yTicks.map(v => `<line x1="${pad.l}" y1="${yp(v)}" x2="${W - pad.r}" y2="${yp(v)}"/>`).join('')}</g>
    <g class="chart-axis">${yTicks.map(v => `<text x="${pad.l - 8}" y="${yp(v) + 3}" text-anchor="end">${fmtEurCompact(v)}</text>`).join('')}</g>
    <g class="chart-axis">${xTicks}</g>
    ${zeroLine}${dispoLine}
    <path class="chart-area" d="${area}" fill="url(#balanceGrad)" clip-path="url(#chartClip)"/>
    <path class="chart-line" d="${line}" clip-path="url(#chartClip)"/>
    ${dots}
    <circle cx="${xp(pts[0].date)}" cy="${yp(pts[0].balance)}" r="5" class="chart-dot-active"/>
  </svg>`;
}
