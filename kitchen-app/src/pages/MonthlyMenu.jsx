import { useState, useMemo } from 'react';
import { store, getYearMonth } from '../store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MonthlyMenu() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [menuForm, setMenuForm] = useState({
    breakfast: [{ dish: '', serving: '' }],
    lunch: [{ dish: '', serving: '' }],
    dinner: [{ dish: '', serving: '' }],
  });

  const recipes = store.getRecipes();
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
      [mealType]: [...prev[mealType], { dish: '', serving: '' }]
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
        }));
      }
    });
    const updatedMenu = { ...menu, [selectedDay]: cleanMenu };
    store.saveMonthlyMenu(ym, updatedMenu);
    setMenu(updatedMenu);
    setShowModal(false);
  }

  const today = new Date();
  const isToday = (day) =>
    day.currentMonth &&
    day.day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1>Monthly Menu</h1>
        <p>Plan Breakfast, Lunch, and Dinner for every day. Set per-person serving amounts for each dish.</p>
      </div>

      {/* Month Navigation */}
      <div className="card animate-in-delayed" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <button className="btn btn-ghost" onClick={() => changeMonth(-1)}>← Prev</button>
          <h2>{MONTHS[month]} {year}</h2>
          <button className="btn btn-ghost" onClick={() => changeMonth(1)}>Next →</button>
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
                            recipes.find(r => r.name === dish.dish)?.yieldUnit === 'pcs'
                              ? 'serving (pcs)'
                              : 'serving (ml)'
                          }
                          value={dish.serving}
                          onChange={e => updateDish(mealType, idx, 'serving', e.target.value)}
                          min="0"
                        />
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
    </div>
  );
}
