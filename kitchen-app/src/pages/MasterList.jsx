import { useState } from 'react';
import { store } from '../store';

export default function MasterList() {
  const [items, setItems] = useState(() => store.getMasterList());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', unit: 'Kg', pricePerUnit: '' });

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function openAdd() {
    setEditingItem(null);
    setForm({ name: '', unit: 'Kg', pricePerUnit: '' });
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
    } else {
      store.addMasterItem(data);
      setItems(store.getMasterList());
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    const updated = store.deleteMasterItem(id);
    setItems(updated);
  }

  const unitCounts = items.reduce((acc, item) => {
    acc[item.unit] = (acc[item.unit] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1>Master List</h1>
        <p>All vegetables, groceries, and kitchen items with their units and pricing.</p>
      </div>

      <div className="stat-grid animate-in-delayed">
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Weight (Kg)</div>
          <div className="stat-value">{unitCounts['Kg'] || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Volume (L)</div>
          <div className="stat-value">{unitCounts['L'] || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Grams (gm)</div>
          <div className="stat-value">{unitCounts['gm'] || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">By Pieces (pcs)</div>
          <div className="stat-value">{unitCounts['pcs'] || 0}</div>
        </div>
      </div>

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
                      <span className="badge badge-neutral">{item.unit}</span>
                    </td>
                    <td className="text-right font-mono" style={{ color: 'var(--accent)' }}>
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
                    placeholder="e.g., Potato, Tomato, Rice..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-select"
                      value={form.unit}
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                    >
                      <option value="Kg">Kg (Kilogram)</option>
                      <option value="L">L (Litre)</option>
                      <option value="gm">gm (Gram)</option>
                      <option value="pcs">pcs (Pieces)</option>
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
    </div>
  );
}
