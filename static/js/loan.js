'use strict';

export function calculateMonthlyRate(principal, annualInterestRate, termMonths) {
  if (annualInterestRate === 0) return principal / termMonths;
  const r = Math.pow(1 + annualInterestRate / 100, 1/12) - 1;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export function calculateTermFromRate(principal, annualInterestRate, monthlyRate) {
  if (annualInterestRate === 0) return Math.round(principal / monthlyRate);
  const r = Math.pow(1 + annualInterestRate / 100, 1/12) - 1;
  return Math.round(-Math.log(1 - r * principal / monthlyRate) / Math.log(1 + r));
}

export function calculateEndDate(startDate, termMonths) {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + termMonths);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function _buildAmortizationSchedule(loanDetails) {
  const {
    principal,
    interest_rate: interestRate,
    term_months: termMonths,
    start_date: startDate,
    special_payments: specialPayments = [],
    amount: monthlyRate,
  } = loanDetails;

  const maxMonths = termMonths * 2;
  const schedule = [];
  let debt = principal;
  const sorted = [...specialPayments].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 1; i <= maxMonths && debt > 0.005; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const interest = interestRate === 0 ? 0 : debt * (Math.pow(1 + interestRate / 100, 1/12) - 1);
    const principalPaid = Math.min(monthlyRate - interest, debt);
    debt = Math.max(0, debt - principalPaid);

    for (const sp of sorted) {
      if (sp.date.slice(0, 7) === monthStr.slice(0, 7)) {
        debt = Math.max(0, debt - sp.amount);
      }
    }

    schedule.push({ month: monthStr, debt, interest, principal_paid: principalPaid });
    if (debt <= 0.005) break;
  }

  return schedule;
}

export function calculateRemainingDebt(loanDetails, referenceDate) {
  const schedule = _buildAmortizationSchedule(loanDetails);
  let lastDebt = loanDetails.principal;
  for (const entry of schedule) {
    if (entry.month <= referenceDate) lastDebt = entry.debt;
    else break;
  }
  return Math.max(0, lastDebt);
}

export function calculateTotalInterest(loanDetails) {
  if (loanDetails.interest_rate === 0) return 0;
  if (loanDetails.rate_mode === 'enter')
    return (loanDetails.amount * loanDetails.term_months) - loanDetails.principal;
  return _buildAmortizationSchedule(loanDetails).reduce((sum, e) => sum + e.interest, 0);
}

export function calculateRemainingTerm(loanDetails, referenceDate) {
  return _buildAmortizationSchedule(loanDetails).filter(e => e.month > referenceDate).length;
}

export function calculatePayoffDate(loanDetails) {
  const schedule = _buildAmortizationSchedule(loanDetails);
  return schedule.length > 0 ? schedule[schedule.length - 1].month : loanDetails.start_date;
}

export function calculateSpecialPaymentSavings(loanDetails) {
  if (!loanDetails.special_payments?.length) return { saved_months: 0, saved_interest: 0 };
  const withSP    = _buildAmortizationSchedule(loanDetails);
  const withoutSP = _buildAmortizationSchedule({ ...loanDetails, special_payments: [] });
  return {
    saved_months:   Math.max(0, withoutSP.length - withSP.length),
    saved_interest: Math.max(0,
      withoutSP.reduce((sum, e) => sum + e.interest, 0) - withSP.reduce((sum, e) => sum + e.interest, 0)
    ),
  };
}

export function calculateCurrentPayment(loanDetails, referenceDate) {
  const schedule = _buildAmortizationSchedule(loanDetails);
  const ym = referenceDate.slice(0, 7); // "YYYY-MM"
  const entry = schedule.find(e => e.month.slice(0, 7) === ym);
  if (!entry) return loanDetails.amount;
  return entry.interest + entry.principal_paid;
}
