import { useState } from 'react';
import { store, formatNumber } from '../store';

export default function CostSettings() {
  const [multiplier, setMultiplier] = useState(() => store.getCostSettings().multiplier.toString());
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleSave(event) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const saved = store.saveCostSettings({ multiplier });
      setMultiplier(saved.multiplier.toString());
      showToast(`Cost multiplier updated to ${formatNumber(saved.multiplier, 2)}x`);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  const currentMultiplier = Number(multiplier) || 1;

  return (
    <div className="page-container">
      {toastMessage && (
        <div className="toast-notification animate-in">
          <span>✓</span> {toastMessage}
        </div>
      )}

      <div className="page-header animate-in">
        <div>
          <h1>Cost Settings</h1>
          <p>Set the shared adjustment multiplier used to account for kitchen operating costs.</p>
        </div>
      </div>

      <div className="card animate-in-delayed" style={{ maxWidth: 720 }}>
        <div className="card-header">
          <div>
            <h2>Adjusted Cost Multiplier</h2>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
              This value applies to every recipe and production plan.
            </p>
          </div>
          <span className="badge badge-info">{formatNumber(currentMultiplier, 2)}x active</span>
        </div>

        <form className="card-body" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="cost-multiplier">Multiplier</label>
            <div className="flex items-center gap-md">
              <input
                id="cost-multiplier"
                type="number"
                className="form-input"
                value={multiplier}
                onChange={event => setMultiplier(event.target.value)}
                min="1"
                max="10"
                step="0.01"
                required
                style={{ maxWidth: 180, fontWeight: 700, fontSize: 16 }}
              />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>× ingredient cost</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 5 }}>
              Example: 1.2x adds 20% to ingredient cost for gas, water, electricity, and maintenance.
            </div>
            {errorMessage && (
              <div role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
                {errorMessage}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 'var(--space-xl)',
              padding: 'var(--space-lg)',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cost example</div>
            <div className="flex items-baseline gap-md" style={{ marginTop: 4 }}>
              <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>₹100</strong>
              <span style={{ color: 'var(--text-tertiary)' }}>ingredient cost</span>
              <span style={{ color: 'var(--text-tertiary)' }}>→</span>
              <strong style={{ fontSize: 22, color: 'var(--accent)' }}>
                ₹{formatNumber(100 * currentMultiplier, 2)}
              </strong>
              <span style={{ color: 'var(--text-tertiary)' }}>adjusted cost</span>
            </div>
          </div>

          <div className="flex justify-end" style={{ marginTop: 'var(--space-xl)' }}>
            <button type="submit" className="btn btn-primary">Save Multiplier</button>
          </div>
        </form>
      </div>
    </div>
  );
}
