import { useState, useMemo } from 'react';
import { store, calculateRequiredQty, formatNumber, findMasterItem } from '../store';

export default function Recipes() {
  const [recipes, setRecipes] = useState(() => store.getRecipes());
  const [selectedRecipe, setSelectedRecipe] = useState(() => {
    const list = store.getRecipes();
    return list.length > 0 ? list[0] : null;
  });
  const [requiredYield, setRequiredYield] = useState(() => {
    const list = store.getRecipes();
    if (list.length > 0 && list[0].name.includes('Alu Bagan')) return '20';
    return list.length > 0 ? list[0].standardYield.toString() : '20';
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);

  const [units, setUnits] = useState(() => store.getUnits());

  // Form state for new recipe
  const [recipeForm, setRecipeForm] = useState({
    name: '', standardYield: '30', yieldUnit: 'L', ingredients: []
  });
  const [ingForm, setIngForm] = useState({
    name: '', standardQty: '', unit: 'gm', cookingProcess: ''
  });

  const masterList = store.getMasterList();

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => r.name.toLowerCase().includes(searchFilter.toLowerCase()));
  }, [recipes, searchFilter]);

  function openRecipe(recipe) {
    setSelectedRecipe(recipe);
    // If opening Alu Bagan Badi, default to 20 for the user's example, else standard yield
    if (recipe.name.includes('Alu Bagan')) {
      setRequiredYield('20');
    } else {
      setRequiredYield(recipe.standardYield.toString());
    }
  }

  function openNewRecipe() {
    setUnits(store.getUnits());
    setRecipeForm({ name: '', standardYield: '30', yieldUnit: 'L', ingredients: [] });
    setShowModal(true);
  }

  function handleSelectMasterItem(e) {
    const selectedName = e.target.value;
    const item = masterList.find(m => m.name === selectedName);
    if (item) {
      setIngForm(prev => ({
        ...prev,
        name: item.name,
        unit: item.unit,
      }));
    }
  }

  function addIngredientToForm() {
    if (!ingForm.name.trim() || !ingForm.standardQty) return;
    setRecipeForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        name: ingForm.name.trim(),
        standardQty: parseFloat(ingForm.standardQty),
        unit: ingForm.unit,
        cookingProcess: ingForm.cookingProcess.trim(),
      }]
    }));
    setIngForm({ name: '', standardQty: '', unit: 'gm', cookingProcess: '' });
    setShowAddIngredient(false);
  }

  function removeIngredientFromForm(idx) {
    setRecipeForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  }

  function saveRecipe() {
    if (!recipeForm.name.trim() || !recipeForm.standardYield || recipeForm.ingredients.length === 0) return;
    const data = {
      name: recipeForm.name.trim(),
      standardYield: parseFloat(recipeForm.standardYield),
      yieldUnit: recipeForm.yieldUnit,
      ingredients: recipeForm.ingredients,
    };
    const created = store.addRecipe(data);
    const updatedList = store.getRecipes();
    setRecipes(updatedList);
    setSelectedRecipe(created);
    setRequiredYield(created.standardYield.toString());
    setShowModal(false);
  }

  function deleteRecipe(id) {
    const updated = store.deleteRecipe(id);
    setRecipes(updated);
    if (selectedRecipe && selectedRecipe.id === id) {
      setSelectedRecipe(updated.length > 0 ? updated[0] : null);
      if (updated.length > 0) setRequiredYield(updated[0].standardYield.toString());
    }
  }

  const reqYield = parseFloat(requiredYield) || 0;

  // Group cooking steps from selected recipe
  function getCookingSteps(recipe) {
    return recipe.ingredients
      .filter(ing => ing.cookingProcess && ing.cookingProcess.trim())
      .map((ing, idx) => ({
        stepNumber: idx + 1,
        text: ing.cookingProcess,
        ingredient: ing.name,
      }));
  }

  // Calculate total cost for selected recipe
  function getRecipeCost(recipe, yield_) {
    let total = 0;
    for (const ing of recipe.ingredients) {
      const rq = calculateRequiredQty(ing.standardQty, yield_, recipe.standardYield);
      const master = findMasterItem(ing.name, masterList);
      if (master) {
        total += rq * master.pricePerUnit;
      }
    }
    return total;
  }

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1>Recipes</h1>
            <p>Master base recipes with dual quantity columns (Standard Qty & Calculated Required Qty), Hindi cooking steps, and automated costing.</p>
          </div>
          <button className="btn btn-primary" onClick={openNewRecipe}>
            + Create Recipe
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRecipe ? '320px 1fr' : '1fr', gap: 'var(--space-xl)' }}>
        {/* Left Column: Recipe Selection List */}
        <div className="animate-in-delayed">
          <div className="card">
            <div className="card-header">
              <h2>All Recipes ({recipes.length})</h2>
            </div>
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search recipes..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div style={{ maxHeight: 'calc(100vh - 330px)', overflowY: 'auto' }}>
              {filteredRecipes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🍳</div>
                  <h3>No recipes found</h3>
                  <p>Try a different keyword or create a new recipe.</p>
                </div>
              ) : (
                filteredRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => openRecipe(recipe)}
                    className="recipe-list-item"
                    style={{
                      padding: 'var(--space-lg)',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: selectedRecipe?.id === recipe.id ? 'var(--accent-subtle)' : 'transparent',
                      transition: 'all var(--duration-fast) var(--ease-out)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div style={{ flex: 1, marginRight: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: selectedRecipe?.id === recipe.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {recipe.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                          {recipe.ingredients.length} items · Base Yield: {recipe.standardYield} {recipe.yieldUnit}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '4px 8px', fontSize: 12 }}
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`Delete recipe "${recipe.name}"?`)) {
                            deleteRecipe(recipe.id);
                          }
                        }}
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recipe Detail with Interactive Scaling */}
        {selectedRecipe && (
          <div className="animate-in">
            <div className="card mb-xl">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                  <div className="flex items-center gap-md">
                    <h2>{selectedRecipe.name}</h2>
                    <span className="badge badge-accent">Base Yield: {selectedRecipe.standardYield} {selectedRecipe.yieldUnit}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Formula: Required Qty = Standard Qty × (Required Yield ÷ Standard Yield)
                  </div>
                </div>

                {/* Scaling Input Dial */}
                <div className="flex items-center gap-md">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Required Yield ({selectedRecipe.yieldUnit})</label>
                    <div className="flex items-center gap-sm">
                      <input
                        type="number"
                        className="form-input"
                        value={requiredYield}
                        onChange={e => setRequiredYield(e.target.value)}
                        style={{ width: 110, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}
                        min="0"
                        step="1"
                      />
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedRecipe.yieldUnit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients Table with Dual Quantities */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th className="text-right">Standard Qty (Fixed)</th>
                      <th className="text-right" style={{ color: 'var(--accent)' }}>Required Qty (Calculated)</th>
                      <th>Unit</th>
                      <th className="text-right">Rate (₹)</th>
                      <th className="text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'var(--accent-subtle)' }}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>Yield (Total Batch Volume)</td>
                      <td className="text-right font-mono" style={{ fontWeight: 700 }}>{selectedRecipe.standardYield}</td>
                      <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatNumber(reqYield)}</td>
                      <td><strong>{selectedRecipe.yieldUnit}</strong></td>
                      <td className="text-right font-mono">-</td>
                      <td className="text-right font-mono">-</td>
                    </tr>
                    {selectedRecipe.ingredients.map((ing, idx) => {
                      const calculatedQty = calculateRequiredQty(ing.standardQty, reqYield, selectedRecipe.standardYield);
                      const master = findMasterItem(ing.name, masterList);
                      const rate = master ? master.pricePerUnit : 0;
                      const amount = calculatedQty * rate;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ing.name}</td>
                          <td className="text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{ing.standardQty}</td>
                          <td className="text-right font-mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                            {formatNumber(calculatedQty)}
                          </td>
                          <td><span className="badge badge-neutral">{ing.unit}</span></td>
                          <td className="text-right font-mono" style={{ color: 'var(--text-tertiary)' }}>
                            {rate > 0 ? `₹${rate}` : '-'}
                          </td>
                          <td className="text-right font-mono" style={{ fontWeight: 600, color: amount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {amount > 0 ? `₹${formatNumber(amount)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <td colSpan={5} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        Total Recipe Cost (at {formatNumber(reqYield)} {selectedRecipe.yieldUnit})
                      </td>
                      <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>
                        ₹{formatNumber(getRecipeCost(selectedRecipe, reqYield))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cooking Process (विधि) */}
              {getCookingSteps(selectedRecipe).length > 0 && (
                <div className="card-body" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🍳</span> Cooking Process (बनाने की विधि)
                  </div>
                  <div className="recipe-steps-list">
                    {getCookingSteps(selectedRecipe).map((step) => (
                      <div key={step.stepNumber} className="recipe-step">
                        <div className="step-number">{step.stepNumber}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 3, fontWeight: 600 }}>
                            {step.ingredient}
                          </div>
                          <div className="step-text">{step.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedRecipe && (
          <div className="card animate-in-delayed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div className="empty-state">
              <div className="empty-state-icon">🍳</div>
              <h3>Select a recipe</h3>
              <p>Choose a recipe from the list to view ingredients, scale quantities, and see cooking steps.</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Recipe Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Recipe</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row mb-lg">
                <div className="form-group">
                  <label className="form-label">Recipe Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alu Dum, Paneer Butter Masala"
                    value={recipeForm.name}
                    onChange={e => setRecipeForm({ ...recipeForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Standard Yield (Base Volume)</label>
                  <div className="flex gap-sm">
                    <input
                      type="number"
                      className="form-input"
                      value={recipeForm.standardYield}
                      onChange={e => setRecipeForm({ ...recipeForm, standardYield: e.target.value })}
                      placeholder="e.g. 30"
                      min="1"
                    />
                    <select
                      className="form-select"
                      style={{ width: 85 }}
                      value={recipeForm.yieldUnit}
                      onChange={e => setRecipeForm({ ...recipeForm, yieldUnit: e.target.value })}
                    >
                      {units.map(u => (
                        <option key={u.id || u.symbol} value={u.symbol}>{u.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Recipe Ingredients Sub-form */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="flex items-center justify-between mb-sm">
                  <label className="form-label" style={{ margin: 0 }}>
                    Ingredients ({recipeForm.ingredients.length})
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddIngredient(true)}
                  >
                    + Add Ingredient
                  </button>
                </div>

                {recipeForm.ingredients.length === 0 ? (
                  <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', fontSize: 13 }}>
                    No ingredients added yet. Click "+ Add Ingredient" above.
                  </div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <table style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="text-right">Qty</th>
                          <th>Unit</th>
                          <th>Cooking Step (Hindi)</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipeForm.ingredients.map((ing, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{ing.name}</td>
                            <td className="text-right font-mono">{ing.standardQty}</td>
                            <td><span className="badge badge-neutral">{ing.unit}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ing.cookingProcess || '—'}</td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => removeIngredientFromForm(i)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Inline Add Ingredient Card */}
              {showAddIngredient && (
                <div style={{ padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid var(--border-medium)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--accent)' }}>
                    Add Ingredient to Recipe
                  </div>
                  <div className="form-row mb-sm">
                    <div className="form-group">
                      <label className="form-label">Pick from Master List or Type</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ingredient name (e.g. Alu, Jeera)"
                        value={ingForm.name}
                        onChange={e => setIngForm({ ...ingForm, name: e.target.value })}
                        list="master-items-datalist"
                      />
                      <datalist id="master-items-datalist">
                        {masterList.map(m => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Standard Qty & Unit</label>
                      <div className="flex gap-sm">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Qty"
                          value={ingForm.standardQty}
                          onChange={e => setIngForm({ ...ingForm, standardQty: e.target.value })}
                          step="any"
                        />
                        <select
                          className="form-select"
                          style={{ width: 85 }}
                          value={ingForm.unit}
                          onChange={e => setIngForm({ ...ingForm, unit: e.target.value })}
                        >
                          {units.map(u => (
                            <option key={u.id || u.symbol} value={u.symbol}>{u.symbol}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="form-group mb-md">
                    <label className="form-label">Cooking Step in Hindi (Optional)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. तेल में डालकर 5 मिनट तक भूनें..."
                      rows={2}
                      value={ingForm.cookingProcess}
                      onChange={e => setIngForm({ ...ingForm, cookingProcess: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-sm justify-between">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddIngredient(false)}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={addIngredientToForm}>
                      Add Item
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={saveRecipe}
                disabled={!recipeForm.name.trim() || !recipeForm.standardYield || recipeForm.ingredients.length === 0}
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
