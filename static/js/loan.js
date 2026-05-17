'use strict';

export function calculateMonthlyRate(principal, annualInterestRate, termMonths) {
  if (annualInterestRate === 0) return principal / termMonths;
  const r = annualInterestRate / 12 / 100;
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export function calculateTermFromRate(principal, annualInterestRate, monthlyRate) {
  if (annualInterestRate === 0) return Math.ceil(principal / monthlyRate);
  const r = annualInterestRate / 12 / 100;
  return Math.ceil(-Math.log(1 - r * principal / monthlyRate) / Math.log(1 + r));
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

  for (let i = 0; i < maxMonths && debt > 0.005; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const interest = interestRate === 0 ? 0 : debt * (interestRate / 12 / 100);
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
  return _buildAmortizationSchedule(loanDetails).reduce((sum, e) => sum + e.interest, 0);
}

export function calculateRemainingTerm(loanDetails, referenceDate) {
  return _buildAmortizationSchedule(loanDetails).filter(e => e.month > referenceDate).length;
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
