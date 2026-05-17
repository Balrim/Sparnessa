async function _fetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  getSettings:   ()      => _fetch('/api/settings'),
  saveSettings:  (data)  => _fetch('/api/settings', { method: 'POST', body: data }),
  getExpenses:   ()      => _fetch('/api/expenses'),
  createExpense: (data)  => _fetch('/api/expenses', { method: 'POST', body: data }),
  updateExpense: (id, d) => _fetch(`/api/expenses/${id}`, { method: 'PUT', body: d }),
  deleteExpense: (id)    => _fetch(`/api/expenses/${id}`, { method: 'DELETE' }),
  getIncomes:    ()      => _fetch('/api/incomes'),
  createIncome:  (data)  => _fetch('/api/incomes', { method: 'POST', body: data }),
  updateIncome:  (id, d) => _fetch(`/api/incomes/${id}`, { method: 'PUT', body: d }),
  deleteIncome:  (id)    => _fetch(`/api/incomes/${id}`, { method: 'DELETE' }),
  getForecast:   ()      => _fetch('/api/forecast'),
  importData:    (data)  => _fetch('/api/import', { method: 'POST', body: data }),
  resetData:     ()      => _fetch('/api/reset', { method: 'POST' }),
};
