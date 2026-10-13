import { useState } from 'react';
import { store } from '../store';

export default function MasterList() {
  const [items, setItems] = useState(() => store.getMasterList());
  const [units, setUnits] = useState(() => store.getUnits());
  
  // Item Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', unit: 'Kg', pricePerUnit: '' });

  // Unit Modal State
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState({ symbol: '', name: '' });
  const [unitError, setUnitError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openAdd() {
    setEditingItem(null);
    setForm({ name: '', unit: units[0]?.symbol || 'Kg', pricePerUnit: '' });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setForm({ name: item.name, unit: item.unit, pricePerUnit: item.pricePerUnit.toString() });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.pricePerUnit) return;
    const data = {
      name: form.name.trim(),
      unit: form.unit,
      pricePerUnit: parseFloat(form.pricePerUnit),
    };
    if (editingItem) {
      const updated = store.updateMasterItem(editingItem.id, data);
      setItems(updated);
      showToast('Item updated successfully');
    } else {
      store.addMasterItem(data);
      setItems(store.getMasterList());
      showToast('New item added to Master List');
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this grocery item?')) {
      const updated = store.deleteMasterItem(id);
      setItems(updated);
      showToast('Item deleted');
    }
  }

  // ── Unit Management ──
  function handleAddUnit(e) {
    if (e) e.preventDefault();
    setUnitError('');
    if (!unitForm.symbol.trim()) {
      setUnitError('Unit symbol is required (e.g., pkt, dozen, tin)');
      return;
    }
    try {
      const created = store.addUnit({
        symbol: unitForm.symbol.trim(),
        name: unitForm.name.trim() || unitForm.symbol.trim()
      });
      const updatedUnits = store.getUnits();
      setUnits(updatedUnits);
      // Auto-select the newly added unit if item modal is open
      setForm(prev => ({ ...prev, unit: created.symbol }));
      setUnitForm({ symbol: '', name: '' });
      showToast(`✓ New unit "${created.symbol}" added!`);
    } catch (err) {
      setUnitError(err.message);
    }
  }

  function handleDeleteUnit(unit) {
    const isUsed = items.some(i => i.unit.toLowerCase() === unit.symbol.toLowerCase());
    if (isUsed) {
      alert(`Cannot delete "${unit.symbol}" because it is currently used by items in the Master List.`);
      return;
    }
    if (window.confirm(`Delete unit "${unit.symbol}"?`)) {
      const updated = store.deleteUnit(unit.id);
      setUnits(updated);
      showToast(`Unit "${unit.symbol}" removed`);
    }
  }

  const unitCounts = items.reduce((acc, item) => {
    acc[item.unit] = (acc[item.unit] || 0) + 1;
    return acc;
  }, {});

  // Common suggestion chips
  const SUGGESTIONS = [
    { symbol: 'pkt', name: 'Packet (pkt)' },
    { symbol: 'dozen', name: 'Dozen (12 pcs)' },
    { symbol: 'bundle', name: 'Bundle (bundle)' },
    { symbol: 'tin', name: 'Tin / Can (tin)' },
    { symbol: 'box', name: 'Box (box)' },
    { symbol: 'roll', name: 'Roll (roll)' },
    { symbol: 'cup', name: 'Cup (cup)' },
    { symbol: 'bottle', name: 'Bottle (bottle)' },
  ];

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
            <h1>Master List</h1>
            <p>All vegetables, groceries, and kitchen items with their units and pricing.</p>
          </div>
          <div className="flex gap-md">
            <button
              className="btn btn-secondary"
              onClick={() => setShowUnitModal(true)}
              title="Add or manage measurement units"
            >
              ⚖️ + Add Unit
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              + Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Unit & Item Stat Cards */}
      <div className="stat-grid animate-in-delayed">
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-change neutral">Inventory items</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Weight (Kg)</div>
          <div className="stat-value">{unitCounts['Kg'] || 0}</div>
          <div className="stat-change positive">Bulk groceries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Volume (L)</div>
          <div className="stat-value">{unitCounts['L'] || 0}</div>
          <div className="stat-change positive">Oils & liquids</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Grams (gm)</div>
          <div className="stat-value">{unitCounts['gm'] || 0}</div>
          <div className="stat-change positive">Spices & masalas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Pieces (pcs)</div>
          <div className="stat-value">{unitCounts['pcs'] || 0}</div>
          <div className="stat-change neutral">Unit counted</div>
        </div>
      </div>

      {/* Main Items Table Card */}
      <div className="card animate-in-delayed">
        <div className="card-header">
          <div className="flex items-center gap-md">
            <h2>All Items</h2>
            <span className="badge badge-neutral">{filteredItems.length}</span>
          </div>
          <div className="flex items-center gap-md">
            <input
              type="text"
              className="form-input"
              placeholder="Search items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: 220 }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setShowUnitModal(true)}
              title="Add or manage units"
            >
              ⚖️ + Add Unit
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              + Add Item
            </button>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Item Name</th>
                <th>Unit</th>
                <th className="text-right">Price / Unit (₹)</th>
                <th className="text-center" style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3>No items found</h3>
                      <p>Add your first grocery item to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                        {item.unit}
                      </span>
                    </td>
                    <td className="text-right font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      ₹{item.pricePerUnit}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Item Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-lg">
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Potato, Tomato, Rice, Bread Loaf..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <div className="flex items-center justify-between mb-xs">
                      <label className="form-label" style={{ margin: 0 }}>Unit</label>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowUnitModal(true)}
                        style={{ fontSize: 11, padding: '2px 6px', color: 'var(--accent)', fontWeight: 600 }}
                        title="Add a new custom unit"
                      >
                        + New Unit
                      </button>
                    </div>
                    <select
                      className="form-select"
                      value={form.unit}
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                    >
                      {units.map(u => (
                        <option key={u.id || u.symbol} value={u.symbol}>
                          {u.symbol} {u.name && u.name !== u.symbol ? `— ${u.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price per Unit (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      value={form.pricePerUnit}
                      onChange={e => setForm({ ...form, pricePerUnit: e.target.value })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingItem ? 'Update' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Manage Units Modal ── */}
      {showUnitModal && (
        <div className="modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="flex items-center gap-sm">
                <span style={{ fontSize: 22 }}>⚖️</span>
                <h3>Add & Manage Measurement Units</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUnitModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Add Unit Form */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 20
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Create New Unit
                </div>

                {unitError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'var(--danger-subtle)',
                      border: '1px solid var(--danger-border)',
                      color: 'var(--danger)',
                      fontSize: 12,
                      borderRadius: 6,
                      marginBottom: 10
                    }}
                  >
                    {unitError}
                  </div>
                )}

                <div className="form-row mb-md">
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>
                      Unit Symbol / Code <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. pkt, dozen, tin, box"
                      value={unitForm.symbol}
                      onChange={e => {
                        setUnitForm({ ...unitForm, symbol: e.target.value });
                        setUnitError('');
                      }}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 12 }}>
                      Full Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Packet (pkt), Dozen"
                      value={unitForm.name}
                      onChange={e => setUnitForm({ ...unitForm, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Quick suggestions */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    Quick suggestions:
                  </div>
                  <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                    {SUGGESTIONS.map(s => {
                      const alreadyExists = units.some(u => u.symbol.toLowerCase() === s.symbol.toLowerCase());
                      if (alreadyExists) return null;
                      return (
                        <button
                          key={s.symbol}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setUnitForm({ symbol: s.symbol, name: s.name });
                            setUnitError('');
                          }}
                          style={{ fontSize: 11, padding: '2px 8px' }}
                        >
                          + {s.symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddUnit}
                    disabled={!unitForm.symbol.trim()}
                  >
                    + Save Unit
                  </button>
                </div>
              </div>

              {/* Existing Units List */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Registered Units ({units.length})
                </div>

                <div className="flex flex-col gap-sm" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {units.map(u => {
                    const count = unitCounts[u.symbol] || 0;
                    return (
                      <div
                        key={u.id || u.symbol}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div className="flex items-center gap-md">
                          <span
                            className="badge badge-accent"
                            style={{ fontSize: 12, fontWeight: 700, minWidth: 42, justifyContent: 'center' }}
                          >
                            {u.symbol}
                          </span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {u.name || u.symbol}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {count} {count === 1 ? 'item' : 'items'} in Master List
                            </div>
                          </div>
                        </div>

                        <div>
                          {u.isDefault ? (
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                              System Standard
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDeleteUnit(u)}
                              style={{ color: count > 0 ? 'var(--text-muted)' : 'var(--danger)', fontSize: 12 }}
                              disabled={count > 0}
                              title={count > 0 ? 'Unit cannot be deleted while in use' : 'Delete unit'}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUnitModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
