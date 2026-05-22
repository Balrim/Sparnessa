# Loan Completion Display & "bis Datum" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abbezahlte Darlehen als abgeschlossen anzeigen (grüner Badge + Info-Panel), letzte Rate automatisch anpassen, und "bis Monat Jahr" für alle Einträge mit Enddatum zeigen.

**Architecture:** Alle Änderungen sind rein clientseitig. `loan.js` bekommt eine neue Berechnungsfunktion. `lists.js` bekommt neues Rendering für abgeschlossene Darlehen inkl. inline Info-Panel. `main.js` bekommt einen neuen Click-Handler. CSS und SVG-Sprite erhalten minimale Ergänzungen.

**Tech Stack:** Vanilla JS (ES Modules), CSS Custom Properties (iOS Dark Mode Tokens), Flask/Jinja2 für das HTML-Template

---

## File Map

| Datei | Was ändert sich |
|---|---|
| `static/js/format.js` | Neue Export-Funktion `fmtMonthYear` |
| `static/js/loan.js` | Neue Export-Funktion `calculateCurrentPayment` |
| `static/js/render/lists.js` | Meta-Format, Loan-Done-Rendering, Info-Panel-HTML |
| `static/css/components.css` | `.loan-done-badge`, `.loan-done .row-actions`, `.loan-done-panel` |
| `templates/index.html` | SVG-Symbol `i-check` hinzufügen |
| `static/js/main.js` | Click-Handler für `loan-done-info` und Row-Click-Guard |

---

## Task 1: `fmtMonthYear` in format.js

Neue Hilfsfunktion die "Okt. 2026" aus einem ISO-Datum macht. Wird in den nächsten Tasks verwendet.

**Files:**
- Modify: `static/js/format.js`

- [ ] **Step 1: Funktion nach `fmtShortDate` einfügen**

In `static/js/format.js` nach Zeile 43 (nach `fmtShortDate`) einfügen:

```js
export function fmtMonthYear(iso) {
  if (!iso) return '—';
  return _toDate(iso).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
}
```

- [ ] **Step 2: Im Browser verifizieren**

App starten (`bash run.sh`), Browser-Konsole öffnen und eintippen:

```js
import('/static/js/format.js').then(m => console.log(m.fmtMonthYear('2026-10-15')));
// Erwartet: "Okt. 2026"
```

- [ ] **Step 3: Commit**

```bash
git add static/js/format.js
git commit -m "feat: add fmtMonthYear helper to format.js"
```

---

## Task 2: `calculateCurrentPayment` in loan.js

Berechnet die tatsächliche Rate für den aktuellen Monat. Im letzten Monat ist diese kleiner als die Standardrate (nur noch Restschuld + Zinsen).

**Files:**
- Modify: `static/js/loan.js`

- [ ] **Step 1: Funktion am Ende der Datei einfügen**

In `static/js/loan.js` nach der letzten Funktion `calculateSpecialPaymentSavings` anhängen:

```js
export function calculateCurrentPayment(loanDetails, referenceDate) {
  const schedule = _buildAmortizationSchedule(loanDetails);
  const ym = referenceDate.slice(0, 7); // "YYYY-MM"
  const entry = schedule.find(e => e.month.slice(0, 7) === ym);
  if (!entry) return loanDetails.amount;
  return entry.interest + entry.principal_paid;
}
```

- [ ] **Step 2: Im Browser verifizieren — Standardmonat**

Konsole:
```js
import('/static/js/loan.js').then(m => {
  const ld = { principal: 1000, interest_rate: 5, term_months: 12,
               start_date: '2025-01-01', amount: 85.61, special_payments: [] };
  // Irgendein Monat in der Mitte: sollte ~85.61 zurückgeben
  console.log(m.calculateCurrentPayment(ld, '2025-06-15'));
});
// Erwartet: Wert nahe 85.61
```

- [ ] **Step 3: Im Browser verifizieren — Letzter Monat**

```js
import('/static/js/loan.js').then(m => {
  // 0%-Darlehen, 100 €/Monat, 3 Monate, Startbetrag 250 €
  const ld = { principal: 250, interest_rate: 0, term_months: 3,
               start_date: '2026-01-01', amount: 100, special_payments: [] };
  // Letzter Monat: nur 50 € Restschuld
  console.log(m.calculateCurrentPayment(ld, '2026-04-15'));
});
// Erwartet: 50 (nicht 100)
```

- [ ] **Step 4: Commit**

```bash
git add static/js/loan.js
git commit -m "feat: add calculateCurrentPayment for last-payment adjustment"
```

---

## Task 3: CSS für Loan-Done-States

Neue Klassen für das Badge, das Info-Panel und den always-visible Row-Actions-State.

**Files:**
- Modify: `static/css/components.css`

- [ ] **Step 1: Nach dem Block `/* ─── Darlehen — Tilgungs-Fortschrittsbalken ─── */` (ab Zeile ~736) die neuen Klassen einfügen**

Den gesamten neuen Block direkt nach dem vorhandenen `.loan-progress-bar.income .loan-progress-fill`-Block (nach Zeile 757) einfügen:

```css
/* ─── Darlehen — Abgeschlossen ─── */
.loan-done-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(48, 209, 88, 0.12);
  color: #30D158;
  border-radius: 20px;
  padding: 4px 11px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.loan-done-badge svg { width: 12px; height: 12px; }

.v3-mini-item.loan-done .row-actions { opacity: 1; }

.loan-done-panel {
  padding: 0 18px 12px;
  display: none;
}
.loan-done-panel.open { display: block; }
.loan-done-panel-inner {
  background: var(--bg-elevated-2);
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(48, 209, 88, 0.18);
}
.ldp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}
.ldp-row { display: flex; flex-direction: column; gap: 2px; }
.ldp-label { font-size: 11px; color: var(--label-tertiary); }
.ldp-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ldp-value.green  { color: #30D158; }
.ldp-value.red    { color: #FF453A; }
.ldp-value.accent { color: var(--accent); }
.ldp-divider {
  grid-column: 1 / -1;
  height: 1px;
  background: var(--separator);
}
.ldp-sp-section { grid-column: 1 / -1; }
.ldp-sp-title {
  font-size: 11px;
  color: var(--label-tertiary);
  margin-bottom: 5px;
}
.ldp-sp-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
}
.ldp-sp-item + .ldp-sp-item { border-top: 1px solid var(--separator); }
.ldp-sp-date { color: var(--label-secondary); }
.ldp-sp-amt  { font-weight: 600; color: #30D158; }
```

- [ ] **Step 2: Commit**

```bash
git add static/css/components.css
git commit -m "feat: add CSS for loan-done badge and info panel"
```

---

## Task 4: SVG-Symbol `i-check` hinzufügen

Das Häkchen-Icon wird für das Badge und das Icon des abbezahlten Darlehens gebraucht.

**Files:**
- Modify: `templates/index.html`

- [ ] **Step 1: Symbol nach `i-close` (Zeile 48) einfügen**

In `templates/index.html` nach der Zeile mit `<symbol id="i-close"...>` einfügen:

```html
    <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
```

- [ ] **Step 2: Commit**

```bash
git add templates/index.html
git commit -m "feat: add i-check SVG symbol"
```

---

## Task 5: Meta-Format in lists.js — "bis Monat Jahr"

Die Meta-Zeile für normale Einträge (keine Darlehen) zeigt "nächst. DD.MM." — das wird durch "bis Monat Jahr" ersetzt wenn `end_date` gesetzt ist. Für Darlehen wird `fmtShortDate` durch `fmtMonthYear` ersetzt.

**Files:**
- Modify: `static/js/render/lists.js`

- [ ] **Step 1: Import `fmtMonthYear` hinzufügen**

In `static/js/render/lists.js`, Zeile 1, den Import erweitern:

```js
import { fmtEur, fmtShortDate, fmtMonthYear, escapeHtml, INTERVAL_LABELS, isoToday } from '../format.js';
```

- [ ] **Step 2: Meta-String für normale Einträge anpassen**

In `static/js/render/lists.js` die aktuelle Zeile (Zeile ~32):

```js
    : `${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval} · nächst. ${escapeHtml(fmtShortDate(e.next_date))}${e.end_date ? ' · bis ' + escapeHtml(fmtShortDate(e.end_date)) : ''}`;
```

ersetzen durch:

```js
    : `${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval}${e.end_date ? ' · bis ' + escapeHtml(fmtMonthYear(e.end_date)) : ''}`;
```

- [ ] **Step 3: Meta-String für Darlehen auf `fmtMonthYear` umstellen**

Die Loan-Meta-Zeilen (Zeilen ~29–31) von `fmtShortDate(loanEndDate)` auf `fmtMonthYear(loanEndDate)` umstellen:

```js
    const meta = isLoan && e.loan_details
      ? `Kredit · ${escapeHtml(fmtEur(e.loan_details.principal, {}))} · ${escapeHtml(String(e.loan_details.interest_rate))}% · bis ${escapeHtml(fmtMonthYear(loanEndDate))}`
      : isIncomeLoan && e.loan_details
        ? `Privatdarlehen · ${escapeHtml(fmtEur(e.loan_details.principal, {}))} · ${escapeHtml(String(e.loan_details.interest_rate))}% · bis ${escapeHtml(fmtMonthYear(loanEndDate))}`
        : `${escapeHtml(e.category || '')} · ${INTERVAL_LABELS[e.interval] || e.interval}${e.end_date ? ' · bis ' + escapeHtml(fmtMonthYear(e.end_date)) : ''}`;
```

- [ ] **Step 4: Im Browser prüfen**

App neu laden. In der Ausgaben-/Einnahmenliste sollten Einträge mit Enddatum jetzt "bis Okt. 2026" statt "nächst. 15.10." zeigen.

- [ ] **Step 5: Commit**

```bash
git add static/js/render/lists.js
git commit -m "feat: show 'bis Monat Jahr' for all entries with end_date"
```

---

## Task 6: Completed-Loan-Rendering in lists.js

Das Herzstück: Abbezahlte Darlehen bekommen ein anderes Layout mit Badge, grünem Icon, angepasstem Betrag für aktive Darlehen im letzten Monat, und dem HTML für das Info-Panel.

**Files:**
- Modify: `static/js/render/lists.js`

- [ ] **Step 1: Imports erweitern**

Zeile 1 in `static/js/render/lists.js` auf:

```js
import { fmtEur, fmtShortDate, fmtMonthYear, escapeHtml, INTERVAL_LABELS, isoToday } from '../format.js';
import { iconFor } from '../icons.js';
import { calculatePayoffDate, calculateRemainingDebt, calculateCurrentPayment, calculateTotalInterest } from '../loan.js';
```

- [ ] **Step 2: Loan-Done-Erkennung und Betrag-Berechnung**

Im `items.map(e => {` Block (nach der `progressBar`-Logik, aktuell ca. Zeile 38–44), den bestehenden Block:

```js
    let progressBar = '';
    if (hasLoan && e.loan_details) {
      const remaining = calculateRemainingDebt(e.loan_details, today);
      const pct = Math.min(100, Math.max(0, (1 - remaining / e.loan_details.principal) * 100));
      const cls = isIncomeLoan ? 'loan-progress-bar income' : 'loan-progress-bar';
      progressBar = `<div class="${cls}"><div class="loan-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>`;
    }
```

ersetzen durch:

```js
    const remaining = hasLoan && e.loan_details
      ? calculateRemainingDebt(e.loan_details, today) : null;
    const isPaidOff = hasLoan && e.loan_details && remaining <= 0.01;

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
```

- [ ] **Step 3: Buttons und Badge anpassen**

Den bestehenden `loanBtn`-Block (Zeilen ~33–37):

```js
    const loanBtn = isLoan
      ? `<button class="row-action loan-info" data-action="loan-detail" aria-label="Darlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
      : isIncomeLoan
        ? `<button class="row-action income-loan-info" data-action="income-loan-detail" aria-label="Privatdarlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
        : '';
```

ersetzen durch:

```js
    const loanBtn = isPaidOff
      ? `<button class="row-action info-btn" data-action="loan-done-info" aria-label="Darlehensübersicht"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
      : isLoan
        ? `<button class="row-action loan-info" data-action="loan-detail" aria-label="Darlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
        : isIncomeLoan
          ? `<button class="row-action income-loan-info" data-action="income-loan-detail" aria-label="Privatdarlehensdetails"><svg width="13" height="13"><use href="#i-info"/></svg></button>`
          : '';
```

- [ ] **Step 4: Info-Panel-HTML als Hilfsfunktion vor `_render` einfügen**

Direkt vor der `function _render(...)` Zeile einfügen:

```js
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
```

- [ ] **Step 5: Item-HTML umschreiben**

Den bestehenden `return`-Block (ab `return \`` bis zum Ende des `.join('')`):

```js
    return `
    <div class="v3-mini-item" data-id="${escapeHtml(e.id)}" data-type="${type}"${isLoan ? ' data-loan="true"' : ''}${isIncomeLoan ? ' data-income-loan="true"' : ''}>
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
      ${progressBar}
    </div>`;
```

ersetzen durch:

```js
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
```

- [ ] **Step 6: Im Browser prüfen**

App neu laden. Ein Darlehen mit `remainingDebt = 0` sollte:
- Grünes Häkchen-Icon zeigen
- "Abbezahlt"-Badge statt Betrag
- Meta-Zeile grün mit "Vollständig abbezahlt · Monat Jahr"
- Grünen 100%-Balken

- [ ] **Step 7: Commit**

```bash
git add static/js/render/lists.js
git commit -m "feat: render paid-off loans with done badge and info panel"
```

---

## Task 7: Click-Handler in main.js

Info-Panel-Toggle und Guard gegen Öffnen des Edit-Modals bei abgeschlossenen Darlehen.

**Files:**
- Modify: `static/js/main.js`

- [ ] **Step 1: `loan-done-info` Action im Click-Handler hinzufügen**

Im `document.body.addEventListener('click', ...)` Block (Zeile ~108), nach der Zeile:

```js
      if (btn.dataset.action === 'income-loan-detail') openIncomeLoanDetail(id, openModal);
```

folgende Zeile einfügen:

```js
      if (btn.dataset.action === 'loan-done-info') {
        const panel = document.getElementById(`ldp-${id}`);
        if (panel) panel.classList.toggle('open');
        e.stopPropagation();
      }
```

- [ ] **Step 2: Row-Click-Guard für abgeschlossene Darlehen**

Im `else`-Zweig des Click-Handlers (Zeilen ~117–121), der aktuell lautet:

```js
    } else {
      if (isLoan)            openLoan(id, openModal);
      else if (isIncomeLoan) openIncomeLoan(id, openModal);
      else                   openEntry(type, id, openModal);
    }
```

ersetzen durch:

```js
    } else {
      if (row.classList.contains('loan-done')) return;
      if (isLoan)            openLoan(id, openModal);
      else if (isIncomeLoan) openIncomeLoan(id, openModal);
      else                   openEntry(type, id, openModal);
    }
```

- [ ] **Step 3: Im Browser testen**

1. Auf den ℹ-Button eines abbezahlten Darlehens klicken → Panel öffnet sich
2. Nochmal klicken → Panel schließt sich
3. Auf den Rest der Zeile klicken → kein Modal öffnet sich

- [ ] **Step 4: Commit**

```bash
git add static/js/main.js
git commit -m "feat: handle loan-done-info toggle and guard row click"
```

---

## Task 8: Visueller Abschlusstest

Alle vier Features im Browser gemeinsam prüfen.

- [ ] **Step 1: App neu laden**

`bash run.sh`, Browser-Cache leeren (Ctrl+Shift+R).

- [ ] **Step 2: Abbezahltes Darlehen prüfen**

Ein vorhandenes Darlehen mit `remainingDebt ≤ 0` (oder zu Testzwecken ein 0%-Darlehen anlegen das bereits abgelaufen ist) sollte zeigen:
- Grünes Icon mit Häkchen
- Grüner 100%-Balken
- "Abbezahlt"-Badge statt Betrag
- Meta in grün: "Vollständig abbezahlt · Monat Jahr"
- Info [ℹ] und Löschen [🗑] Buttons immer sichtbar
- Klick auf ℹ öffnet Panel mit Zusammenfassung

- [ ] **Step 3: Letzte Rate prüfen**

Ein aktives Darlehen im letzten Monat (Restschuld < Standardrate) sollte als Betrag die reduzierte Rate zeigen — nicht die volle Standardrate.

- [ ] **Step 4: "bis Datum" prüfen**

Einträge mit Enddatum zeigen "bis Okt. 2026" (oder jeweiliger Monat) statt "nächst. 15.10.".
Einträge ohne Enddatum zeigen nur "Kategorie · monatlich".

- [ ] **Step 5: Kein Regression-Check**

- Aktive Darlehen öffnen wie bisher das Bearbeiten-Modal bei Row-Klick ✓
- Normale Einträge verhalten sich unverändert ✓
- Sondertilgungen via ℹ-Button aktiver Darlehen funktionieren noch ✓

- [ ] **Step 6: Abschließenden Commit erstellen (falls nötig)**

```bash
git status
# Falls alles committed: kein weiterer Commit nötig
```
