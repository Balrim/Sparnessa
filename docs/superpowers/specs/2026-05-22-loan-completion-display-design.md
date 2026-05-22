# Loan Completion Display & "bis Datum" — Design Spec

**Date:** 2026-05-22  
**Status:** Approved (via visual mockup)

---

## Overview

Four related improvements to how loans and recurring entries are displayed:

1. **Completed loan indicator** — abbezahlte Darlehen zeigen einen grünen Checkmark-Badge statt der Rate
2. **Completed loan info panel** — aufklappbare Zusammenfassung mit Tilgungshistorie
3. **Last payment adjustment** — letzte Rate wird auf den tatsächlich verbleibenden Betrag angepasst
4. **"bis Datum" for all recurring entries** — Enddatum einheitlich angezeigt für alle Einträge mit `end_date`

---

## Feature 1: Completed Loan Indicator

**Trigger:** `calculateRemainingDebt(loan_details, today) <= 0.01`

**Änderungen an `lists.js` (Item-Rendering):**

- Icon-Hintergrund wechselt zu `rgba(48,209,88,0.12)` mit grüner Farbe
- Icon wird durch Checkmark-SVG (`i-check`) ersetzt
- Betrag-Spalte (`v3-mini-amount`) wird durch grünes Badge ersetzt:
  ```html
  <div class="loan-done-badge"><svg i-check/>Abbezahlt</div>
  ```
- Meta-Zeile zeigt: `Vollständig abbezahlt · [Payoff-Monat Jahr]` in grün
- Fortschrittsbalken: grün, 100% gefüllt
- `row-actions` sind **immer sichtbar** (kein opacity:0 / Hover nötig)
- Nur **Info-Button** und **Löschen-Button** — kein Bearbeiten-Button
- Edit-Button entfällt bei abgeschlossenen Darlehen (Daten unveränderlich)

**Neues CSS (in `components.css`):**
```css
.loan-done-badge { /* grünes Badge, analog zu check-badge im Mockup */ }
.v3-mini-item.loan-done .row-actions { opacity: 1; } /* immer sichtbar */
```

---

## Feature 2: Completed Loan Info Panel

**Trigger:** Klick auf den Info-Button eines abgeschlossenen Darlehens

**Darstellung:** Inline-Panel, das sich direkt unterhalb des Eintrags aufklappt (kein Modal)

**Inhalt des Info-Panels:**

| Feld | Quelle |
|---|---|
| Ursprungsbetrag | `loan_details.principal` |
| Zinssatz | `loan_details.interest_rate` |
| Laufzeit | Anzahl Monate aus Amortisationsplan |
| Abgeschlossen am | `calculatePayoffDate(loan_details)` → Monat/Jahr |
| Gesamt gezahlt | `principal + calculateTotalInterest(loan_details)` |
| davon Zinsen | `calculateTotalInterest(loan_details)` |
| Sondertilgungen | `loan_details.special_payments` (sortiert nach Datum) |

**Rendering:** Panel wird dynamisch in `lists.js` ins DOM eingefügt oder per CSS-Klasse ein/ausgeblendet. Info-Button toggled Klasse `open`.

Gilt für beide Typen: Ausgaben-Darlehen (`isLoan`) und Einnahmen-Privatdarlehen (`isIncomeLoan`).

---

## Feature 3: Last Payment Adjustment

**Problem:** Wenn die verbleibende Restschuld kleiner ist als die Standardrate, wird trotzdem die volle Rate angezeigt.

**Lösung:** Neue Funktion `calculateCurrentPayment(loanDetails, today)` in `loan.js`:
- Baut den Amortisationsplan auf
- Findet den Monat von `today` im Plan
- Gibt zurück: `interest + Math.min(monthlyRate - interest, remainingDebt)` für diesen Monat
- Falls der Eintrag in der Liste angezeigt wird und das Darlehen noch aktiv ist (debt > 0), wird dieser Wert für die Betrag-Anzeige verwendet
- Bei bereits abbezahlten Darlehen irrelevant (Feature 1 greift)

**Änderungen:**
- `loan.js`: neue exportierte Funktion `calculateCurrentPayment(loanDetails, today)`
- `lists.js`: für aktive Darlehen `calculateCurrentPayment` statt `e.amount` verwenden

---

## Feature 4: "bis Datum" for All Recurring Entries

**Aktuelles Format** (regular entries):
```
Kategorie · monatlich · nächst. 15.06.26 · bis Okt 2026
```

**Neues Format:**
```
Kategorie · monatlich · bis Okt 2026
```

**Regeln:**
- `nächst. [date]` wird entfernt
- `bis [Monat Jahr]` wird angezeigt wenn `e.end_date` vorhanden — als kurzes `fmtShortDate`-Format
- Kein `end_date` → Meta bleibt: `Kategorie · monatlich` (kein "bis")
- Für Darlehen bleibt das Format unverändert: `Kredit · 12.000 € · 3,9% · bis Okt 2026`

**Änderung:** Nur in `lists.js`, Zeile mit dem `meta`-String für reguläre Einträge.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `static/js/loan.js` | Neue Funktion `calculateCurrentPayment` |
| `static/js/render/lists.js` | Loan-done-Rendering, Info-Panel, Payment-Anzeige, Meta-Format |
| `static/css/components.css` | `.loan-done-badge`, `.loan-done .row-actions` |
| `templates/index.html` | SVG-Symbol `i-check` hinzufügen |

---

## Out of Scope

- Kein neues Backend nötig — alle Berechnungen sind clientseitig
- Kein neues DB-Feld nötig — Abschluss wird live aus `calculateRemainingDebt` abgeleitet
- Kein Modal für das Info-Panel — inline expansion
