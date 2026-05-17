const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS_DE   = ['Mo','Di','Mi','Do','Fr','Sa','So'];

const CAL_ICON = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
  <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" stroke-width="1.25"/>
  <path d="M1 6h12" stroke="currentColor" stroke-width="1.25"/>
  <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
</svg>`;

export function initCustomDatePicker(inputEl) {
  if (inputEl._cdp) {
    inputEl._cdp.update();
    return inputEl._cdp;
  }

  const wrap = document.createElement('div');
  wrap.className = 'cdp';
  inputEl.parentNode.insertBefore(wrap, inputEl);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cdp-trigger';
  trigger.innerHTML = `<span class="cdp-label"></span>${CAL_ICON}`;

  // Portal to body so modal overflow:hidden doesn't clip the calendar
  const panel = document.createElement('div');
  panel.className = 'cdp-panel';
  document.body.appendChild(panel);

  inputEl.style.display = 'none';
  wrap.appendChild(trigger);
  wrap.appendChild(inputEl);

  let isOpen = false;
  let viewYear, viewMonth;

  function parseValue() {
    if (!inputEl.value) return null;
    const [y, m, d] = inputEl.value.split('-').map(Number);
    return { y, m, d };
  }

  function updateLabel() {
    const v = parseValue();
    const lbl = trigger.querySelector('.cdp-label');
    lbl.textContent = v
      ? `${String(v.d).padStart(2,'0')}.${String(v.m).padStart(2,'0')}.${v.y}`
      : '—';
  }

  function renderCalendar() {
    const today    = new Date();
    const selected = parseValue();
    const lastDay  = new Date(viewYear, viewMonth + 1, 0).getDate();
    let startDow   = new Date(viewYear, viewMonth, 1).getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon-based

    const prevBtn = `<button class="cdp-nav" data-dir="-1" type="button">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M5.5 1.5L2.5 4.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></button>`;
    const nextBtn = `<button class="cdp-nav" data-dir="1" type="button">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M3.5 1.5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg></button>`;

    let cells = DAYS_DE.map(d => `<div class="cdp-day-name">${d}</div>`).join('');
    for (let i = 0; i < startDow; i++) cells += `<div></div>`;
    for (let day = 1; day <= lastDay; day++) {
      const isToday    = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
      const isSel      = selected && selected.y === viewYear && selected.m === viewMonth + 1 && selected.d === day;
      const cls = ['cdp-day', isToday && 'today', isSel && 'selected'].filter(Boolean).join(' ');
      cells += `<div class="${cls}" data-day="${day}">${day}</div>`;
    }

    panel.innerHTML = `
      <div class="cdp-header">
        ${prevBtn}
        <span class="cdp-month-year">${MONTHS_DE[viewMonth]} ${viewYear}</span>
        ${nextBtn}
      </div>
      <div class="cdp-grid">${cells}</div>`;

    panel.querySelectorAll('.cdp-nav').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        viewMonth += parseInt(btn.dataset.dir);
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
        renderCalendar();
      });
    });

    panel.querySelectorAll('.cdp-day').forEach(el => {
      el.addEventListener('mousedown', e => e.preventDefault());
      el.addEventListener('click', e => {
        e.stopPropagation();
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(parseInt(el.dataset.day)).padStart(2, '0');
        inputEl.value = `${viewYear}-${mm}-${dd}`;
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        updateLabel();
        close();
      });
    });
  }

  function positionPanel() {
    const rect      = wrap.getBoundingClientRect();
    const panelW    = 260;
    let left        = rect.left;
    if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
    panel.style.left = left + 'px';

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 280 && rect.top > 280) {
      panel.style.top    = 'auto';
      panel.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
    } else {
      panel.style.top    = (rect.bottom + 5) + 'px';
      panel.style.bottom = 'auto';
    }
  }

  function open() {
    isOpen = true;
    const v = parseValue(), now = new Date();
    viewYear  = v ? v.y : now.getFullYear();
    viewMonth = v ? v.m - 1 : now.getMonth();
    positionPanel();
    renderCalendar();
    panel.classList.add('open');
    trigger.classList.add('open');
  }

  function close() {
    isOpen = false;
    panel.classList.remove('open');
    trigger.classList.remove('open');
  }

  trigger.addEventListener('click', e => { e.stopPropagation(); isOpen ? close() : open(); });
  document.addEventListener('click', () => { if (isOpen) close(); });

  updateLabel();

  const api = { update: updateLabel, close };
  inputEl._cdp = api;
  return api;
}
