import { api } from './api.js';

export const state = { settings: {}, expenses: [], incomes: [], forecast: null };

const _subs = [];
export function subscribe(fn) { _subs.push(fn); }
function _notify() { for (const fn of _subs) fn(state); }

export async function refresh() {
  const [settings, expenses, incomes] = await Promise.all([
    api.getSettings(), api.getExpenses(), api.getIncomes(),
  ]);
  state.settings = settings;
  state.expenses = expenses;
  state.incomes  = incomes;
  try { state.forecast = await api.getForecast(); }
  catch { state.forecast = null; }
  _notify();
}
