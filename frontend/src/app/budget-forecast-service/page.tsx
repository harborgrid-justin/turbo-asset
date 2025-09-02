import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
  status: 'Active' | 'Completed' | 'Over Budget';
  createdAt: string;
}

interface Forecast {
  id: string;
  name: string;
  category: string;
  projectedAmount: number;
  actualAmount: number;
  variance: number;
  period: string;
  confidence: number;
}

const BudgetForecastServicePage = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'budgets' | 'forecasts'>('budgets');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newBudget, setNewBudget] = useState({
    name: '',
    category: '',
    amount: 0,
    period: 'Monthly'
  });

  const [newForecast, setNewForecast] = useState({
    name: '',
    category: '',
    projectedAmount: 0,
    period: 'Monthly'
  });

  // Load data on component mount
  useEffect(() => {
    loadBudgets();
    loadForecasts();
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      // Using generic API service for budget management
      const data = await apiService.generic.getAll<Budget>('budget-forecast/budgets');
      setBudgets(data);
    } catch (err) {
      setError('Failed to load budgets. Please try again.');
      console.error('Error loading budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadForecasts = async () => {
    try {
      const data = await apiService.generic.getAll<Forecast>('budget-forecast/forecasts');
      setForecasts(data);
    } catch (err) {
      console.error('Error loading forecasts:', err);
    }
  };

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBudget(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleForecastInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewForecast(prev => ({
      ...prev,
      [name]: name === 'projectedAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.name || !newBudget.category || newBudget.amount <= 0) {
      setError('Please fill in all required fields with valid values.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const createdBudget = await apiService.generic.create<Budget>('budget-forecast/budgets', newBudget);
      setBudgets(prev => [...prev, createdBudget]);
      setNewBudget({ name: '', category: '', amount: 0, period: 'Monthly' });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create budget. Please try again.');
      console.error('Error creating budget:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForecastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForecast.name || !newForecast.category || newForecast.projectedAmount <= 0) {
      setError('Please fill in all required fields with valid values.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const createdForecast = await apiService.generic.create<Forecast>('budget-forecast/forecasts', newForecast);
      setForecasts(prev => [...prev, createdForecast]);
      setNewForecast({ name: '', category: '', projectedAmount: 0, period: 'Monthly' });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create forecast. Please try again.');
      console.error('Error creating forecast:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Over Budget': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBudgetProgress = (spent: number, amount: number) => {
    return Math.min((spent / amount) * 100, 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Budget Forecast Service</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('budgets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'budgets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budgets
            </button>
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'forecasts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Forecasts
            </button>
          </nav>
        </div>
      </div>

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Budget Management</h2>
            <div className="flex space-x-2">
              <button
                onClick={loadBudgets}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={submitting}
              >
                {showCreateForm ? 'Cancel' : 'Create Budget'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Budget</h3>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Budget Name</label>
                    <input
                      type="text"
                      name="name"
                      value={newBudget.name}
                      onChange={handleBudgetInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={newBudget.category}
                      onChange={handleBudgetInputChange}
                      placeholder="e.g., Marketing, Operations"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      name="amount"
                      value={newBudget.amount}
                      onChange={handleBudgetInputChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Period</label>
                    <select
                      name="period"
                      value={newBudget.period}
                      onChange={handleBudgetInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={submitting}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Budget'}
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => (
              <div key={budget.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{budget.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getBudgetStatusColor(budget.status)}`}>
                    {budget.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{budget.category}</p>
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Spent: ${budget.spent.toLocaleString()}</span>
                    <span>Budget: ${budget.amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getBudgetProgress(budget.spent, budget.amount) > 90
                          ? 'bg-red-500'
                          : getBudgetProgress(budget.spent, budget.amount) > 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${getBudgetProgress(budget.spent, budget.amount)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(getBudgetProgress(budget.spent, budget.amount))}% used
                  </p>
                </div>
                <p className="text-xs text-gray-500">Period: {budget.period}</p>
              </div>
            ))}
          </div>

          {budgets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No budgets found. Create your first budget to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Forecasts Tab */}
      {activeTab === 'forecasts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Financial Forecasts</h2>
            <div className="flex space-x-2">
              <button
                onClick={loadForecasts}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={submitting}
              >
                {showCreateForm ? 'Cancel' : 'Create Forecast'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Forecast</h3>
              <form onSubmit={handleForecastSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Forecast Name</label>
                    <input
                      type="text"
                      name="name"
                      value={newForecast.name}
                      onChange={handleForecastInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={newForecast.category}
                      onChange={handleForecastInputChange}
                      placeholder="e.g., Revenue, Expenses"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Projected Amount</label>
                    <input
                      type="number"
                      name="projectedAmount"
                      value={newForecast.projectedAmount}
                      onChange={handleForecastInputChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Period</label>
                    <select
                      name="period"
                      value={newForecast.period}
                      onChange={handleForecastInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={submitting}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Forecast'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {forecasts.map((forecast) => (
              <div key={forecast.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{forecast.name}</h3>
                    <p className="text-sm text-gray-600">{forecast.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Confidence: {forecast.confidence}%</p>
                    <p className={`text-sm font-semibold ${getVarianceColor(forecast.variance)}`}>
                      Variance: {forecast.variance > 0 ? '+' : ''}{forecast.variance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Projected</p>
                    <p className="text-lg font-semibold">${forecast.projectedAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actual</p>
                    <p className="text-lg font-semibold">${forecast.actualAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="text-lg font-semibold">{forecast.period}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {forecasts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No forecasts found. Create your first forecast to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetForecastServicePage;
