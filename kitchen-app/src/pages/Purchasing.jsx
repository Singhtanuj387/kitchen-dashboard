import { useMemo, useState } from 'react';
import { store, formatNumber } from '../store';

const CATEGORIES = ['Grocery', 'Vegetable', 'Fruits', 'Dairy'];
const MODES = ['Ad-hoc / Petty', 'Scheduled / Bulk'];
const UNITS = ['Kg', 'gm', 'L', 'ml', 'pcs', 'packet', 'crate', 'box'];

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  mode: MODES[0],
  category: CATEGORIES[0],
  item: '',
  quantity: '',
  unit: 'Kg',
  amount: '',
  supplier: '',
  notes: '',
});

function LedgerTabs({ active }) {
  return (
    <div className="tabs no-print">
      <a className={`tab ${active === 'purchasing' ? 'active' : ''}`} href="#/purchasing">Purchasing</a>
      <a className={`tab ${active === 'expenses' ? 'active' : ''}`} href="#/expenses">Expenses</a>
    </div>
  );
}

export function Purchasing() {
  const [records, setRecords] = useState(() => store.getPurchases());
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => records.filter(record =>
    !filterMonth || record.date.startsWith(filterMonth)
  ), [records, filterMonth]);
  const total = filtered.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);

  function saveRecord(event) {
    event.preventDefault();
    if (!form.date || !form.item.trim() || !form.amount) return;
    const payload = { ...form, item: form.item.trim(), amount: Number(form.amount), quantity: Number(form.quantity) || 0 };
    if (editingId) store.updatePurchase(editingId, payload);
    else store.addPurchase(payload);
    setRecords(store.getPurchases());
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  }

  function editRecord(record) {
    setForm({ ...record, amount: String(record.amount ?? ''), quantity: String(record.quantity ?? '') });
    setEditingId(record.id);
    setShowForm(true);
  }

  function removeRecord(id) {
    if (!window.confirm('Delete this purchase record?')) return;
    setRecords(store.deletePurchase(id));
  }

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="flex items-center justify-between" style={{ gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
          <div>
            <h1>Purchasing</h1>
            <p>Record daily ad-hoc purchases and scheduled bulk buying for kitchen supplies.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(value => !value)}>
            {showForm ? 'Close Form' : '+ Add Purchase'}
          </button>
        </div>
      </div>
      <LedgerTabs active="purchasing" />

      <div className="stat-grid animate-in-delayed">
        <div className="stat-card"><div className="stat-label">Purchase Records</div><div className="stat-value">{filtered.length}</div></div>
        <div className="stat-card"><div className="stat-label">Purchase Spend</div><div className="stat-value text-accent">₹{formatNumber(total, 0)}</div><div className="stat-change neutral">{filterMonth || 'All months'}</div></div>
        <div className="stat-card"><div className="stat-label">Bulk Records</div><div className="stat-value">{filtered.filter(item => item.mode === 'Scheduled / Bulk').length}</div></div>
        <div className="stat-card"><div className="stat-label">Ad-hoc Records</div><div className="stat-value">{filtered.filter(item => item.mode === 'Ad-hoc / Petty').length}</div></div>
      </div>

      {showForm && (
        <form className="card purchasing-form animate-in" onSubmit={saveRecord}>
          <div className="card-header"><h2>{editingId ? 'Edit Purchase' : 'New Purchase'}</h2><span className="form-hint">All four purchase categories are available.</span></div>
          <div className="card-body purchasing-form-grid">
            <label className="form-group"><span className="form-label">Date</span><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Purchase Type</span><select className="form-select" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>{MODES.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="form-group"><span className="form-label">Category</span><select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="form-group"><span className="form-label">Item</span><input className="form-input" placeholder="e.g. Tomato, milk, rice" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Quantity</span><div className="flex gap-sm"><input className="form-input" type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /><select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{UNITS.map(item => <option key={item}>{item}</option>)}</select></div></label>
            <label className="form-group"><span className="form-label">Amount (₹)</span><input className="form-input" type="number" min="0" step="any" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Supplier</span><input className="form-input" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></label>
            <label className="form-group"><span className="form-label">Notes</span><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }}>Cancel</button><button className="btn btn-primary">{editingId ? 'Update Purchase' : 'Save Purchase'}</button></div>
        </form>
      )}

      <div className="card animate-in-delayed">
        <div className="card-header"><h2>Purchase Register</h2><input className="form-input" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 170 }} /></div>
        <div className="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Item</th><th className="text-right">Quantity</th><th className="text-right">Debit</th><th>Supplier</th><th></th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={8} className="empty-state-cell">No purchase records for this period.</td></tr> : filtered.map(record => <tr key={record.id}><td>{record.date}</td><td><span className="badge badge-neutral">{record.mode}</span></td><td>{record.category}</td><td><strong>{record.item}</strong>{record.notes && <div className="table-note">{record.notes}</div>}</td><td className="text-right">{record.quantity || '-'} {record.unit}</td><td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(record.amount, 2)}</td><td>{record.supplier || '-'}</td><td><div className="flex gap-xs"><button className="btn btn-ghost btn-sm" onClick={() => editRecord(record)}>Edit</button><button className="btn btn-ghost btn-sm" onClick={() => removeRecord(record.id)} aria-label={`Delete ${record.item}`}>Delete</button></div></td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}

export function Expenses() {
  const [records, setRecords] = useState(() => store.getExpenses());
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Bulk - Grocery', particulars: '', debit: '' });
  const [filterMonth, setFilterMonth] = useState('');
  const filtered = useMemo(() => records.filter(record => !filterMonth || record.date.startsWith(filterMonth)), [records, filterMonth]);
  const total = filtered.reduce((sum, record) => sum + (Number(record.debit) || 0), 0);
  const expenseTypes = ['Bulk - Grocery', 'Petty - Vegetable', 'Petty - Fruits', 'Petty - Dairy', 'Fruits', 'Dairy', 'Salaries', 'Gas Cylinders'];

  function saveExpense(event) {
    event.preventDefault();
    if (!form.date || !form.particulars.trim() || !form.debit) return;
    store.addExpense({ ...form, particulars: form.particulars.trim(), debit: Number(form.debit) });
    setRecords(store.getExpenses());
    setForm({ date: new Date().toISOString().split('T')[0], type: 'Bulk - Grocery', particulars: '', debit: '' });
  }

  return (
    <div className="page-container">
      <div className="page-header animate-in"><div className="flex items-center justify-between" style={{ gap: 'var(--space-lg)', flexWrap: 'wrap' }}><div><h1>Expenses</h1><p>Track purchasing, salaries, gas cylinders, and other kitchen debits in one register.</p></div></div></div>
      <LedgerTabs active="expenses" />
      <div className="stat-grid animate-in-delayed"><div className="stat-card"><div className="stat-label">Expense Entries</div><div className="stat-value">{filtered.length}</div></div><div className="stat-card"><div className="stat-label">Total Debit</div><div className="stat-value text-accent">₹{formatNumber(total, 0)}</div><div className="stat-change neutral">{filterMonth || 'All months'}</div></div></div>
      <form className="card expense-entry-form animate-in-delayed" onSubmit={saveExpense}><div className="card-header"><h2>Add Expense</h2><input className="form-input" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 170 }} /></div><div className="card-body expense-entry-grid"><label className="form-group"><span className="form-label">Date</span><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label><label className="form-group"><span className="form-label">Type</span><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{expenseTypes.map(item => <option key={item}>{item}</option>)}</select></label><label className="form-group expense-particulars"><span className="form-label">Particulars</span><input className="form-input" required placeholder="e.g. Monthly grocery purchasing - Sept" value={form.particulars} onChange={e => setForm({ ...form, particulars: e.target.value })} /></label><label className="form-group"><span className="form-label">Debit (₹)</span><input className="form-input" type="number" min="0" step="any" required value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value })} /></label><button className="btn btn-primary expense-save-btn">Add Entry</button></div></form>
      <div className="card animate-in-delayed"><div className="card-header"><h2>Expense Register</h2></div><div className="table-container"><table><thead><tr><th>Date</th><th>Type</th><th>Particulars</th><th className="text-right">Debit</th><th></th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={5} className="empty-state-cell">No expenses for this period.</td></tr> : filtered.map(record => <tr key={record.id}><td>{record.date}</td><td><span className="badge badge-neutral">{record.type}</span></td><td>{record.particulars}</td><td className="text-right" style={{ fontWeight: 700 }}>₹{formatNumber(record.debit, 2)}</td><td><button className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm('Delete this expense entry?')) setRecords(store.deleteExpense(record.id)); }}>Delete</button></td></tr>)}</tbody></table></div></div>
    </div>
  );
}
