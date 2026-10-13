import { useState } from 'react';
import { store } from '../store';

export default function Departments() {
  const [departments, setDepartments] = useState(() => store.getDepartments());
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ name: '', defaultCount: '', isChargeable: true });
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function openAdd() {
    setEditingDept(null);
    setForm({ name: '', defaultCount: '', isChargeable: true });
    setShowModal(true);
  }

  function openEdit(dept) {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      defaultCount: dept.defaultCount.toString(),
      isChargeable: dept.isChargeable !== false,
    });
    setShowModal(true);
  }

  function toggleChargeable(deptId) {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return;
    const newStatus = dept.isChargeable === false ? true : false;
    const updated = store.updateDepartment(deptId, { isChargeable: newStatus });
    setDepartments(updated);
    showToast(`${dept.name} is now ${newStatus ? 'Chargeable' : 'Non-Chargeable'}`);
  }

  function handleSave() {
    if (!form.name.trim() || !form.defaultCount) return;
    const data = {
      name: form.name.trim(),
      defaultCount: parseInt(form.defaultCount, 10),
      isChargeable: Boolean(form.isChargeable),
    };
    if (editingDept) {
      const updated = store.updateDepartment(editingDept.id, data);
      setDepartments(updated);
      showToast(`Updated ${data.name}`);
    } else {
      store.addDepartment(data);
      setDepartments(store.getDepartments());
      showToast(`Added ${data.name}`);
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    const dept = departments.find(d => d.id === id);
    const updated = store.deleteDepartment(id);
    setDepartments(updated);
    showToast(`Deleted ${dept?.name || 'department'}`);
  }

  const totalPeople = departments.reduce((sum, d) => sum + d.defaultCount, 0);
  const chargeablePeople = departments.filter(d => d.isChargeable !== false).reduce((sum, d) => sum + d.defaultCount, 0);
  const nonChargeablePeople = departments.filter(d => d.isChargeable === false).reduce((sum, d) => sum + d.defaultCount, 0);

  return (
    <div className="page-container">
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'var(--text-primary)',
          color: 'var(--bg-primary)',
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>✓</span> {toastMessage}
        </div>
      )}

      <div className="page-header animate-in flex items-center justify-between flex-wrap gap-md">
        <div>
          <h1>Departments</h1>
          <p>Manage food distribution departments. Set headcount and toggle whether a department is chargeable or non-chargeable.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          + Add Department
        </button>
      </div>

      <div className="stat-grid animate-in-delayed">
        <div className="stat-card">
          <div className="stat-label">Total Departments</div>
          <div className="stat-value">{departments.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Default People</div>
          <div className="stat-value">{totalPeople}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chargeable Headcount</div>
          <div className="stat-value text-accent">{chargeablePeople}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Non-Chargeable</div>
          <div className="stat-value" style={{ color: 'var(--text-tertiary)' }}>{nonChargeablePeople}</div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-lg)' }} className="animate-in-delayed">
        {departments.map(dept => (
          <div key={dept.id} className="card" style={{ padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: dept.isChargeable === false ? 'var(--bg-tertiary)' : 'var(--accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {dept.isChargeable === false ? '🏛️' : '🏢'}
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dept.id)}>Del</button>
                </div>
              </div>

              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                {dept.name}
              </div>

              <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
                  {dept.defaultCount}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>people</span>
              </div>
            </div>

            {/* Quick Toggle Area */}
            <div style={{
              paddingTop: 'var(--space-md)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-sm)'
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Billing Status:</span>
              <button
                type="button"
                className={`badge ${dept.isChargeable === false ? 'badge-neutral' : 'badge-success'}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  fontSize: 11,
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
                onClick={() => toggleChargeable(dept.id)}
                title="Click to toggle Chargeable / Non-Chargeable"
              >
                <span>{dept.isChargeable === false ? '🌿 Non-Chargeable' : '💼 Chargeable'}</span>
                <span style={{ opacity: 0.6, fontSize: 10 }}>⇄</span>
              </button>
            </div>
          </div>
        ))}

        {/* Add Department Card */}
        <div
          className="card"
          style={{
            padding: 'var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed var(--border-medium)',
            background: 'transparent',
            minHeight: 180,
          }}
          onClick={openAdd}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-sm)', opacity: 0.4 }}>+</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500 }}>Add Department</div>
          </div>
        </div>
      </div>

      {/* Directory & Quick Edit Table */}
      <div className="card animate-in-delayed" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card-header">
          <div>
            <h2>Department Directory & Quick Billing Switch</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Quickly edit whether each department is chargeable or non-chargeable using the dropdown below.
            </p>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Department</th>
                <th className="text-right">Default Headcount</th>
                <th style={{ width: 220 }}>Billing Option (Edit)</th>
                <th>Amount Claim Rules</th>
                <th className="text-center" style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, idx) => (
                <tr key={dept.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <span style={{ marginRight: 6 }}>{dept.isChargeable === false ? '🏛️' : '🏢'}</span>
                    {dept.name}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                    {dept.defaultCount} people
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        background: dept.isChargeable === false ? 'var(--bg-tertiary)' : 'var(--accent-subtle)',
                        color: dept.isChargeable === false ? 'var(--text-secondary)' : 'var(--accent)',
                        borderColor: dept.isChargeable === false ? 'var(--border-medium)' : 'var(--accent)'
                      }}
                      value={dept.isChargeable === false ? 'non-chargeable' : 'chargeable'}
                      onChange={e => {
                        const newStatus = e.target.value === 'chargeable';
                        const updated = store.updateDepartment(dept.id, { isChargeable: newStatus });
                        setDepartments(updated);
                        showToast(`${dept.name} is now ${newStatus ? 'Chargeable' : 'Non-Chargeable'}`);
                      }}
                    >
                      <option value="chargeable">💼 Chargeable (Billable)</option>
                      <option value="non-chargeable">🌿 Non-Chargeable (Free)</option>
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {dept.isChargeable === false ? (
                      <span style={{ color: 'var(--text-muted)' }}>₹0 exempt from billing claim (Temple/Seva)</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>Billed in Amount Claim at Menu Rate × Headcount</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-sm">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dept.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editingDept ? 'Edit Department' : 'Add Department'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-lg">
                <div className="form-group">
                  <label className="form-label">Department Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Temple + KH(10)"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Number of People</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="60"
                    value={form.defaultCount}
                    onChange={e => setForm({ ...form, defaultCount: e.target.value })}
                    min="0"
                  />
                </div>

                {/* Interactive Billing Type Selector */}
                <div className="form-group">
                  <label className="form-label">Billing Type (Is this department chargeable?)</label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 6 }}>
                    {/* Option 1: Chargeable */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: form.isChargeable ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
                        background: form.isChargeable ? 'var(--accent-subtle)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setForm({ ...form, isChargeable: true })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          <span>💼</span> Chargeable
                        </div>
                        {form.isChargeable && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                        Department is billed in Amount Claim per meal count.
                      </div>
                    </div>

                    {/* Option 2: Non-Chargeable */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: !form.isChargeable ? '2px solid var(--accent)' : '1px solid var(--border-medium)',
                        background: !form.isChargeable ? 'var(--accent-subtle)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setForm({ ...form, isChargeable: false })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          <span>🌿</span> Non-Chargeable
                        </div>
                        {!form.isChargeable && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                        Free / Seva. Billed at ₹0 cost in Amount Claim (exempt).
                      </div>
                    </div>
                  </div>

                  {/* Dropdown alternative */}
                  <select
                    className="form-select"
                    style={{ marginTop: 10 }}
                    value={form.isChargeable ? 'chargeable' : 'non-chargeable'}
                    onChange={e => setForm({ ...form, isChargeable: e.target.value === 'chargeable' })}
                  >
                    <option value="chargeable">💼 Chargeable (Billable)</option>
                    <option value="non-chargeable">🌿 Non-Chargeable (Free / Seva)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingDept ? 'Update Department' : 'Add Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
