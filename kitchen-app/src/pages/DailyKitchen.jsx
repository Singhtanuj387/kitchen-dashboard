import { useState, useMemo, useEffect, Fragment } from 'react';
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
  const [activeTab, setActiveTab] = useState('all');
  const [expandedRecipes, setExpandedRecipes] = useState({});
  const [ingredientOverrides, setIngredientOverrides] = useState({});
  const [realIngredientQuantities, setRealIngredientQuantities] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const departments = store.getDepartments();
  const recipes = store.getRecipes();
  const masterList = store.getMasterList();
  const costMultiplier = store.getCostSettings().multiplier;

  // Load or initialize dishes for selectedDate
  function getInitialDishes(dateStr, currentCounts) {
    const saved = store.getDailyKitchen(dateStr);
    const depts = store.getDepartments();
    const allRecipes = store.getRecipes();

    if (saved && saved.meals && (saved.meals.breakfast?.length || saved.meals.lunch?.length || saved.meals.dinner?.length)) {
      const normalized = { breakfast: [], lunch: [], dinner: [] };
      ['breakfast', 'lunch', 'dinner'].forEach(m => {
        normalized[m] = (saved.meals[m] || []).map(dish => {
          const rec = allRecipes.find(r => r.name.trim().toLowerCase() === (dish.dish || '').trim().toLowerCase());
          const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
          const deptQuantities = {};
          depts.forEach(d => {
            if (dish.deptQuantities && dish.deptQuantities[d.id] !== undefined) {
              deptQuantities[d.id] = dish.deptQuantities[d.id];
            } else if (Array.isArray(dish.departments) && dish.departments.length > 0) {
              deptQuantities[d.id] = dish.departments.includes(d.id) ? (parseInt(currentCounts[d.id], 10) || d.defaultCount) : 0;
            } else {
              deptQuantities[d.id] = parseInt(currentCounts[d.id], 10) || d.defaultCount;
            }
          });
          return {
            dish: dish.dish || '',
            serving: dish.serving !== undefined ? dish.serving : (isPieces ? 3 : 200),
            servingUnit: dish.servingUnit || (isPieces ? 'pcs' : 'ml'),
            deptQuantities,
          };
        });
      });
      return normalized;
    }

    // Otherwise load from monthly menu
    const dObj = new Date(dateStr + 'T00:00:00');
    const ym = getYearMonth(dObj);
    const monthMenu = store.getMonthlyMenu(ym);
    const rawDayMenu = monthMenu[dObj.getDate()] || {};

    const meals = { breakfast: [], lunch: [], dinner: [] };
    ['breakfast', 'lunch', 'dinner'].forEach(m => {
      meals[m] = (rawDayMenu[m] || []).map(item => {
        const rec = allRecipes.find(r => r.name.trim().toLowerCase() === (item.dish || '').trim().toLowerCase());
        const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
        const defaultServing = item.serving !== undefined ? item.serving : (isPieces ? 3 : 200);

        const deptQuantities = {};
        depts.forEach(d => {
          if (Array.isArray(item.departments) && item.departments.length > 0) {
            deptQuantities[d.id] = item.departments.includes(d.id) ? (parseInt(currentCounts[d.id], 10) || d.defaultCount) : 0;
          } else {
            deptQuantities[d.id] = parseInt(currentCounts[d.id], 10) || d.defaultCount;
          }
        });

        return {
          dish: item.dish,
          serving: defaultServing,
          servingUnit: isPieces ? 'pcs' : 'ml',
          deptQuantities,
        };
      });
    });
    return meals;
  }

  const [dailyDishes, setDailyDishes] = useState(() => getInitialDishes(selectedDate, deptCounts));

  useEffect(() => {
    if (urlDate && urlDate !== selectedDate) {
      setSelectedDate(urlDate);
    }
  }, [urlDate]);

  // Generate Next Day Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateDate, setGenerateDate] = useState('');
  const [generateCounts, setGenerateCounts] = useState({});

  // Load saved counts & dishes when selectedDate changes
  useEffect(() => {
    const saved = store.getDailyKitchen(selectedDate);
    const counts = {};
    if (saved && saved.departments && saved.departments.length > 0) {
      saved.departments.forEach(d => { counts[d.id] = d.count; });
      setDeptCounts(counts);
    } else {
      departments.forEach(d => { counts[d.id] = d.defaultCount; });
      setDeptCounts(counts);
    }
    setDailyDishes(getInitialDishes(selectedDate, counts));
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
    setShowGenerateModal(true);
  }

  // Helper to compute dish headcount from deptQuantities
  function getDishHeadcount(dishItem, countsMap, fallbackTotal) {
    if (dishItem?.deptQuantities && Object.keys(dishItem.deptQuantities).length > 0) {
      return Object.values(dishItem.deptQuantities).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0);
    }
    if (!Array.isArray(dishItem?.departments) || dishItem.departments.length === 0) return fallbackTotal;
    return dishItem.departments.reduce((sum, departmentId) => sum + (parseInt(countsMap[departmentId], 10) || 0), 0);
  }

  function buildDaySnapshot(dateStr, countsMap, totalCount, chargeableCount, nonChargeableCount, dishesObj, overrides = {}, realQuantities = {}) {
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
      const list = dishesObj[m] || [];
      mealsObj[m] = list.map((item, dishIdx) => {
        const rec = recipes.find(r => r.name.trim().toLowerCase() === (item.dish || '').trim().toLowerCase());
        if (!rec) {
          return {
            dish: item.dish,
            serving: item.serving || 0,
            servingUnit: item.servingUnit || 'ml',
            deptQuantities: item.deptQuantities || {},
            requiredYield: 0,
            yieldUnit: 'L',
            totalCost: 0,
            adjustedCost: 0,
            ingredients: [],
            cookingSteps: [],
          };
        }

        const isPieces = getRecipeServingUnit(rec) === 'pieces';
        const servingAmount = parseFloat(item.serving) || 0;
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
          servingUnit: isPieces ? 'pcs' : 'ml',
          deptQuantities: item.deptQuantities || {},
          dishHeadcount,
          calculatedYield: requiredYield,
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
    const nextObj = new Date(generateDate + 'T00:00:00');
    const ym = getYearMonth(nextObj);
    const monthMenu = store.getMonthlyMenu(ym);
    const rawDayMenu = monthMenu[nextObj.getDate()] || {};

    const meals = { breakfast: [], lunch: [], dinner: [] };
    ['breakfast', 'lunch', 'dinner'].forEach(m => {
      meals[m] = (rawDayMenu[m] || []).map(item => {
        const rec = recipes.find(r => r.name.trim().toLowerCase() === (item.dish || '').trim().toLowerCase());
        const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
        const defaultServing = item.serving !== undefined ? item.serving : (isPieces ? 3 : 200);

        const deptQuantities = {};
        departments.forEach(d => {
          deptQuantities[d.id] = parseInt(generateCounts[d.id], 10) || d.defaultCount;
        });

        return {
          dish: item.dish,
          serving: defaultServing,
          servingUnit: isPieces ? 'pcs' : 'ml',
          deptQuantities,
        };
      });
    });

    store.saveDailyKitchen(generateDate, {
      date: generateDate,
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        count: parseInt(generateCounts[d.id], 10) || 0,
        isChargeable: d.isChargeable !== false
      })),
      totalPeople: generateTotalPeople,
      meals,
      menu: meals,
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
      meals
    );
    store.addRecipeHistory(historySnapshot);

    setSelectedDate(generateDate);
    setDeptCounts(generateCounts);
    setDailyDishes(meals);
    setShowGenerateModal(false);
    setToastMessage(`✨ Recipes generated & saved to History for ${generateDateFormatted}!`);
    setTimeout(() => setToastMessage(''), 3500);
  }

  function getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx) {
    return `${mealKey}-${dishIdx}-${ingredientIdx}`;
  }

  function persistDailyKitchen(dishesToSave = dailyDishes, countsToSave = deptCounts, overrides = ingredientOverrides) {
    const totalCount = Object.values(countsToSave).reduce((sum, c) => sum + (parseInt(c, 10) || 0), 0);
    store.saveDailyKitchen(selectedDate, {
      date: selectedDate,
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        count: parseInt(countsToSave[d.id], 10) || 0,
        isChargeable: d.isChargeable !== false
      })),
      totalPeople: totalCount,
      meals: dishesToSave,
      menu: dishesToSave,
      ingredientOverrides: overrides,
      realIngredientQuantities,
    });
  }

  function handleDayDeptCountChange(deptId, value) {
    const cleanVal = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    const newCounts = { ...deptCounts, [deptId]: cleanVal };
    setDeptCounts(newCounts);

    if (typeof cleanVal === 'number') {
      setDailyDishes(prev => {
        const updated = { ...prev };
        ['breakfast', 'lunch', 'dinner'].forEach(m => {
          updated[m] = (prev[m] || []).map(dish => {
            const currentDishQty = dish.deptQuantities?.[deptId];
            if (currentDishQty === 0) {
              return dish; // Keep manually eliminated department as 0
            }
            return {
              ...dish,
              deptQuantities: {
                ...dish.deptQuantities,
                [deptId]: cleanVal
              }
            };
          });
        });
        persistDailyKitchen(updated, newCounts);
        return updated;
      });
    }
  }

  function handleDeptQtyChange(mealType, dishIdx, deptId, value) {
    const cleanVal = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setDailyDishes(prev => {
      const updated = {
        ...prev,
        [mealType]: prev[mealType].map((d, i) => {
          if (i !== dishIdx) return d;
          return {
            ...d,
            deptQuantities: {
              ...d.deptQuantities,
              [deptId]: cleanVal
            }
          };
        })
      };
      persistDailyKitchen(updated);
      return updated;
    });
  }

  function handleToggleZeroDept(mealType, dishIdx, deptId) {
    const currentVal = parseInt(dailyDishes[mealType]?.[dishIdx]?.deptQuantities?.[deptId], 10) || 0;
    const dayCount = parseInt(deptCounts[deptId], 10) || 0;
    const nextVal = currentVal > 0 ? 0 : dayCount;
    handleDeptQtyChange(mealType, dishIdx, deptId, nextVal);
  }

  function handleServingChange(mealType, dishIdx, value) {
    const cleanVal = value === '' ? '' : parseFloat(value);
    setDailyDishes(prev => {
      const updated = {
        ...prev,
        [mealType]: prev[mealType].map((d, i) => {
          if (i !== dishIdx) return d;
          return { ...d, serving: cleanVal };
        })
      };
      persistDailyKitchen(updated);
      return updated;
    });
  }

  function handleChangeDishName(mealType, dishIdx, newDishName) {
    const rec = recipes.find(r => r.name === newDishName);
    const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
    setDailyDishes(prev => {
      const updated = {
        ...prev,
        [mealType]: prev[mealType].map((d, i) => {
          if (i !== dishIdx) return d;
          return {
            ...d,
            dish: newDishName,
            serving: isPieces ? 3 : 200,
            servingUnit: isPieces ? 'pcs' : 'ml',
          };
        })
      };
      persistDailyKitchen(updated);
      return updated;
    });
  }

  function handleAddDishToMeal(mealType) {
    const firstRecipe = recipes[0]?.name || '';
    const rec = recipes.find(r => r.name === firstRecipe);
    const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
    const deptQuantities = {};
    departments.forEach(d => {
      deptQuantities[d.id] = parseInt(deptCounts[d.id], 10) || d.defaultCount;
    });
    const newDish = {
      dish: firstRecipe,
      serving: isPieces ? 3 : 200,
      servingUnit: isPieces ? 'pcs' : 'ml',
      deptQuantities,
    };
    setDailyDishes(prev => {
      const updated = {
        ...prev,
        [mealType]: [...(prev[mealType] || []), newDish]
      };
      persistDailyKitchen(updated);
      return updated;
    });
  }

  function handleRemoveDishFromMeal(mealType, dishIdx) {
    setDailyDishes(prev => {
      const updated = {
        ...prev,
        [mealType]: prev[mealType].filter((_, i) => i !== dishIdx)
      };
      persistDailyKitchen(updated);
      return updated;
    });
  }

  function handleResetAllocations() {
    setDailyDishes(prev => {
      const updated = { ...prev };
      ['breakfast', 'lunch', 'dinner'].forEach(m => {
        updated[m] = (prev[m] || []).map(dish => {
          const deptQuantities = {};
          departments.forEach(d => {
            deptQuantities[d.id] = parseInt(deptCounts[d.id], 10) || d.defaultCount;
          });
          return { ...dish, deptQuantities };
        });
      });
      persistDailyKitchen(updated);
      return updated;
    });
    setToastMessage('↺ All department allocations reset to full day headcount');
    setTimeout(() => setToastMessage(''), 2500);
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
    persistDailyKitchen(dailyDishes, deptCounts, nextOverrides);
  }

  function handleRealIngredientQuantityChange(mealKey, dishIdx, ingredientIdx, value) {
    const key = getIngredientOverrideKey(mealKey, dishIdx, ingredientIdx);
    const nextValues = { ...realIngredientQuantities, [key]: value };
    setRealIngredientQuantities(nextValues);
    store.saveDailyKitchen(selectedDate, {
      date: selectedDate,
      departments: departments.map(d => ({ id: d.id, name: d.name, count: parseInt(deptCounts[d.id], 10) || 0, isChargeable: d.isChargeable !== false })),
      totalPeople,
      meals: dailyDishes,
      menu: dailyDishes,
      ingredientOverrides,
      realIngredientQuantities: nextValues,
    });
  }

  // Calculate full recipe details for a dish
  function calculateDishDetails(dishItem, mealKey, dishIdx) {
    if (!dishItem || !dishItem.dish) return null;
    const recipe = recipes.find(r => r.name.trim().toLowerCase() === dishItem.dish.trim().toLowerCase());
    if (!recipe) return null;

    // serving is in ml per person (or pcs per person for items like rotis/samosas/bananas)
    const servingAmount = parseFloat(dishItem.serving) || 0;
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
      result[m] = (dailyDishes[m] || []).map((dish, dishIdx) => ({
        ...dish,
        details: calculateDishDetails(dish, m, dishIdx),
      }));
    });
    return result;
  }, [dailyDishes, totalPeople, recipes, masterList, ingredientOverrides, realIngredientQuantities, deptCounts]);

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
      dailyDishes,
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
      dailyDishes,
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
            summaryText += `• ${d.dish}: ${d.details.requiredYield} ${unitLabel} (${d.details.dishHeadcount} ppl @ ${d.serving} ${unitLabel === 'pcs' ? 'pcs' : 'ml'}/person)\n`;
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

      {/* ── DAY DEPARTMENT HEADCOUNTS BAR ── */}
      <div className="card mb-xl animate-in-delayed no-print">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="flex items-center gap-sm">
              <span style={{ fontSize: 20 }}>👥</span>
              <h2>Day Department Headcounts</h2>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Update expected headcounts per department. These serve as master headcounts for dish allocations below.
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Total Headcount:</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalPeople}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>people</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({chargeablePeople} billable · {nonChargeablePeople} free)
            </span>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            {departments.map(dept => {
              const countVal = deptCounts[dept.id] ?? dept.defaultCount;
              const isFree = dept.isChargeable === false;

              return (
                <div
                  key={dept.id}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dept.name}
                    </div>
                    <div className="flex items-center gap-xs" style={{ marginTop: 2 }}>
                      <span className={`badge ${isFree ? 'badge-neutral' : 'badge-info'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                        {isFree ? 'Free' : 'Billable'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        Default: {dept.defaultCount}
                      </span>
                    </div>
                  </div>

                  <input
                    type="number"
                    className="form-input"
                    value={countVal}
                    onChange={e => handleDayDeptCountChange(dept.id, e.target.value)}
                    style={{
                      width: 65,
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      padding: '5px 6px',
                    }}
                    min="0"
                    title={`Update headcount for ${dept.name}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── GOOGLE SHEETS PRODUCTION MATRIX ── */}
      <div className="card mb-xl animate-in-delayed no-print" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="flex items-center gap-sm">
              <span style={{ fontSize: 20 }}>📊</span>
              <h2>Daily Production Sheet (Google Sheets Matrix)</h2>
              <span className="badge badge-accent" style={{ fontSize: 11 }}>Live Calculation</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              Set per-person serving sizes & department quantities. To eliminate a department from a dish, mark its cell as <strong>0</strong>.
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetAllocations}
              title="Reset all dishes to full day headcount for all departments"
            >
              ↺ Reset Allocations
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={saveDailyKitchen}
            >
              💾 Save Plan
            </button>
          </div>
        </div>

        <div className="table-container" style={{ maxHeight: 600, overflow: 'auto' }}>
          <table className="production-matrix-table" style={{ minWidth: 960, margin: 0, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ width: 90, textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meal</th>
                <th style={{ minWidth: 200, textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dish / Recipe</th>
                <th style={{ width: 140, textAlign: 'center', padding: '10px 12px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Serving / Person</th>
                {departments.map(d => (
                  <th key={d.id} style={{ minWidth: 105, textAlign: 'center', padding: '10px 6px', borderBottom: '2px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                      Day: {deptCounts[d.id] ?? d.defaultCount}
                    </div>
                  </th>
                ))}
                <th style={{ width: 110, textAlign: 'center', padding: '10px 10px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total People</th>
                <th style={{ width: 125, textAlign: 'center', padding: '10px 10px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required Yield</th>
                <th style={{ width: 95, textAlign: 'right', padding: '10px 10px', borderBottom: '2px solid var(--border-subtle)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Est. Cost</th>
                <th style={{ width: 45, textAlign: 'center', padding: '10px 6px', borderBottom: '2px solid var(--border-subtle)' }}></th>
              </tr>
            </thead>
            <tbody>
              {['breakfast', 'lunch', 'dinner'].map(m => {
                const dishes = dailyDishes[m] || [];
                return (
                  <Fragment key={m}>
                    {/* Meal group header row */}
                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-subtle)' }}>
                      <td colSpan={6 + departments.length} style={{ padding: '8px 14px' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-sm">
                            <span className={`meal-tag ${m}`} style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {m}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {dishes.length} {dishes.length === 1 ? 'dish' : 'dishes'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleAddDishToMeal(m)}
                            style={{ fontSize: 11, padding: '2px 8px' }}
                          >
                            + Add Dish to {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {dishes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6 + departments.length}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            color: 'var(--text-tertiary)',
                            fontSize: 12,
                            background: 'var(--bg-primary)',
                            borderBottom: '1px solid var(--border-subtle)'
                          }}
                        >
                          No dishes scheduled for {m}.{' '}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleAddDishToMeal(m)}
                            style={{ fontSize: 11 }}
                          >
                            + Add a dish
                          </button>
                        </td>
                      </tr>
                    ) : (
                      dishes.map((dish, dishIdx) => {
                        const rec = recipes.find(r => r.name.trim().toLowerCase() === (dish.dish || '').trim().toLowerCase());
                        const isPieces = rec ? getRecipeServingUnit(rec) === 'pieces' : false;
                        const dishHeadcount = getDishHeadcount(dish, deptCounts, totalPeople);
                        const servingAmount = parseFloat(dish.serving) || 0;
                        const calculatedYield = isPieces
                          ? Math.round(dishHeadcount * servingAmount)
                          : Math.round((dishHeadcount * servingAmount) / 1000);
                        const yieldUnit = rec?.yieldUnit || (isPieces ? 'pcs' : 'L');

                        // Cost calculation
                        let dishCost = 0;
                        if (rec) {
                          const ings = rec.ingredients.map(ing => {
                            const calculatedQty = calculateRequiredQty(ing.standardQty, calculatedYield, rec.standardYield);
                            const master = findMasterItem(ing.name, masterList);
                            const rate = master ? master.pricePerUnit : 0;
                            return calculateIngredientCost(calculatedQty, rate, ing.unit, master?.unit);
                          });
                          dishCost = ings.reduce((sum, cost) => sum + cost, 0);
                        }

                        return (
                          <tr
                            key={`${m}-${dishIdx}`}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: 'var(--bg-primary)',
                            }}
                          >
                            {/* Meal indicator */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                              <span className={`meal-tag ${m}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
                                {m}
                              </span>
                            </td>

                            {/* Dish / Recipe Selector */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                              <select
                                className="form-select"
                                value={dish.dish}
                                onChange={e => handleChangeDishName(m, dishIdx, e.target.value)}
                                style={{ fontSize: 13, fontWeight: 600, padding: '5px 8px', width: '100%' }}
                              >
                                <option value="">Select recipe...</option>
                                {recipes.map(r => (
                                  <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* Serving / Person */}
                            <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                              <div className="flex items-center justify-center gap-xs">
                                <input
                                  type="number"
                                  className="form-input"
                                  value={dish.serving ?? ''}
                                  onChange={e => handleServingChange(m, dishIdx, e.target.value)}
                                  style={{ width: 68, textAlign: 'center', padding: '4px 6px', fontSize: 12, fontWeight: 600 }}
                                  min="0"
                                  step={isPieces ? '1' : '10'}
                                  placeholder={isPieces ? 'pcs' : 'ml'}
                                />
                                <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 5px' }}>
                                  {dish.servingUnit || (isPieces ? 'pcs' : 'ml')}
                                </span>
                              </div>
                            </td>

                            {/* Department Quantity Spreadsheet Cells */}
                            {departments.map(dept => {
                              const rawVal = dish.deptQuantities?.[dept.id];
                              const qty = rawVal === '' ? '' : (parseInt(rawVal, 10) || 0);
                              const isZero = qty === 0;
                              const dayHeadcount = parseInt(deptCounts[dept.id], 10) || 0;

                              return (
                                <td
                                  key={dept.id}
                                  style={{
                                    padding: '6px 6px',
                                    textAlign: 'center',
                                    verticalAlign: 'middle',
                                    background: isZero ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                                    transition: 'background-color 0.15s ease',
                                  }}
                                >
                                  <div className="flex items-center justify-center gap-xs">
                                    <input
                                      type="number"
                                      className="form-input"
                                      value={rawVal ?? 0}
                                      onChange={e => handleDeptQtyChange(m, dishIdx, dept.id, e.target.value)}
                                      style={{
                                        width: 58,
                                        textAlign: 'center',
                                        padding: '4px 2px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: isZero ? 'var(--danger)' : 'var(--text-primary)',
                                        borderColor: isZero ? '#fca5a5' : 'var(--border-subtle)',
                                        background: isZero ? '#fff5f5' : 'var(--bg-primary)',
                                      }}
                                      min="0"
                                      title={`${dept.name}: ${qty} people for this dish. Set 0 to eliminate.`}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      onClick={() => handleToggleZeroDept(m, dishIdx, dept.id)}
                                      style={{
                                        padding: '2px 3px',
                                        fontSize: 10,
                                        minWidth: 18,
                                        height: 24,
                                        color: isZero ? '#059669' : 'var(--text-tertiary)',
                                        lineHeight: 1,
                                      }}
                                      title={isZero ? `Reset to Day Headcount (${dayHeadcount})` : 'Mark 0 (Exclude Department)'}
                                    >
                                      {isZero ? '↺' : '0'}
                                    </button>
                                  </div>
                                  {isZero && (
                                    <div style={{ fontSize: 9, color: 'var(--danger)', fontWeight: 600, marginTop: 2, letterSpacing: '0.02em' }}>
                                      Excluded
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Total Dish Headcount */}
                            <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                {dishHeadcount}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 3 }}>ppl</span>
                            </td>

                            {/* Required Yield */}
                            <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <span className="badge badge-accent" style={{ fontSize: 12, fontWeight: 700 }}>
                                {calculatedYield} {yieldUnit}
                              </span>
                            </td>

                            {/* Est Cost */}
                            <td style={{ padding: '8px 10px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 600, fontSize: 12 }}>
                              ₹{formatNumber(dishCost, 0)}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveDishFromMeal(m, dishIdx)}
                                style={{ color: 'var(--danger)', padding: '3px 6px', fontSize: 12 }}
                                title="Remove dish from this meal"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
                        <div className="dish-department-summary" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 6 }}>
                          {departments.map(dept => {
                            const qty = dish.deptQuantities?.[dept.id] ?? 0;
                            const isZero = qty === 0;
                            return (
                              <span
                                key={dept.id}
                                className={`badge ${isZero ? 'badge-neutral' : 'badge-accent'}`}
                                style={{
                                  fontSize: 10,
                                  opacity: isZero ? 0.6 : 1,
                                  textDecoration: isZero ? 'line-through' : 'none',
                                }}
                              >
                                {dept.name}: {qty}
                              </span>
                            );
                          })}
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
                          {dishes.map(d => d.dish).filter(Boolean).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                  {!generateDayMenu.breakfast?.length && !generateDayMenu.lunch?.length && !generateDayMenu.dinner?.length && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      No dishes scheduled yet in Monthly Menu for this date. (You can add dishes directly in Daily Kitchen).
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

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    {departments.map(dept => {
                      const isFree = dept.isChargeable === false;
                      return (
                        <div
                          key={dept.id}
                          className="dept-input-card"
                          style={{
                            padding: '10px 12px',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {dept.name}
                            </div>
                            <div className="flex items-center gap-xs" style={{ marginTop: 2 }}>
                              <span className={`badge ${isFree ? 'badge-neutral' : 'badge-info'}`} style={{ fontSize: 9, padding: '1px 4px' }}>
                                {isFree ? 'Free' : 'Billable'}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                Default: {dept.defaultCount}
                              </span>
                            </div>
                          </div>
                          <input
                            type="number"
                            className="form-input"
                            value={generateCounts[dept.id] ?? ''}
                            onChange={e => setGenerateCounts(prev => ({ ...prev, [dept.id]: e.target.value }))}
                            style={{ width: 65, textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '4px 6px' }}
                            min="0"
                          />
                        </div>
                      );
                    })}
                  </div>
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
