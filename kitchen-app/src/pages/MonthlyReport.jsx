import { useState } from 'react';
import { store, formatNumber } from '../store';

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isInMonth(date, month) {
  return typeof date === 'string' && date.slice(0, 7) === month;
}

export default function MonthlyReport() {
  const [month, setMonth] = useState(currentMonth);
  const [, setRefreshKey] = useState(0);

  const report = (() => {
    const history = store.getRecipeHistory().filter(entry => isInMonth(entry.date, month));
    const claims = store.getAmountClaims().filter(claim => isInMonth(claim.date, month));
    const purchases = store.getPurchases().filter(entry => isInMonth(entry.date, month));
    const otherExpenses = store.getExpenses().filter(entry => isInMonth(entry.date, month));
    const productionExpenses = history.reduce((sum, entry) => sum + (entry.adjustedCost ?? entry.totalCost ?? 0), 0);
    const purchasingExpenses = purchases.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    const otherExpenseTotal = otherExpenses.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0);
    const expenses = productionExpenses + purchasingExpenses + otherExpenseTotal;
    const revenue = claims.reduce((sum, claim) => {
      const calculatedTotal = (claim.menuCost || 0) * (claim.count || 0);
      const nonChargeable = claim.paymentStatus === 'Non-Chargeable';
      return sum + (nonChargeable ? 0 : (claim.finalCost ?? calculatedTotal));
    }, 0);
    const paidRevenue = claims.reduce((sum, claim) => {
      if (claim.paymentStatus !== 'Paid' || claim.paymentStatus === 'Non-Chargeable') return sum;
      const calculatedTotal = (claim.menuCost || 0) * (claim.count || 0);
      return sum + (claim.finalCost ?? calculatedTotal);
    }, 0);

    return {
      history,
      claims,
      purchases,
      otherExpenses,
      productionExpenses,
      purchasingExpenses,
      otherExpenseTotal,
      expenses,
      revenue,
      paidRevenue,
      pendingRevenue: revenue - paidRevenue,
      net: revenue - expenses,
    };
  })();

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="flex items-center justify-between" style={{ gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div>
            <h1>Monthly Report</h1>
            <p>Review kitchen expenses and department revenue for a selected month.</p>
          </div>
          <div className="flex items-center gap-sm">
            <label className="form-label" htmlFor="report-month" style={{ margin: 0 }}>Month</label>
            <input
              id="report-month"
              type="month"
              className="form-input"
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => setRefreshKey(value => value + 1)}>Refresh</button>
          </div>
        </div>
      </div>

      <div className="stat-grid animate-in-delayed">
        <div className="stat-card">
          <div className="stat-label">Expenses</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>₹{formatNumber(report.expenses, 0)}</div>
          <div className="stat-change neutral">Production ₹{formatNumber(report.productionExpenses, 0)} · Purchasing ₹{formatNumber(report.purchasingExpenses, 0)} · Other ₹{formatNumber(report.otherExpenseTotal, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue</div>
          <div className="stat-value text-success">₹{formatNumber(report.revenue, 0)}</div>
          <div className="stat-change positive">{report.claims.length} claim{report.claims.length === 1 ? '' : 's'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Result</div>
          <div className="stat-value" style={{ color: report.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ₹{formatNumber(report.net, 0)}
          </div>
          <div className="stat-change neutral">Revenue minus expenses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue Collection</div>
          <div className="stat-value">₹{formatNumber(report.paidRevenue, 0)}</div>
          <div className="stat-change neutral">₹{formatNumber(report.pendingRevenue, 0)} pending</div>
        </div>
      </div>

      <div className="report-definition card animate-in">
        <div>
          <strong>Expenses</strong>
          <span>Production cost plus purchasing and other expense debits. Purchases and expenses are tracked separately to avoid double-counting.</span>
        </div>
        <div>
          <strong>Revenue</strong>
          <span>Final Cost recorded in Amount Claim. Non-chargeable departments are excluded.</span>
        </div>
      </div>

      <div className="report-grid animate-in-delayed">
        <section className="card">
          <div className="card-header">
            <h2>Production Expenses · {monthLabel}</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Date</th><th className="text-right">Ingredient Cost</th><th className="text-right">Adjusted Cost</th></tr>
              </thead>
              <tbody>
                {report.history.length === 0 ? (
                  <tr><td colSpan={3} className="empty-state-cell">No production expenses recorded.</td></tr>
                ) : report.history.map(entry => (
                  <tr key={entry.id || entry.date}>
                    <td>{entry.dateFormatted || entry.date}</td>
                    <td className="text-right">₹{formatNumber(entry.totalCost, 2)}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(entry.adjustedCost ?? entry.totalCost, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h2>Purchasing &amp; Other Expenses · {monthLabel}</h2></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Particulars</th><th className="text-right">Debit</th></tr></thead>
              <tbody>
                {report.purchases.length === 0 && report.otherExpenses.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state-cell">No purchasing or other expenses recorded.</td></tr>
                ) : (
                  <>
                    {report.purchases.map(entry => <tr key={`purchase-${entry.id}`}><td>{entry.date}</td><td>{entry.category}</td><td>{entry.item}</td><td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(entry.amount, 2)}</td></tr>)}
                    {report.otherExpenses.map(entry => <tr key={`expense-${entry.id}`}><td>{entry.date}</td><td>{entry.type}</td><td>{entry.particulars}</td><td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(entry.debit, 2)}</td></tr>)}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Revenue · {monthLabel}</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Date</th><th>Department</th><th>Status</th><th className="text-right">Final Cost</th></tr>
              </thead>
              <tbody>
                {report.claims.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state-cell">No revenue claims recorded.</td></tr>
                ) : report.claims.map(claim => {
                  const calculatedTotal = (claim.menuCost || 0) * (claim.count || 0);
                  const amount = claim.paymentStatus === 'Non-Chargeable' ? 0 : (claim.finalCost ?? calculatedTotal);
                  return (
                    <tr key={claim.id}>
                      <td>{claim.date}</td>
                      <td>{claim.dept}</td>
                      <td><span className="badge badge-neutral">{claim.paymentStatus}</span></td>
                      <td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(amount, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
