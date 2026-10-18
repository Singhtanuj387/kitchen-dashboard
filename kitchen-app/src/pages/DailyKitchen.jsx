import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { store, getYearMonth, getDateString, calculateRequiredQty, formatNumber, findMasterItem, getRecipeServingUnit, calculateIngredientCost, getRecipeProcedureSteps } from '../store';
import { exportDayToExcel } from '../utils/excelExport';

export default function DailyKitchen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlDate = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(() => urlDate || getDateString(new Date()));
  const [deptCounts, setDeptCounts] = useState(() => {
    const depts = store.getDepartments();
    const counts = {};
    depts.forEach(d => { counts[d.id] = d.defaultCount; });
    return counts;
  });
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(() => store.getDepartments()[0]?.id || '');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedRecipes, setExpandedRecipes] = useState({});
  const [ingredientOverrides, setIngredientOverrides] = useState({});
  const [realIngredientQuantities, setRealIngredientQuantities] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
    }
  }, [urlDate]);

  // Generate Next Day Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateDate, setGenerateDate] = useState('');
  const [generateCounts, setGenerateCounts] = useState({});
  const [selectedGenerateDepartmentId, setSelectedGenerateDepartmentId] = useState('');

  const departments = store.getDepartments();
  const recipes = store.getRecipes();
  const masterList = store.getMasterList();
  const costMultiplier = store.getCostSettings().multiplier;
  const selectedDepartment = departments.find(dept => dept.id === selectedDepartmentId) || departments[0];
  const selectedGenerateDepartment = departments.find(dept => dept.id === selectedGenerateDepartmentId) || departments[0];

  // Load saved counts if available when selectedDate changes
  useEffect(() => {
    const saved = store.getDailyKitchen(selectedDate);
    if (saved && saved.departments && saved.departments.length > 0) {
      const counts = {};
      saved.departments.forEach(d => { counts[d.id] = d.count; });
      setDeptCounts(counts);
    }
    setIngredientOverrides(saved?.ingredientOverrides || {});
    setRealIngredientQuantities(saved?.realIngredientQuantities || {});
  }, [selectedDate]);

  // Get the menu for selected date
  const dateObj = new Date(selectedDate);
  const yearMonth = getYearMonth(dateObj);
  const dayMenu = store.getMonthlyMenu(yearMonth)[dateObj.getDate()] || {};

  // Total people & breakdown
  const totalPeople = useMemo(() => {
    return Object.values(deptCounts).reduce((sum, c) => sum + (parseInt(c, 10) || 0), 0);
  }, [deptCounts]);

  const chargeablePeople = useMemo(() => {
    return departments
      .filter(d => d.isChargeable !== false)
      .reduce((sum, d) => sum + (parseInt(deptCounts[d.id], 10) || 0), 0);
  }, [departments, deptCounts]);

  const nonChargeablePeople = useMemo(() => {
    return departments
      .filter(d => d.isChargeable === false)
      .reduce((sum, d) => sum + (parseInt(deptCounts[d.id], 10) || 0), 0);
  }, [departments, deptCounts]);

  // Generate Target Calculations
  const generateTargetDateObj = new Date(generateDate || selectedDate);
  const generateYearMonth = getYearMonth(generateTargetDateObj);
  const generateDayMenu = store.getMonthlyMenu(generateYearMonth)[generateTargetDateObj.getDate()] || {};

  const generateTotalPeople = useMemo(() => {
    return Object.values(generateCounts).reduce((sum, c) => sum + (parseInt(c, 10) || 0), 0);
  }, [generateCounts]);

  const generateChargeablePeople = useMemo(() => {
    return departments
      .filter(d => d.isChargeable !== false)
      .reduce((sum, d) => sum + (parseInt(generateCounts[d.id], 10) || 0), 0);
  }, [departments, generateCounts]);

  const generateNonChargeablePeople = useMemo(() => {
    return departments
      .filter(d => d.isChargeable === false)
      .reduce((sum, d) => sum + (parseInt(generateCounts[d.id], 10) || 0), 0);
  }, [departments, generateCounts]);

  const generateDateFormatted = generateTargetDateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  function openGenerateModal() {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const nextDateStr = getDateString(next);
    setGenerateDate(nextDateStr);

    const saved = store.getDailyKitchen(nextDateStr);
    const initialCounts = {};
    departments.forEach(d => {
      if (saved && saved.departments && saved.departments.length > 0) {
        const found = saved.departments.find(item => item.id === d.id);
        initialCounts[d.id] = found ? found.count : d.defaultCount;
      } else {
        initialCounts[d.id] = deptCounts[d.id] ?? d.defaultCount;
      }
    });
    setGenerateCounts(initialCounts);
    setSelectedGenerateDepartmentId(prev => departments.some(d => d.id === prev) ? prev : (departments[0]?.id || ''));
    setShowGenerateModal(true);
  }

  // Helper to build a comprehensive history snapshot for any date
  function getDishHeadcount(dishItem, countsMap, fallbackTotal) {
    if (!Array.isArray(dishItem?.departments) || dishItem.departments.length === 0) return fallbackTotal;
    return dishItem.departments.reduce((sum, departmentId) => sum + (parseInt(countsMap[departmentId], 10) || 0), 0);
  }

  function buildDaySnapshot(dateStr, countsMap, totalCount, chargeableCount, nonChargeableCount, menuObj, overrides = {}, realQuantities = {}) {
    const dObj = new Date(dateStr + 'T00:00:00');
    const dFormatted = dObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const mealsObj = { breakfast: [], lunch: [], dinner: [] };
    let dayTotalCost = 0;

    ['breakfast', 'lunch', 'dinner'].forEach(m => {
      const list = menuObj[m] || [];
      mealsObj[m] = list.map((item, dishIdx) => {
        const rec = recipes.find(r => r.name.trim().toLowerCase() === item.dish.trim().toLowerCase());
        if (!rec) {
          return {
            dish: item.dish,
            serving: item.serving || 0,
            servingUnit: 'ml',
            requiredYield: 0,
            yieldUnit: 'L',
            totalCost: 0,
            adjustedCost: 0,
            ingredients: [],
            cookingSteps: [],
          };
        }

        const isPieces = getRecipeServingUnit(rec) === 'pieces';
        const servingAmount = item.serving || 0;
        const dishHeadcount = getDishHeadcount(item, countsMap, totalCount);
        const requiredYield = isPieces
          ? Math.round(dishHeadcount * servingAmount)
          : Math.round((dishHeadcount * servingAmount) / 1000);

        const ingredients = rec.ingredients.map((ing, ingredientIdx) => {
          const calculatedQty = calculateRequiredQty(ing.standardQty, requiredYield, rec.standardYield);
          const overrideValue = overrides[getIngredientOverrideKey(m, dishIdx, ingredientIdx)];
          const parsedOverride = Number(overrideValue);
          const finalQty = overrideValue === undefined || overrideValue === '' || !Number.isFinite(parsedOverride)
            ? calculatedQty
            : parsedOverride;
          const realValue = realQuantities[getIngredientOverrideKey(m, dishIdx, ingredientIdx)];
          const parsedRealValue = Number(realValue);
          const master = findMasterItem(ing.name, masterList);
          const rate = master ? master.pricePerUnit : 0;
          const amount = calculateIngredientCost(finalQty, rate, ing.unit, master?.unit);
          return {
            name: ing.name,
            standardQty: ing.standardQty,
            calculatedQty,
            requiredQty: finalQty,
            finalQty,
            realQty: realValue === undefined || realValue === '' || !Number.isFinite(parsedRealValue) ? '' : parsedRealValue,
            unit: ing.unit,
            rate,
            amount,
            cookingProcess: ing.cookingProcess || '',
          };
        });

        const dishCost = ingredients.reduce((sum, ing) => sum + ing.amount, 0);
        const adjustedCost = dishCost * costMultiplier;
        dayTotalCost += dishCost;

        return {
          dish: item.dish,
          serving: item.serving,
          departments: item.departments || [],
          dishHeadcount,
          calculatedYield: requiredYield,
          servingUnit: isPieces ? 'pcs' : 'ml',
          requiredYield,
          yieldUnit: rec.yieldUnit || 'L',
          totalCost: dishCost,
          adjustedCost,
          ingredients,
          cookingSteps: getRecipeProcedureSteps(rec),
        };
      });
    });

    return {
      id: `hist_${dateStr.replace(/-/g, '')}`,
      date: dateStr,
      dateFormatted: dFormatted,
      generatedAt: new Date().toISOString(),
      totalPeople: totalCount,
      chargeablePeople: chargeableCount,
      nonChargeablePeople: nonChargeableCount,
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        count: parseInt(countsMap[d.id], 10) || 0,
        isChargeable: d.isChargeable !== false,
      })),
      totalCost: dayTotalCost,
      adjustedCost: dayTotalCost * costMultiplier,
      costMultiplier,
      meals: mealsObj,
    };
  }

  function handleConfirmGenerate() {
    store.saveDailyKitchen(generateDate, {
      date: generateDate,
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        count: parseInt(generateCounts[d.id], 10) || 0
      })),
      totalPeople: generateTotalPeople,
      menu: generateDayMenu,
      ingredientOverrides: {},
      realIngredientQuantities: {},
    });

    // Archive snapshot into Recipe History
    const historySnapshot = buildDaySnapshot(
      generateDate,
      generateCounts,
      generateTotalPeople,
      generateChargeablePeople,
      generateNonChargeablePeople,
      generateDayMenu
    );
    store.addRecipeHistory(historySnapshot);

    setSelectedDate(generateDate);
    setDeptCounts(generateCounts);
    setShowGenerateModal(false);
    setToastMessage(`✨ Recipes generated & saved to History for ${generateDateFormatted}!`);
    setTimeout(() => setToastMessage(''), 3500);
  }

  function getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx) {
    return `${mealKey}-${dishIdx}-${ingredientIdx}`;
  }

  function persistDailyKitchen(overrides = ingredientOverrides) {
    store.saveDailyKitchen(selectedDate, {
      date: selectedDate,
      departments: departments.map(d => ({ id: d.id, name: d.name, count: parseInt(deptCounts[d.id], 10) || 0 })),
      totalPeople,
      menu: dayMenu,
      ingredientOverrides: overrides,
      realIngredientQuantities,
    });
  }

  function handleIngredientQuantityChange(mealKey, dishIdx, ingredientIdx, value) {
    const key = getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx);
    setIngredientOverrides(prev => ({ ...prev, [key]: value }));
  }

  function saveIngredientQuantityOverride() {
    persistDailyKitchen();
  }

  function resetIngredientQuantity(mealKey, dishIdx, ingredientIdx) {
    const key = getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx);
    const nextOverrides = { ...ingredientOverrides };
    delete nextOverrides[key];
    setIngredientOverrides(nextOverrides);
    persistDailyKitchen(nextOverrides);
  }

  function handleRealIngredientQuantityChange(mealKey, dishIdx, ingredientIdx, value) {
    const key = getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx);
    const nextValues = { ...realIngredientQuantities, [key]: value };
    setRealIngredientQuantities(nextValues);
    store.saveDailyKitchen(selectedDate, {
      date: selectedDate,
      departments: departments.map(d => ({ id: d.id, name: d.name, count: parseInt(deptCounts[d.id], 10) || 0 })),
      totalPeople,
      menu: dayMenu,
      ingredientOverrides,
      realIngredientQuantities: nextValues,
    });
  }

  // Calculate full recipe details for a dish
  function calculateDishDetails(dishItem, mealKey, dishIdx) {
    const recipe = recipes.find(r => r.name.trim().toLowerCase() === dishItem.dish.trim().toLowerCase());
    if (!recipe) return null;

    // serving is in ml per person (or pcs per person for items like rotis/samosas/bananas)
    const servingAmount = dishItem.serving || 0;
    const dishHeadcount = getDishHeadcount(dishItem, deptCounts, totalPeople);
    const isPieces = getRecipeServingUnit(recipe) === 'pieces';
    const totalYield = isPieces
      ? Math.round(dishHeadcount * servingAmount)
      : Math.round((dishHeadcount * servingAmount) / 1000);
    const requiredYield = totalYield;

    const ingredients = recipe.ingredients.map((ing, ingredientIdx) => {
      const calculatedQty = calculateRequiredQty(ing.standardQty, requiredYield, recipe.standardYield);
      const overrideValue = ingredientOverrides[getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx)];
      const parsedOverride = Number(overrideValue);
      const finalQty = overrideValue === undefined || overrideValue === '' || !Number.isFinite(parsedOverride)
        ? calculatedQty
        : parsedOverride;
      const realValue = realIngredientQuantities[getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx)];
      const parsedRealValue = Number(realValue);
      const master = findMasterItem(ing.name, masterList);
      const rate = master ? master.pricePerUnit : 0;
      const amount = calculateIngredientCost(finalQty, rate, ing.unit, master?.unit);
      return {
        ...ing,
        calculatedQty,
        requiredQty: finalQty,
        finalQty,
        realQty: realValue === undefined || realValue === '' || !Number.isFinite(parsedRealValue) ? '' : parsedRealValue,
        rate,
        amount,
      };
    });

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.amount, 0);
    const adjustedCost = totalCost * costMultiplier;

    const cookingSteps = getRecipeProcedureSteps(recipe);

    return {
      recipe,
      servingAmount,
      isPieces,
      totalYield,
      requiredYield,
      dishHeadcount,
      ingredients,
      totalCost,
      adjustedCost,
      cookingSteps,
    };
  }

  // Calculate dish details for all meals
  const allMealData = useMemo(() => {
    const meals = ['breakfast', 'lunch', 'dinner'];
    const result = {};
    meals.forEach(m => {
      result[m] = (dayMenu[m] || []).map((dish, dishIdx) => ({
        ...dish,
        details: calculateDishDetails(dish, m, dishIdx),
      }));
    });
    return result;
  }, [dayMenu, totalPeople, recipes, masterList, ingredientOverrides, realIngredientQuantities, deptCounts]);

  // Total cost for the day
  const dayCost = useMemo(() => {
    let total = 0;
    ['breakfast', 'lunch', 'dinner'].forEach(m => {
      (allMealData[m] || []).forEach(d => {
        if (d.details) total += d.details.totalCost;
      });
    });
    return total;
  }, [allMealData]);

  const adjustedDayCost = useMemo(() => {
    return dayCost * costMultiplier;
  }, [dayCost, costMultiplier]);

  // Save daily kitchen data
  function saveDailyKitchen() {
    persistDailyKitchen();

    // Mirror to recipe history
    const historySnapshot = buildDaySnapshot(
      selectedDate,
      deptCounts,
      totalPeople,
      chargeablePeople,
      nonChargeablePeople,
      dayMenu,
      ingredientOverrides,
      realIngredientQuantities
    );
    store.addRecipeHistory(historySnapshot);

    setToastMessage('Daily kitchen plan saved & synced to History');
    setTimeout(() => setToastMessage(''), 3000);
  }

  // Export current active day to Excel (.xlsx)
  function handleExportCurrentExcel() {
    const currentSnapshot = buildDaySnapshot(
      selectedDate,
      deptCounts,
      totalPeople,
      chargeablePeople,
      nonChargeablePeople,
      dayMenu,
      ingredientOverrides,
      realIngredientQuantities
    );
    exportDayToExcel(currentSnapshot);
    setToastMessage(`📥 Excel downloaded for ${selectedDate}`);
    setTimeout(() => setToastMessage(''), 3000);
  }

  // Copy summary to clipboard
  function copySummary() {
    let summaryText = `*KITCHEN PRODUCTION SHEET*\nDate: ${dateFormatted}\nTotal Headcount: ${totalPeople} people (${chargeablePeople} billable, ${nonChargeablePeople} Temple non-chargeable)\n\n`;
    ['breakfast', 'lunch', 'dinner'].forEach(m => {
      const dishes = allMealData[m] || [];
      if (dishes.length > 0) {
        summaryText += `*${m.toUpperCase()}*:\n`;
        dishes.forEach(d => {
          if (d.details) {
            const unitLabel = d.details.recipe.yieldUnit;
            summaryText += `• ${d.dish}: ${d.details.requiredYield} ${unitLabel} required (${d.serving} ${unitLabel === 'pcs' ? 'pcs' : 'ml'}/person)\n`;
          }
        });
        summaryText += '\n';
      }
    });
    summaryText += `Ingredient Cost: ₹${formatNumber(dayCost, 0)}\nAdjusted Cost (${formatNumber(costMultiplier, 2)}x): ₹${formatNumber(adjustedDayCost, 0)}`;
    navigator.clipboard.writeText(summaryText);
    setToastMessage('Summary copied to clipboard!');
    setTimeout(() => setToastMessage(''), 3000);
  }

  // Print handler
  function handlePrint() {
    window.print();
  }

  const mealTypes = [
    { key: 'all', label: 'All Meals', count: (allMealData.breakfast?.length || 0) + (allMealData.lunch?.length || 0) + (allMealData.dinner?.length || 0) },
    { key: 'breakfast', label: 'Breakfast', count: allMealData.breakfast?.length || 0 },
    { key: 'lunch', label: 'Lunch', count: allMealData.lunch?.length || 0 },
    { key: 'dinner', label: 'Dinner', count: allMealData.dinner?.length || 0 },
  ];

  function toggleRecipe(recipeKey) {
    setExpandedRecipes(prev => ({ ...prev, [recipeKey]: !prev[recipeKey] }));
  }

  const dateFormatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Decide which meals to render based on activeTab
  const mealsToDisplay = activeTab === 'all'
    ? ['breakfast', 'lunch', 'dinner']
    : [activeTab];

  return (
    <div className="page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification animate-in">
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Screen Page Header */}
      <div className="page-header animate-in no-print">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Daily Kitchen</h1>
            <p>The main operations section. Pick date, adjust headcounts, and inspect scaled recipes with Hindi cooking steps.</p>
          </div>
          <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/history')}
              title="Open Recipe History section"
            >
              📜 History
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportCurrentExcel}
              title="Download Excel spreadsheet for this day"
              style={{ color: '#059669', borderColor: '#10b981', fontWeight: 600 }}
            >
              📥 Download Excel
            </button>
            <button className="btn btn-secondary" onClick={copySummary} title="Copy summary for WhatsApp">
              📋 Copy Summary
            </button>
            <button className="btn btn-secondary" onClick={saveDailyKitchen}>
              💾 Save
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print Recipes
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet Header (Visible Only on Print) */}
      <div className="print-header print-only">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>रसोई दैनिक उत्पादन पत्रक (Daily Kitchen Sheet)</h1>
            <div style={{ fontSize: 13, marginTop: 4 }}>Date: <strong>{dateFormatted}</strong></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Total: {totalPeople} People</div>
            <div style={{ fontSize: 12 }}>Ingredient: ₹{formatNumber(dayCost, 0)} · Adjusted: ₹{formatNumber(adjustedDayCost, 0)}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, background: '#f3f4f6', padding: '6px 10px', borderRadius: 4, marginBottom: 16 }}>
          <strong>Headcount Breakdown: </strong>
          {departments.map(d => `${d.name}: ${deptCounts[d.id] || 0}`).join('  |  ')}
        </div>
      </div>

      {/* Date & Quick Controls */}
      <div className="card mb-xl animate-in-delayed no-print" style={{ padding: 'var(--space-lg) var(--space-xl)' }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
          <div className="flex items-center gap-xl" style={{ flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Planning Date</label>
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 180 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Schedule</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{dateFormatted}</div>
            </div>
          </div>

          <div>
            <button
              className="btn btn-primary"
              onClick={openGenerateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 20px',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span>✨</span> Generate Next Day Recipes
            </button>
          </div>
        </div>
      </div>

      {/* Department Headcounts */}
      <div className="card mb-xl animate-in-delayed no-print">
        <div className="card-header">
          <div>
            <h2>Department Headcounts</h2>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Ask department heads 2 days before and update headcount counts here.
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Total Headcount:</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalPeople}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>people</span>
          </div>
        </div>
        <div className="card-body">
          <div className="dept-selector">
            <label className="form-label" htmlFor="daily-department-select">Department head</label>
            <select
              id="daily-department-select"
              className="form-select"
              value={selectedDepartment?.id || ''}
              onChange={e => setSelectedDepartmentId(e.target.value)}
              aria-label="Select department head"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          {selectedDepartment && (
            <div className="dept-input-card">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDepartment.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default: {selectedDepartment.defaultCount} people</div>
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={deptCounts[selectedDepartment.id] ?? ''}
                  onChange={e => setDeptCounts(prev => ({ ...prev, [selectedDepartment.id]: e.target.value }))}
                  style={{ width: 75, textAlign: 'center', fontWeight: 600 }}
                  min="0"
                />
              </div>
          )}
        </div>
      </div>

      {/* Stat Summary Cards */}
      <div className="stat-grid animate-in-delayed no-print">
        <div className="stat-card">
          <div className="stat-label">Total People</div>
          <div className="stat-value text-accent">{totalPeople}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {chargeablePeople} billable · {nonChargeablePeople} free
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Breakfast Dishes</div>
          <div className="stat-value">{allMealData.breakfast?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Lunch Dishes</div>
          <div className="stat-value">{allMealData.lunch?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dinner Dishes</div>
          <div className="stat-value">{allMealData.dinner?.length || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Adjusted Day Cost</div>
          <div className="stat-value text-success">₹{formatNumber(adjustedDayCost, 0)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Ingredient: ₹{formatNumber(dayCost, 0)} · {formatNumber(costMultiplier, 2)}x
          </div>
        </div>
      </div>

      {/* Meal Selection Tabs */}
      <div className="tabs no-print">
        {mealTypes.map(meal => (
          <button
            key={meal.key}
            className={`tab ${activeTab === meal.key ? 'active' : ''}`}
            onClick={() => setActiveTab(meal.key)}
          >
            {meal.label} <span className="tab-badge">{meal.count}</span>
          </button>
        ))}
      </div>

      {/* Render Dishes for Meals */}
      {mealsToDisplay.map(mealKey => {
        const dishes = allMealData[mealKey] || [];
        const mealTitle = mealKey.charAt(0).toUpperCase() + mealKey.slice(1);

        if (dishes.length === 0) {
          if (activeTab === mealKey) {
            return (
              <div key={mealKey} className="card mb-xl">
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <h3>No {mealTitle} dishes scheduled for this date</h3>
                  <p>Open the Monthly Menu section to schedule recipes and serving amounts for this day.</p>
                </div>
              </div>
            );
          }
          return null;
        }

        return (
          <div key={mealKey} className="meal-section mb-xl">
            {activeTab === 'all' && (
              <div className="meal-section-header">
                <span className="meal-pill">{mealTitle}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                  {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'}
                </span>
              </div>
            )}

            <div className="meal-dishes-scroll">
            {dishes.map((dish, dishIdx) => {
              if (!dish.details) {
                return (
                  <div key={dishIdx} className="card mb-lg">
                    <div className="card-header">
                      <h2>{dish.dish}</h2>
                      <span className="badge badge-danger">Recipe not found in database</span>
                    </div>
                  </div>
                );
              }

              const d = dish.details;
              const recipeKey = `${mealKey}-${dishIdx}`;
              const isExpanded = Boolean(expandedRecipes[recipeKey]);
              return (
                <div key={dishIdx} className="card mb-lg recipe-print-block animate-in">
                  <button
                    type="button"
                    className="card-header recipe-summary-toggle"
                    onClick={() => toggleRecipe(recipeKey)}
                    aria-expanded={isExpanded}
                    aria-controls={`recipe-details-${recipeKey}`}
                  >
                    <div>
                      <div className="flex items-center gap-md">
                        <h2>{dish.dish}</h2>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{mealKey}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {d.isPieces
                          ? `${d.servingAmount} pcs/person × ${d.dishHeadcount} people = `
                          : `${d.servingAmount} ml/person × ${d.dishHeadcount} people = `}
                        <strong style={{ color: 'var(--accent)', fontSize: 13 }}>
                          {d.requiredYield} {d.recipe.yieldUnit}
                        </strong> calculated yield (rounded)
                        <div className="dish-department-summary">
                          {dish.departments?.length
                            ? `Served to: ${dish.departments.map(id => departments.find(dept => dept.id === id)?.name).filter(Boolean).join(', ')}`
                            : 'Served to: all departments'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-xl recipe-summary-meta">
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Base Recipe Yield</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{d.recipe.standardYield} {d.recipe.yieldUnit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required Production</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{d.requiredYield} {d.recipe.yieldUnit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ingredient Cost</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>₹{formatNumber(d.totalCost, 0)}</div>
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                          Adjusted: ₹{formatNumber(d.adjustedCost, 0)}
                        </div>
                      </div>
                      <span className="recipe-disclosure-icon" aria-hidden="true">
                        {isExpanded ? '−' : '+'}
                      </span>
                    </div>
                  </button>

                  <div id={`recipe-details-${recipeKey}`} hidden={!isExpanded}>
                    {/* Scaled Ingredients Table */}
                    <div className="recipe-spreadsheet">
                    <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th className="text-right">Standard Qty (Fixed)</th>
                          <th className="text-right" style={{ color: 'var(--text-secondary)' }}>Calculated Qty</th>
                          <th className="text-right" style={{ color: 'var(--accent)' }}>Final Qty (Editable)</th>
                          <th className="text-right" style={{ color: 'var(--success)' }}>Real Qty (Cooked)</th>
                          <th>Unit</th>
                          <th className="text-right">Price/Unit (₹)</th>
                          <th className="text-right">Estimated Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: 'var(--accent-subtle)' }}>
                          <td style={{ fontWeight: 600, color: 'var(--accent)' }}>Yield (Total Volume)</td>
                          <td className="text-right font-mono" style={{ fontWeight: 600 }}>{d.recipe.standardYield}</td>
                          <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{formatNumber(d.requiredYield)}</td>
                          <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>—</td>
                          <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--success)' }}>—</td>
                          <td><strong>{d.recipe.yieldUnit}</strong></td>
                          <td className="text-right font-mono">-</td>
                          <td className="text-right font-mono">-</td>
                        </tr>
                        {d.ingredients.map((ing, idx) => {
                          const overrideKey = getIngredientOverrideKey(mealKey, dishIdx, idx);
                          const hasOverride = ingredientOverrides[overrideKey] !== undefined && ingredientOverrides[overrideKey] !== '';
                          const hasRealQuantity = realIngredientQuantities[overrideKey] !== undefined && realIngredientQuantities[overrideKey] !== '';
                          return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ing.name}</td>
                            <td className="text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{ing.standardQty}</td>
                            <td className="text-right font-mono" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {formatNumber(ing.calculatedQty)}
                            </td>
                            <td className="text-right" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                              <div className="ingredient-quantity-editor">
                                <input
                                  type="number"
                                  className="form-input ingredient-quantity-input"
                                  value={hasOverride ? ingredientOverrides[overrideKey] : ing.requiredQty}
                                  onChange={e => handleIngredientQuantityChange(mealKey, dishIdx, idx, e.target.value)}
                                  onBlur={saveIngredientQuantityOverride}
                                  min="0"
                                  step="any"
                                  aria-label={`Final quantity for ${ing.name}`}
                                />
                                {hasOverride && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm ingredient-quantity-reset"
                                    onClick={() => resetIngredientQuantity(mealKey, dishIdx, idx)}
                                    title="Restore calculated quantity"
                                    aria-label={`Restore calculated quantity for ${ing.name}`}
                                  >
                                    ↺
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="text-right" style={{ fontWeight: 600, color: 'var(--success)' }}>
                              <input
                                type="number"
                                className="form-input ingredient-quantity-input"
                                value={hasRealQuantity ? realIngredientQuantities[overrideKey] : ''}
                                onChange={e => handleRealIngredientQuantityChange(mealKey, dishIdx, idx, e.target.value)}
                                min="0"
                                step="any"
                                placeholder="Enter"
                                aria-label={`Real cooked quantity for ${ing.name}`}
                              />
                            </td>
                            <td><span className="badge badge-neutral">{ing.unit}</span></td>
                            <td className="text-right font-mono" style={{ color: 'var(--text-tertiary)' }}>
                              {ing.rate > 0 ? `₹${ing.rate}` : '-'}
                            </td>
                            <td className="text-right font-mono" style={{ fontWeight: 600, color: ing.amount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                              {ing.amount > 0 ? `₹${formatNumber(ing.amount)}` : '-'}
                            </td>
                          </tr>
                          );
                        })}
                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                          <td colSpan={7} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Ingredient Cost
                          </td>
                          <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>
                            ₹{formatNumber(d.totalCost)}
                          </td>
                        </tr>
                        <tr style={{ background: 'var(--accent-subtle)' }}>
                          <td colSpan={7} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            Adjusted Cost ({formatNumber(costMultiplier, 2)}x)
                          </td>
                          <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                            ₹{formatNumber(d.adjustedCost)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>

                    {/* Bilingual Cooking Process (विधि) */}
                    {d.cookingSteps.length > 0 && (
                      <div className="recipe-procedure-panel">
                      <div className="recipe-procedure-heading"><span>🍳</span> Cooking Process / बनाने की विधि</div>
                      <div className="recipe-procedure-list">
                        {d.cookingSteps.map(step => (
                          <div key={step.stepNumber} className="recipe-procedure-row">
                            <div className="step-number">{step.stepNumber}</div>
                            <div className="recipe-procedure-copy">
                              <div className="recipe-procedure-english">{step.english || '—'}</div>
                              <div className="recipe-procedure-hindi">{step.hindi || '—'}</div>
                              <div className="recipe-procedure-ingredients">{step.ingredients.join(', ') || 'General step'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        );
      })}

      {/* Generate Next Day Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✨</span> Generate Next Day Recipes
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Set department-wise headcounts to automatically calculate yields, ingredient quantities, and batch costs.
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowGenerateModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="flex flex-col gap-lg">
                {/* Target Date Selector */}
                <div className="form-group" style={{ background: 'var(--accent-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-sm">
                    <div>
                      <label className="form-label" style={{ margin: 0, fontWeight: 600, color: 'var(--accent)' }}>
                        Target Production Date
                      </label>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, fontWeight: 600 }}>
                        {generateDateFormatted}
                      </div>
                    </div>
                    <input
                      type="date"
                      className="form-input"
                      value={generateDate}
                      onChange={e => setGenerateDate(e.target.value)}
                      style={{ width: 170, background: '#fff' }}
                    />
                  </div>
                </div>

                {/* Scheduled Dishes Preview */}
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    📋 Scheduled Menu for {new Date(generateDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                  {['breakfast', 'lunch', 'dinner'].map(meal => {
                    const dishes = generateDayMenu[meal] || [];
                    if (dishes.length === 0) return null;
                    return (
                      <div key={meal} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', width: 75, color: 'var(--text-secondary)' }}>
                          {meal}:
                        </span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {dishes.map(d => {
                            const recipe = recipes.find(r => r.name === d.dish);
                            return `${d.dish} (${d.serving} ${getRecipeServingUnit(recipe) === 'pieces' ? 'pcs' : 'ml'})`;
                          }).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                  {!generateDayMenu.breakfast?.length && !generateDayMenu.lunch?.length && !generateDayMenu.dinner?.length && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      No dishes scheduled yet in Monthly Menu for this date. (Recipes scheduled in Monthly Menu will scale automatically).
                    </div>
                  )}
                </div>

                {/* Department-wise Headcount Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-sm">
                    <div>
                      <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
                        Department-wise Headcounts
                      </label>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Enter expected headcount for each department:
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const reset = {};
                        departments.forEach(d => { reset[d.id] = d.defaultCount; });
                        setGenerateCounts(reset);
                      }}
                    >
                      Reset Defaults
                    </button>
                  </div>

                  <div className="dept-selector">
                    <label className="form-label" htmlFor="generate-department-select">Department head</label>
                    <select
                      id="generate-department-select"
                      className="form-select"
                      value={selectedGenerateDepartment?.id || ''}
                      onChange={e => setSelectedGenerateDepartmentId(e.target.value)}
                      aria-label="Select department head for production plan"
                    >
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedGenerateDepartment && (
                      <div className="dept-input-card" style={{ padding: '10px 14px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedGenerateDepartment.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default: {selectedGenerateDepartment.defaultCount} people</div>
                        </div>
                        <input
                          type="number"
                          className="form-input"
                          value={generateCounts[selectedGenerateDepartment.id] ?? ''}
                          onChange={e => setGenerateCounts(prev => ({ ...prev, [selectedGenerateDepartment.id]: e.target.value }))}
                          style={{ width: 75, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                          min="0"
                        />
                      </div>
                  )}
                </div>

                {/* Headcount Live Total Summary */}
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Production Headcount</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                      {generateTotalPeople} people
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div>{generateChargeablePeople} billable</div>
                    <div style={{ color: 'var(--text-tertiary)' }}>{generateNonChargeablePeople} Temple</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmGenerate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <span>✨</span> Generate Recipes & Production Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
