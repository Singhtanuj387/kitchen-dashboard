import * as XLSX from 'xlsx';
import { formatNumber } from '../store';

/**
 * Export a single daily kitchen production sheet to an Excel file (.xlsx)
 */
export function exportDayToExcel(entry) {
  if (!entry) return;

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──
  const summaryData = [
    ['KITCHEN DAILY PRODUCTION SHEET'],
    [],
    ['Date', entry.dateFormatted || entry.date],
    ['Generated At', entry.generatedAt ? new Date(entry.generatedAt).toLocaleString('en-IN') : '-'],
    ['Total Production Headcount', `${entry.totalPeople} People`],
    ['Chargeable Headcount', `${entry.chargeablePeople || 0} People`],
    ['Non-Chargeable (Temple)', `${entry.nonChargeablePeople || 0} People`],
    ['Ingredient Cost', `₹${formatNumber(entry.totalCost, 0)}`],
    ['Adjusted Cost', `₹${formatNumber(entry.adjustedCost ?? entry.totalCost, 0)}`],
    ['Cost Multiplier', `${formatNumber(entry.costMultiplier || 1, 2)}x`],
    [],
    ['DEPARTMENT HEADCOUNT BREAKDOWN'],
    ['#', 'Department Name', 'Headcount', 'Billing Status'],
  ];

  (entry.departments || []).forEach((d, idx) => {
    summaryData.push([
      idx + 1,
      d.name,
      d.count,
      d.isChargeable === false ? 'Non-Chargeable (Free)' : 'Chargeable (Billable)'
    ]);
  });

  summaryData.push([]);
  summaryData.push(['SCHEDULED MEALS & BATCH COSTS']);
  summaryData.push(['Meal', 'Dish Name', 'Serving / Person', 'Required Yield', 'Ingredient Cost (₹)', 'Adjusted Cost (₹)']);

  const meals = ['breakfast', 'lunch', 'dinner'];
  meals.forEach(m => {
    const dishes = entry.meals?.[m] || [];
    dishes.forEach(d => {
      summaryData.push([
        m.toUpperCase(),
        d.dish,
        `${d.serving} ${d.servingUnit || 'ml'}`,
        `${d.requiredYield} ${d.yieldUnit || 'L'}`,
        parseFloat(formatNumber(d.totalCost, 2)),
        parseFloat(formatNumber(d.adjustedCost ?? d.totalCost, 2))
      ]);
    });
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 10 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Production Summary');

  // ── Sheet 2: Detailed Recipe Ingredients ──
  const ingRows = [
    [
      'Meal',
      'Recipe Name',
      'Required Yield',
      'Ingredient Name',
      'Standard Qty',
      'Calculated Qty',
      'Final Qty',
      'Real Qty',
      'Unit',
      'Rate (₹)',
      'Estimated Amount (₹)',
      'Cooking Step (विधि)'
    ]
  ];

  meals.forEach(m => {
    const dishes = entry.meals?.[m] || [];
    dishes.forEach(d => {
      (d.ingredients || []).forEach(ing => {
        ingRows.push([
          m.toUpperCase(),
          d.dish,
          `${d.requiredYield} ${d.yieldUnit || 'L'}`,
          ing.name,
          ing.standardQty,
          parseFloat(formatNumber(ing.calculatedQty ?? ing.requiredQty, 2)),
          parseFloat(formatNumber(ing.finalQty ?? ing.requiredQty, 2)),
          ing.realQty === '' || ing.realQty === undefined ? '' : parseFloat(formatNumber(ing.realQty, 2)),
          ing.unit,
          ing.rate || 0,
          parseFloat(formatNumber(ing.amount, 2)),
          ing.cookingProcess ||
            (() => {
              const step = d.cookingSteps?.find(item =>
                item.ingredient === ing.name || item.ingredients?.includes(ing.name)
              );
              if (!step) return '-';
              if (step.english || step.hindi) return [step.english, step.hindi].filter(Boolean).join('\n');
              return step.text || '-';
            })()
        ]);
      });
    });
  });

  const wsIngredients = XLSX.utils.aoa_to_sheet(ingRows);
  wsIngredients['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 20 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, wsIngredients, 'Recipe Ingredients');

  const fileName = `Kitchen_Production_${entry.date || 'Sheet'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export full history of all production sheets into a master Excel file
 */
export function exportAllHistoryToExcel(historyList) {
  if (!historyList || historyList.length === 0) return;

  const wb = XLSX.utils.book_new();

  // Master Summary Sheet
  const masterRows = [
    [
      'Date',
      'Day of Week',
      'Total Headcount',
      'Chargeable Headcount',
      'Temple (Free) Headcount',
      'Breakfast Dishes',
      'Lunch Dishes',
      'Dinner Dishes',
      'Ingredient Cost (₹)',
      'Adjusted Cost (₹)',
      'Generated Timestamp'
    ]
  ];

  historyList.forEach(entry => {
    const dObj = new Date(entry.date + 'T00:00:00');
    const dayName = dObj.toLocaleDateString('en-IN', { weekday: 'long' });

    const bDishes = (entry.meals?.breakfast || []).map(d => d.dish).join(', ') || '-';
    const lDishes = (entry.meals?.lunch || []).map(d => d.dish).join(', ') || '-';
    const dDishes = (entry.meals?.dinner || []).map(d => d.dish).join(', ') || '-';

    masterRows.push([
      entry.date,
      dayName,
      entry.totalPeople || 0,
      entry.chargeablePeople || 0,
      entry.nonChargeablePeople || 0,
      bDishes,
      lDishes,
      dDishes,
      parseFloat(formatNumber(entry.totalCost, 2)),
      parseFloat(formatNumber(entry.adjustedCost ?? entry.totalCost, 2)),
      entry.generatedAt ? new Date(entry.generatedAt).toLocaleString('en-IN') : '-'
    ]);
  });

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  wsMaster['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 32 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All Production History');

  // Consolidated Ingredients Sheet
  const allIngRows = [
    [
      'Production Date',
      'Meal',
      'Recipe Name',
      'Required Yield',
      'Ingredient Name',
      'Calculated Qty',
      'Final Qty',
      'Real Qty',
      'Unit',
      'Rate (₹)',
      'Amount (₹)'
    ]
  ];

  const meals = ['breakfast', 'lunch', 'dinner'];
  historyList.forEach(entry => {
    meals.forEach(m => {
      const dishes = entry.meals?.[m] || [];
      dishes.forEach(d => {
        (d.ingredients || []).forEach(ing => {
          allIngRows.push([
            entry.date,
            m.toUpperCase(),
            d.dish,
            `${d.requiredYield} ${d.yieldUnit || 'L'}`,
            ing.name,
            parseFloat(formatNumber(ing.calculatedQty ?? ing.requiredQty, 2)),
            parseFloat(formatNumber(ing.finalQty ?? ing.requiredQty, 2)),
            ing.realQty === '' || ing.realQty === undefined ? '' : parseFloat(formatNumber(ing.realQty, 2)),
            ing.unit,
            ing.rate || 0,
            parseFloat(formatNumber(ing.amount, 2))
          ]);
        });
      });
    });
  });

  const wsAllIng = XLSX.utils.aoa_to_sheet(allIngRows);
  wsAllIng['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 22 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAllIng, 'All Ingredients');

  XLSX.writeFile(wb, 'Kitchen_Production_History_All.xlsx');
}
