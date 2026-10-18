import { useState, useMemo } from 'react';
import { store, getYearMonth, getRecipeServingUnit } from '../store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthlyMenu() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showCopyMonthModal, setShowCopyMonthModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [copyMonthTarget, setCopyMonthTarget] = useState('');
  const [copyDayTarget, setCopyDayTarget] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [menuForm, setMenuForm] = useState({
    breakfast: [{ dish: '', serving: '' }],
    lunch: [{ dish: '', serving: '' }],
    dinner: [{ dish: '', serving: '' }],
  });

  const recipes = store.getRecipes();
  const departments = store.getDepartments();
  const yearMonth = getYearMonth(currentDate);
  const [menu, setMenu] = useState(() => store.getMonthlyMenu(yearMonth));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, currentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false });
    }
    return days;
  }, [year, month]);

  function changeMonth(offset) {
    const newDate = new Date(year, month + offset, 1);
    setCurrentDate(newDate);
    const ym = getYearMonth(newDate);
    setMenu(store.getMonthlyMenu(ym));
  }

  function openDayMenu(day) {
    if (!day.currentMonth) return;
    setSelectedDay(day.day);
    const dayMenu = menu[day.day] || {};
    setMenuForm({
      breakfast: dayMenu.breakfast?.length ? dayMenu.breakfast : [{ dish: '', serving: '' }],
      lunch: dayMenu.lunch?.length ? dayMenu.lunch : [{ dish: '', serving: '' }],
      dinner: dayMenu.dinner?.length ? dayMenu.dinner : [{ dish: '', serving: '' }],
    });
    setShowModal(true);
  }

  function addDish(mealType) {
    setMenuForm(prev => ({
      ...prev,
      [mealType]: [...prev[mealType], { dish: '', serving: '', departments: [] }]
    }));
  }

  function removeDish(mealType, idx) {
    setMenuForm(prev => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== idx)
    }));
  }

  function updateDish(mealType, idx, field, value) {
    setMenuForm(prev => ({
      ...prev,
      [mealType]: prev[mealType].map((d, i) => i === idx ? { ...d, [field]: value } : d)
    }));
  }

  function saveMenu() {
    const ym = getYearMonth(currentDate);
    const cleanMenu = {};
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      const dishes = menuForm[meal].filter(d => d.dish.trim());
      if (dishes.length > 0) {
        cleanMenu[meal] = dishes.map(d => ({
          dish: d.dish.trim(),
          serving: parseFloat(d.serving) || 0, // ml per person
          departments: Array.isArray(d.departments) ? d.departments : [],
        }));
      }
    });
    const updatedMenu = { ...menu, [selectedDay]: cleanMenu };
    store.saveMonthlyMenu(ym, updatedMenu);
    setMenu(updatedMenu);
    setShowModal(false);
  }

  function cloneMenu(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function openCopyMonth() {
    setCopyMonthTarget(`${year}-${String(month + 1).padStart(2, '0')}`);
    setShowCopyMonthModal(true);
  }

  function copyMonth() {
    if (!copyMonthTarget || copyMonthTarget === yearMonth) return;
    const targetLabel = new Date(`${copyMonthTarget}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
    if (!window.confirm(`Replace the menu for ${targetLabel} with a copy of ${MONTHS[month]} ${year}?`)) return;
    store.saveMonthlyMenu(copyMonthTarget, cloneMenu(menu));
    setShowCopyMonthModal(false);
    showToast(`Menu copied to ${targetLabel}`);
  }

  function copyDay() {
    if (!selectedDay || !copyDayTarget) return;
    const sourceMenu = menu[selectedDay] || {};
    const sourceDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    if (copyDayTarget === sourceDate) return;
    const targetDate = new Date(`${copyDayTarget}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return;
    const targetYearMonth = getYearMonth(targetDate);
    const targetDay = targetDate.getDate();
    const targetMenu = store.getMonthlyMenu(targetYearMonth);
    const targetLabel = targetDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!window.confirm(`Replace the menu for ${targetLabel} with this day's menu?`)) return;
    const updatedTargetMenu = { ...targetMenu, [targetDay]: cloneMenu(sourceMenu) };
    store.saveMonthlyMenu(targetYearMonth, updatedTargetMenu);
    if (targetYearMonth === yearMonth) setMenu(updatedTargetMenu);
    setShowModal(false);
    showToast(`Day menu copied to ${targetLabel}`);
  }

  const today = new Date();
  const isToday = (day) =>
    day.currentMonth &&
    day.day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="page-container">
      {toastMessage && <div className="toast-notification animate-in"><span>✓</span> {toastMessage}</div>}
      <div className="page-header animate-in">
        <h1>Monthly Menu</h1>
        <p>Plan Breakfast, Lunch, and Dinner for every day. Set per-person serving amounts for each dish.</p>
      </div>

      {/* Month Navigation */}
      <div className="card animate-in-delayed" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <button className="btn btn-ghost" onClick={() => changeMonth(-1)}>← Prev</button>
          <h2>{MONTHS[month]} {year}</h2>
          <div className="flex items-center gap-sm">
            <button className="btn btn-secondary btn-sm" onClick={openCopyMonth}>Copy Month</button>
            <button className="btn btn-ghost" onClick={() => changeMonth(1)}>Next →</button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="calendar-grid">
            {DAYS.map(day => (
              <div key={day} className="calendar-header-cell">{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayMenu = day.currentMonth ? menu[day.day] : null;
              return (
                <div
                  key={idx}
                  className={`calendar-cell ${!day.currentMonth ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}
                  onClick={() => openDayMenu(day)}
                >
                  <div className="calendar-date">{day.day}</div>
                  {dayMenu && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayMenu.breakfast?.map((d, i) => (
                        <span key={`b${i}`} className="meal-tag breakfast">{d.dish}</span>
                      ))}
                      {dayMenu.lunch?.map((d, i) => (
                        <span key={`l${i}`} className="meal-tag lunch">{d.dish}</span>
                      ))}
                      {dayMenu.dinner?.map((d, i) => (
                        <span key={`d${i}`} className="meal-tag dinner">{d.dish}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-xl" style={{ justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
        <div className="flex items-center gap-sm">
          <span className="meal-tag breakfast" style={{ fontSize: 11 }}>Breakfast</span>
        </div>
        <div className="flex items-center gap-sm">
          <span className="meal-tag lunch" style={{ fontSize: 11 }}>Lunch</span>
        </div>
        <div className="flex items-center gap-sm">
          <span className="meal-tag dinner" style={{ fontSize: 11 }}>Dinner</span>
        </div>
      </div>

      {/* Edit Day Menu Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{MONTHS[month]} {selectedDay}, {year} Menu</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="copy-day-panel">
                <div>
                  <div className="form-label" style={{ marginBottom: 2 }}>Reuse this day&apos;s menu</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Copy breakfast, lunch, and dinner to another date.</div>
                </div>
                <div className="flex items-end gap-sm">
                  <input
                    type="date"
                    className="form-input"
                    value={copyDayTarget}
                    onChange={e => setCopyDayTarget(e.target.value)}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={copyDay} disabled={!copyDayTarget}>
                    Copy Day
                  </button>
                </div>
              </div>
              {['breakfast', 'lunch', 'dinner'].map(mealType => (
                <div key={mealType} style={{ marginBottom: 'var(--space-xl)' }}>
                  <div className="flex items-center justify-between mb-lg">
                    <div className="flex items-center gap-sm">
                      <span className={`meal-tag ${mealType}`} style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                        {mealType}
                      </span>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => addDish(mealType)}>+ Add Dish</button>
                  </div>
                  {menuForm[mealType].map((dish, idx) => (
                    <div key={idx} className="flex items-center gap-md mb-lg">
                      <div className="form-group" style={{ flex: 2, margin: 0 }}>
                        <select
                          className="form-select"
                          value={dish.dish}
                          onChange={e => updateDish(mealType, idx, 'dish', e.target.value)}
                        >
                          <option value="">Select recipe...</option>
                          {recipes.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={
                            getRecipeServingUnit(recipes.find(r => r.name === dish.dish)) === 'pieces'
                              ? 'serving (pcs)'
                              : 'serving (ml)'
                          }
                          value={dish.serving}
                          onChange={e => updateDish(mealType, idx, 'serving', e.target.value)}
                          min="0"
                        />
                      </div>
                      <div className="dish-department-picker">
                        <span className="form-hint">Served to</span>
                        <div className="dish-department-options">
                          {departments.map(dept => (
                            <label key={dept.id} className="dish-department-option">
                              <input
                                type="checkbox"
                                checked={(dish.departments || []).includes(dept.id)}
                                onChange={e => {
                                  const nextDepartments = e.target.checked
                                    ? [...(dish.departments || []), dept.id]
                                    : (dish.departments || []).filter(id => id !== dept.id);
                                  updateDish(mealType, idx, 'departments', nextDepartments);
                                }}
                              />
                              {dept.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeDish(mealType, idx)}>✕</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMenu}>Save Menu</button>
            </div>
          </div>
        </div>
      )}

      {showCopyMonthModal && (
        <div className="modal-overlay" onClick={() => setShowCopyMonthModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Copy {MONTHS[month]} {year}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCopyMonthModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                Copy every scheduled day and meal from this month into another month.
              </p>
              <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                <label className="form-label">Destination month</label>
                <input
                  type="month"
                  className="form-input"
                  value={copyMonthTarget}
                  onChange={e => setCopyMonthTarget(e.target.value)}
                />
              </div>
              <div className="copy-warning">
                Existing menu data in the destination month will be replaced.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCopyMonthModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={copyMonth} disabled={!copyMonthTarget || copyMonthTarget === yearMonth}>
                Copy Month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
