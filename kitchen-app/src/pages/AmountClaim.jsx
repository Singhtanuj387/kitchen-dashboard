import { useState, useMemo } from 'react';
import { store, formatNumber } from '../store';

export default function AmountClaim() {
  const [claims, setClaims] = useState(() => store.getAmountClaims());
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    date: '', dept: '', menu: '', menuCost: '', count: '', paymentStatus: 'Pending'
  });

  const departments = store.getDepartments();

  function isDeptNonChargeable(deptName) {
    const d = departments.find(item => item.name.toLowerCase() === (deptName || '').toLowerCase());
    if (d) return d.isChargeable === false;
    return (deptName || '').toLowerCase().includes('temple') || (deptName || '').toLowerCase().includes('kh(10)');
  }

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (filterDept !== 'all' && c.dept !== filterDept) return false;
      if (filterStatus !== 'all' && c.paymentStatus !== filterStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [claims, filterDept, filterStatus]);

  const totals = useMemo(() => {
    let totalCost = 0;
    let paid = 0;
    let pending = 0;
    let partial = 0;
    let nonChargeableCount = 0;
    filteredClaims.forEach(c => {
      const isNon = c.paymentStatus === 'Non-Chargeable' || isDeptNonChargeable(c.dept);
      const cost = isNon ? 0 : (c.menuCost * c.count);
      totalCost += cost;
      if (isNon) {
        nonChargeableCount += (c.count || 0);
      } else if (c.paymentStatus === 'Paid') {
        paid += cost;
      } else if (c.paymentStatus === 'Pending') {
        pending += cost;
      } else {
        partial += cost;
      }
    });
    return { totalCost, paid, pending, partial, nonChargeableCount };
  }, [filteredClaims, departments]);

  function openAdd() {
    setEditingClaim(null);
    const defaultDept = departments[0]?.name || '';
    const isNon = isDeptNonChargeable(defaultDept);
    setForm({
      date: new Date().toISOString().split('T')[0],
      dept: defaultDept,
      menu: '',
      menuCost: isNon ? '0' : '',
      count: departments[0]?.defaultCount?.toString() || '',
      paymentStatus: isNon ? 'Non-Chargeable' : 'Pending',
    });
    setShowModal(true);
  }

  function openEdit(claim) {
    setEditingClaim(claim);
    const isNon = isDeptNonChargeable(claim.dept);
    setForm({
      date: claim.date,
      dept: claim.dept,
      menu: claim.menu,
      menuCost: isNon ? '0' : claim.menuCost.toString(),
      count: claim.count.toString(),
      paymentStatus: isNon ? 'Non-Chargeable' : claim.paymentStatus,
    });
    setShowModal(true);
  }

  function handleDeptChange(deptName) {
    const isNon = isDeptNonChargeable(deptName);
    setForm(prev => ({
      ...prev,
      dept: deptName,
      menuCost: isNon ? '0' : (prev.menuCost === '0' ? '' : prev.menuCost),
      paymentStatus: isNon ? 'Non-Chargeable' : (prev.paymentStatus === 'Non-Chargeable' ? 'Pending' : prev.paymentStatus),
    }));
  }

  function handleSave() {
    if (!form.date || !form.dept || form.menuCost === '' || !form.count) return;
    const isNon = isDeptNonChargeable(form.dept);
    const data = {
      date: form.date,
      dept: form.dept,
      menu: form.menu.trim(),
      menuCost: isNon ? 0 : parseFloat(form.menuCost),
      count: parseInt(form.count, 10),
      paymentStatus: isNon ? 'Non-Chargeable' : form.paymentStatus,
    };
    if (editingClaim) {
      const updated = store.updateAmountClaim(editingClaim.id, data);
      setClaims(updated);
    } else {
      store.addAmountClaim(data);
      setClaims(store.getAmountClaims());
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    const updated = store.deleteAmountClaim(id);
    setClaims(updated);
  }

  function toggleStatus(claim) {
    if (isDeptNonChargeable(claim.dept) || claim.paymentStatus === 'Non-Chargeable') {
      return;
    }
    const statusCycle = ['Pending', 'Partial', 'Paid'];
    const currentIdx = statusCycle.indexOf(claim.paymentStatus);
    const nextStatus = statusCycle[(currentIdx + 1) % 3];
    const updated = store.updateAmountClaim(claim.id, { paymentStatus: nextStatus });
    setClaims(updated);
  }

  const isFormDeptNonChargeable = isDeptNonChargeable(form.dept);

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1>Amount Claim</h1>
        <p>Track what each department owes. Temple + KH(10) is non-chargeable (exempt from billing).</p>
      </div>

      <div className="stat-grid animate-in-delayed">
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">₹{formatNumber(totals.totalCost, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value text-success">₹{formatNumber(totals.paid, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>₹{formatNumber(totals.pending, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Partial</div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>₹{formatNumber(totals.partial, 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Non-Chargeable</div>
          <div className="stat-value" style={{ color: 'var(--text-tertiary)' }}>{totals.nonChargeableCount} people</div>
        </div>
      </div>

      <div className="card animate-in-delayed">
        <div className="card-header">
          <h2>Claims</h2>
          <div className="flex items-center gap-md">
            <select
              className="form-select"
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} {d.isChargeable === false ? '(Non-Chargeable)' : ''}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 155 }}
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Non-Chargeable">Non-Chargeable</option>
            </select>
            <button className="btn btn-primary" onClick={openAdd}>+ Add Claim</button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Menu</th>
                <th className="text-right">Menu Cost (₹)</th>
                <th className="text-right">Count</th>
                <th className="text-right">Total Cost (₹)</th>
                <th className="text-center">Status</th>
                <th className="text-center" style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">💰</div>
                      <h3>No claims recorded</h3>
                      <p>Add a claim to start tracking department payments.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClaims.map(claim => {
                  const isNon = claim.paymentStatus === 'Non-Chargeable' || isDeptNonChargeable(claim.dept);
                  const totalCost = isNon ? 0 : (claim.menuCost * claim.count);
                  return (
                    <tr key={claim.id}>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {new Date(claim.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div className="flex items-center gap-xs flex-wrap">
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{claim.dept}</span>
                          {isNon && (
                            <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>
                              Non-Chargeable
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{claim.menu || '-'}</td>
                      <td className="text-right font-mono">
                        {isNon ? <span style={{ color: 'var(--text-muted)' }}>₹0 (Free)</span> : `₹${claim.menuCost}`}
                      </td>
                      <td className="text-right font-mono">{claim.count}</td>
                      <td className="text-right font-mono" style={{ fontWeight: 600, color: isNon ? 'var(--text-muted)' : 'var(--accent)' }}>
                        {isNon ? '₹0 (Exempt)' : `₹${formatNumber(totalCost, 0)}`}
                      </td>
                      <td className="text-center">
                        {isNon ? (
                          <span className="badge badge-neutral" style={{ padding: '3px 8px', fontSize: 11 }}>
                            Non-Chargeable
                          </span>
                        ) : (
                          <button
                            className={`badge ${
                              claim.paymentStatus === 'Paid' ? 'badge-success' :
                              claim.paymentStatus === 'Pending' ? 'badge-warning' :
                              'badge-info'
                            }`}
                            onClick={() => toggleStatus(claim)}
                            style={{ cursor: 'pointer', border: 'none' }}
                            title="Click to cycle status"
                          >
                            {claim.paymentStatus}
                          </button>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-sm">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(claim)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(claim.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {filteredClaims.length > 0 && (
                <tr style={{ background: 'var(--bg-tertiary)' }}>
                  <td colSpan={5} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Grand Total (Billable)</td>
                  <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>
                    ₹{formatNumber(totals.totalCost, 0)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClaim ? 'Edit Claim' : 'Add Claim'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-lg">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={form.dept}
                      onChange={e => handleDeptChange(e.target.value)}
                    >
                      <option value="">Select department...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name} {d.isChargeable === false ? '(Non-Chargeable)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isFormDeptNonChargeable && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    borderLeft: '3px solid var(--text-muted)'
                  }}>
                    🌿 <strong>{form.dept}</strong> is designated as <strong>Non-Chargeable</strong> (Temple / Seva). Rate is ₹0 and claim is exempt from billing.
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Menu Items</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Jeera Rice, Sambhar"
                    value={form.menu}
                    onChange={e => setForm({ ...form, menu: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Menu Cost (₹ per person)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="60"
                      value={form.menuCost}
                      onChange={e => setForm({ ...form, menuCost: e.target.value })}
                      min="0"
                      disabled={isFormDeptNonChargeable}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Count (people)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="50"
                      value={form.count}
                      onChange={e => setForm({ ...form, count: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
                {form.menuCost && form.count && (
                  <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Cost: </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: isFormDeptNonChargeable ? 'var(--text-muted)' : 'var(--accent)' }}>
                      {isFormDeptNonChargeable ? '₹0 (Exempt)' : `₹${formatNumber(parseFloat(form.menuCost || 0) * parseInt(form.count || 0, 10), 0)}`}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  {isFormDeptNonChargeable ? (
                    <input
                      type="text"
                      className="form-input"
                      value="Non-Chargeable"
                      disabled
                    />
                  ) : (
                    <select
                      className="form-select"
                      value={form.paymentStatus}
                      onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingClaim ? 'Update' : 'Add Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
