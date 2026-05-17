const CHEVRON = `<svg class="csel-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function initCustomSelect(selectEl) {
  if (selectEl._csel) {
    selectEl._csel.refresh();
    return selectEl._csel;
  }

  const wrap = document.createElement('div');
  wrap.className = 'csel';
  selectEl.parentNode.insertBefore(wrap, selectEl);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'csel-trigger';
  trigger.innerHTML = `<span class="csel-label"></span>${CHEVRON}`;

  // Portal: panel → body so modal overflow:hidden doesn't clip it
  const panel = document.createElement('div');
  panel.className = 'csel-panel';

  // Inner scroll container: panel keeps overflow:hidden for clean corners,
  // inner gets overflow-y:auto so the scrollbar stays inside the radius.
  const inner = document.createElement('div');
  inner.className = 'csel-inner';
  panel.appendChild(inner);
  document.body.appendChild(panel);

  selectEl.style.display = 'none';
  wrap.appendChild(trigger);
  wrap.appendChild(selectEl);

  let isOpen = false;

  function buildOptions() {
    inner.innerHTML = '';
    Array.from(selectEl.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = 'csel-item' + (opt.value === selectEl.value ? ' active' : '');
      item.dataset.value = opt.value;
      item.textContent = opt.text;
      item.addEventListener('mousedown', e => e.preventDefault());
      item.addEventListener('click', e => {
        e.stopPropagation();
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        close();
        updateLabel();
        inner.querySelectorAll('.csel-item').forEach(el =>
          el.classList.toggle('active', el.dataset.value === selectEl.value));
      });
      inner.appendChild(item);
    });
  }

  function updateLabel() {
    const sel = selectEl.options[selectEl.selectedIndex];
    trigger.querySelector('.csel-label').textContent = sel?.text ?? '';
  }

  function positionPanel() {
    const rect       = wrap.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    panel.style.left  = rect.left + 'px';
    panel.style.width = rect.width + 'px';
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      panel.style.top    = 'auto';
      panel.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
      inner.style.maxHeight = Math.min(spaceAbove - 5, 320) + 'px';
      panel.classList.add('flip');
    } else {
      panel.style.top    = (rect.bottom + 5) + 'px';
      panel.style.bottom = 'auto';
      inner.style.maxHeight = Math.min(spaceBelow - 5, 320) + 'px';
      panel.classList.remove('flip');
    }
  }

  function open() {
    isOpen = true;
    positionPanel();
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

  buildOptions();
  updateLabel();

  const api = {
    refresh() { buildOptions(); updateLabel(); },
    close,
  };
  selectEl._csel = api;
  return api;
}
