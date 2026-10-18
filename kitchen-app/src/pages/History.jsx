import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, formatNumber } from '../store';
import { exportDayToExcel, exportAllHistoryToExcel } from '../utils/excelExport';

export default function History() {
  const navigate = useNavigate();
  const [historyList, setHistoryList] = useState(() => store.getRecipeHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', '7days', '30days'
  const [expandedId, setExpandedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleRefresh() {
    setHistoryList(store.getRecipeHistory());
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this historical production sheet?')) {
      const updated = store.deleteRecipeHistory(id);
      setHistoryList(updated);
      showToast('Record removed from history');
    }
  }

  function handleExportDay(entry, e) {
    e.stopPropagation();
    try {
      exportDayToExcel(entry);
      showToast(`📥 Exported Excel for ${entry.date}`);
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel: ' + err.message);
    }
  }

  function handleExportAll() {
    if (filteredHistory.length === 0) {
      alert('No history records to export.');
      return;
    }
    try {
      exportAllHistoryToExcel(filteredHistory);
      showToast(`📥 Exported master Excel with ${filteredHistory.length} production runs!`);
    } catch (err) {
      console.error(err);
      alert('Failed to export master Excel: ' + err.message);
    }
  }

  function handleLoadInDailyKitchen(entry, e) {
    e.stopPropagation();
    navigate(`/daily-kitchen?date=${entry.date}`);
  }

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter(entry => {
      // Period filter
      if (filterPeriod !== 'all') {
        const entryDate = new Date(entry.date + 'T00:00:00');
        const now = new Date();
        const diffDays = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
        if (filterPeriod === '7days' && diffDays > 7) return false;
        if (filterPeriod === '30days' && diffDays > 30) return false;
      }

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDate = entry.date.toLowerCase().includes(q) || (entry.dateFormatted || '').toLowerCase().includes(q);
      const matchDept = (entry.departments || []).some(d => d.name.toLowerCase().includes(q));
      
      const allDishes = [
        ...(entry.meals?.breakfast || []),
        ...(entry.meals?.lunch || []),
        ...(entry.meals?.dinner || []),
      ];
      const matchDish = allDishes.some(d => (d.dish || '').toLowerCase().includes(q));

      return matchDate || matchDept || matchDish;
    });
  }, [historyList, searchQuery, filterPeriod]);

  // High-level statistics
  const stats = useMemo(() => {
    const totalRuns = historyList.length;
    const totalHeadcount = historyList.reduce((sum, h) => sum + (h.totalPeople || 0), 0);
    const totalSpend = historyList.reduce((sum, h) => sum + (h.adjustedCost ?? h.totalCost ?? 0), 0);
    const latestDate = historyList.length > 0 ? historyList[0].dateFormatted || historyList[0].date : 'None';

    return { totalRuns, totalHeadcount, totalSpend, latestDate };
  }, [historyList]);

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification animate-in">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1>Recipe & Production History</h1>
            <p>Archive of all generated daily kitchen production sheets, scaled quantities, costs, and Excel downloads.</p>
          </div>
          <div className="flex gap-md">
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              title="Refresh list"
            >
              🔄 Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExportAll}
              disabled={filteredHistory.length === 0}
              title="Download consolidated Excel file for all records"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff' }}
            >
              📊 Export Master Excel ({filteredHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="stat-grid animate-in">
        <div className="stat-card">
          <div className="stat-label">Total Generated Runs</div>
          <div className="stat-value">{stats.totalRuns}</div>
          <div className="stat-change positive">Archived daily batches</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Meals Cooked</div>
          <div className="stat-value">{stats.totalHeadcount.toLocaleString()}</div>
          <div className="stat-change neutral">Cumulative headcount</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Adjusted Cost</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>₹{formatNumber(stats.totalSpend, 0)}</div>
          <div className="stat-change positive">Includes operating cost multiplier</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latest Production Run</div>
          <div className="stat-value" style={{ fontSize: 18, marginTop: 4 }}>
            {stats.latestDate}
          </div>
          <div className="stat-change neutral">Most recent snapshot</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-xl animate-in" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-md" style={{ flex: 1, minWidth: 280 }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD), recipe name (e.g. Alu Bagan, Dal Fry), or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex items-center gap-md">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="form-input"
              style={{ width: 140 }}
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Records List */}
      {filteredHistory.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Production Records Found</h2>
          <p style={{ color: 'var(--text-tertiary)', maxWidth: 460, margin: '0 auto 20px' }}>
            {searchQuery
              ? 'No historical production sheets match your search term. Try resetting your query.'
              : 'You have not generated any daily kitchen runs yet. Go to Daily Kitchen to generate recipes for tomorrow!'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/daily-kitchen')}
          >
            🍳 Go to Daily Kitchen
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
          {filteredHistory.map(entry => {
            const isExpanded = expandedId === entry.id;
            const bDishes = entry.meals?.breakfast || [];
            const lDishes = entry.meals?.lunch || [];
            const dDishes = entry.meals?.dinner || [];

            return (
              <div
                key={entry.id}
                className="card animate-in"
                style={{
                  border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  padding: 20,
                }}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div className="flex items-center gap-md">
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12) 0%, rgba(234, 88, 12, 0.04) 100%)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      📅
                    </div>
                    <div>
                      <div className="flex items-center gap-sm">
                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {entry.dateFormatted || entry.date}
                        </h3>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-tertiary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {entry.date}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Generated: {entry.generatedAt ? new Date(entry.generatedAt).toLocaleString('en-IN') : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges & Action Buttons */}
                  <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
                    {/* Headcount pill */}
                    <div
                      style={{
                        padding: '6px 14px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      👥 {entry.totalPeople} Headcount
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>
                        ({entry.chargeablePeople || 0} billable • {entry.nonChargeablePeople || 0} Temple free)
                      </span>
                    </div>

                    {/* Cost summary */}
                    <div className="history-cost-summary">
                      <span>Ingredient ₹{formatNumber(entry.totalCost, 0)}</span>
                      <strong>Adjusted ₹{formatNumber(entry.adjustedCost ?? entry.totalCost, 0)}</strong>
                    </div>

                    {/* Quick Action: Download Excel */}
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => handleExportDay(entry, e)}
                      title="Download this day's production sheet in Excel (.xlsx)"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderColor: '#10b981',
                        color: '#059669',
                      }}
                    >
                      <span>📥</span> Download Excel
                    </button>

                    {/* Open in Daily Kitchen */}
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => handleLoadInDailyKitchen(entry, e)}
                      title="Open and edit this sheet in Daily Kitchen"
                      style={{ fontSize: 13 }}
                    >
                      🍳 View in Kitchen
                    </button>

                    {/* Delete button */}
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => handleDelete(entry.id, e)}
                      title="Delete this historical record"
                      style={{ color: 'var(--danger)', fontSize: 13, padding: '6px 10px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Meals Overview Pills */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  {bDishes.length > 0 && (
                    <div className="flex items-center gap-xs">
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Breakfast:
                      </span>
                      {bDishes.map((d, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          {d.dish} ({d.requiredYield} {d.yieldUnit || 'L'})
                        </span>
                      ))}
                    </div>
                  )}

                  {lDishes.length > 0 && (
                    <div className="flex items-center gap-xs">
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Lunch:
                      </span>
                      {lDishes.map((d, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            background: 'rgba(234, 88, 12, 0.08)',
                            color: 'var(--text-primary)',
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          {d.dish} ({d.requiredYield} {d.yieldUnit || 'L'})
                        </span>
                      ))}
                    </div>
                  )}

                  {dDishes.length > 0 && (
                    <div className="flex items-center gap-xs">
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Dinner:
                      </span>
                      {dDishes.map((d, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          {d.dish} ({d.requiredYield} {d.yieldUnit || 'L'})
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      {isExpanded ? '▲ Hide Full Recipe Breakdown' : '▼ View Scaled Recipes & Steps'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Recipe & Ingredient Breakdown */}
                {isExpanded && (
                  <div
                    className="animate-in"
                    style={{
                      marginTop: 18,
                      padding: 16,
                      background: 'var(--bg-primary)',
                      borderRadius: 12,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-md">
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Detailed Recipe Scaled Production Sheets
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => handleExportDay(entry, e)}
                        style={{ fontSize: 12, padding: '4px 8px', color: '#059669', borderColor: '#10b981' }}
                      >
                        📥 Download Single Day Excel
                      </button>
                    </div>

                    {['breakfast', 'lunch', 'dinner'].map(mealKey => {
                      const dishes = entry.meals?.[mealKey] || [];
                      if (dishes.length === 0) return null;

                      return (
                        <div key={mealKey} style={{ marginBottom: 20 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--accent)',
                              marginBottom: 8,
                              letterSpacing: '0.05em',
                            }}
                          >
                            {mealKey} Production
                          </div>

                          {dishes.map((dishItem, dIdx) => (
                            <div
                              key={dIdx}
                              style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: 8,
                                border: '1px solid var(--border-subtle)',
                                padding: 12,
                                marginBottom: 12,
                              }}
                            >
                              <div className="flex items-center justify-between mb-sm">
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {dishItem.dish}
                                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                                    Required Yield: <strong>{dishItem.requiredYield} {dishItem.yieldUnit || 'L'}</strong> (Serving: {dishItem.serving} {dishItem.servingUnit || 'ml'}/person)
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                                  Est. Cost: ₹{formatNumber(dishItem.totalCost, 2)}
                                </div>
                              </div>

                              {/* Ingredients Table */}
                              <div className="table-wrapper" style={{ margin: 0 }}>
                                <table className="data-table" style={{ fontSize: 12 }}>
                                  <thead>
                                    <tr>
                                      <th>Ingredient</th>
                                      <th style={{ textAlign: 'right' }}>Standard Qty</th>
                                      <th style={{ textAlign: 'right' }}>Calculated Qty</th>
                                      <th style={{ textAlign: 'right' }}>Final Qty</th>
                                      <th style={{ textAlign: 'right' }}>Real Qty</th>
                                      <th>Unit</th>
                                      <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                                      <th>Cooking Step (विधि)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(dishItem.ingredients || []).map((ing, iIdx) => (
                                      <tr key={iIdx}>
                                        <td style={{ fontWeight: 600 }}>{ing.name}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{ing.standardQty}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                          {formatNumber(ing.calculatedQty ?? ing.requiredQty, 2)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                                          {formatNumber(ing.finalQty ?? ing.requiredQty, 2)}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                                          {ing.realQty === '' || ing.realQty === undefined ? '—' : formatNumber(ing.realQty, 2)}
                                        </td>
                                        <td>{ing.unit}</td>
                                        <td style={{ textAlign: 'right' }}>₹{formatNumber(ing.rate, 2)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{formatNumber(ing.amount, 2)}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 280 }}>
                                          {ing.cookingProcess ||
                                            dishItem.cookingSteps?.find(cs =>
                                              cs.ingredient === ing.name || cs.ingredients?.includes(ing.name)
                                            )?.hindi ||
                                            dishItem.cookingSteps?.find(cs => cs.ingredient === ing.name)?.text ||
                                            '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Detailed Cooking Process (बनाने की विधि) */}
                              {dishItem.cookingSteps && dishItem.cookingSteps.length > 0 && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                                    🍳 Cooking Process (बनाने की विधि):
                                  </div>
                                  <div className="flex flex-col gap-xs">
                                    {dishItem.cookingSteps.map((step, sIdx) => (
                                      <div key={sIdx} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, lineHeight: 1.45 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{step.stepNumber}.</span>
                                        <span>
                                          {step.ingredients?.length > 0 && (
                                            <strong style={{ color: 'var(--text-primary)' }}>{step.ingredients.join(', ')}: </strong>
                                          )}
                                          {step.ingredient && <strong style={{ color: 'var(--text-primary)' }}>{step.ingredient}: </strong>}
                                          {step.english && <div>{step.english}</div>}
                                          {step.hindi || step.text || '—'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
