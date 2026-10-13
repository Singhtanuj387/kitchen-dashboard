/**
 * Data Store — localStorage-based with Firebase sync capability
 * Works offline immediately. Firebase sync can be enabled by configuring firebase.js
 */

import {
  syncDocToFirestore,
  fetchDocFromFirestore,
  isFirebaseConfigured,
  listenDocFirestore
} from './firebase';

const STORAGE_KEYS = {
  MASTER_LIST: 'kd_master_list',
  RECIPES: 'kd_recipes',
  MONTHLY_MENU: 'kd_monthly_menu',
  DEPARTMENTS: 'kd_departments',
  DAILY_KITCHEN: 'kd_daily_kitchen',
  AMOUNT_CLAIMS: 'kd_amount_claims',
  RECIPE_HISTORY: 'kd_recipe_history',
};

// ── Helper Functions ──
function loadFromStorage(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  // Asynchronously mirror to Firestore if configured
  if (isFirebaseConfigured()) {
    syncDocToFirestore('kitchen_data', key, data).catch(err => {
      console.warn(`[Firestore Sync] Failed for ${key}:`, err);
    });
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Default Data ──
const DEFAULT_MASTER_LIST = [
  { id: generateId(), name: 'Alu (Potato)', unit: 'L', pricePerUnit: 30 },
  { id: generateId(), name: 'Bagan (Eggplant)', unit: 'L', pricePerUnit: 40 },
  { id: generateId(), name: 'Badi', unit: 'Kg', pricePerUnit: 120 },
  { id: generateId(), name: 'Tomato Chopped', unit: 'L', pricePerUnit: 35 },
  { id: generateId(), name: 'Sarso Tel', unit: 'L', pricePerUnit: 180 },
  { id: generateId(), name: 'Tejpatta', unit: 'gm', pricePerUnit: 1.5 },
  { id: generateId(), name: 'Sukha Mircha', unit: 'gm', pricePerUnit: 0.8 },
  { id: generateId(), name: 'Panchforan', unit: 'gm', pricePerUnit: 0.6 },
  { id: generateId(), name: 'Hing', unit: 'gm', pricePerUnit: 3 },
  { id: generateId(), name: 'G Chilli (Green)', unit: 'gm', pricePerUnit: 0.3 },
  { id: generateId(), name: 'Ginger', unit: 'gm', pricePerUnit: 0.2 },
  { id: generateId(), name: 'Gota Jeera', unit: 'gm', pricePerUnit: 1.2 },
  { id: generateId(), name: 'Golki', unit: 'gm', pricePerUnit: 0.5 },
  { id: generateId(), name: 'Haldi', unit: 'gm', pricePerUnit: 0.4 },
  { id: generateId(), name: 'K Red Chilli', unit: 'gm', pricePerUnit: 0.7 },
  { id: generateId(), name: 'Gota Sarso', unit: 'gm', pricePerUnit: 0.5 },
  { id: generateId(), name: 'Everest Garam Masala', unit: 'gm', pricePerUnit: 1.5 },
  { id: generateId(), name: 'Dhaniya Patta', unit: 'L', pricePerUnit: 20 },
  { id: generateId(), name: 'Rice', unit: 'Kg', pricePerUnit: 45 },
  { id: generateId(), name: 'Dal (Arhar)', unit: 'Kg', pricePerUnit: 140 },
  { id: generateId(), name: 'Jeera', unit: 'gm', pricePerUnit: 1.5 },
  { id: generateId(), name: 'Onion', unit: 'Kg', pricePerUnit: 30 },
  { id: generateId(), name: 'Soyabean Oil', unit: 'L', pricePerUnit: 120 },
  { id: generateId(), name: 'Salt', unit: 'Kg', pricePerUnit: 20 },
  { id: generateId(), name: 'Sugar', unit: 'Kg', pricePerUnit: 45 },
  { id: generateId(), name: 'Drumstick (Sahjan)', unit: 'Kg', pricePerUnit: 50 },
  { id: generateId(), name: 'Sambhar Masala', unit: 'gm', pricePerUnit: 1.8 },
  { id: generateId(), name: 'Rai (Mustard Seeds)', unit: 'gm', pricePerUnit: 0.6 },
  { id: generateId(), name: 'Curry Leaves', unit: 'gm', pricePerUnit: 0.5 },
  { id: generateId(), name: 'Imli (Tamarind)', unit: 'gm', pricePerUnit: 0.8 },
  { id: generateId(), name: 'Lemon (Nimbu)', unit: 'pcs', pricePerUnit: 5 },
  { id: generateId(), name: 'Dry Coconut (Nariyal)', unit: 'pcs', pricePerUnit: 35 },
  { id: generateId(), name: 'Papad', unit: 'pcs', pricePerUnit: 2.5 },
  { id: generateId(), name: 'Banana (Kela)', unit: 'pcs', pricePerUnit: 6 },
  { id: generateId(), name: 'Bread Loaf', unit: 'pcs', pricePerUnit: 40 },
];

const DEFAULT_RECIPES = [
  {
    id: 'rec_alu_bagan',
    name: 'Alu Bagan Badi',
    standardYield: 30,
    yieldUnit: 'L',
    ingredients: [
      { name: 'Alu', standardQty: 15, unit: 'L', cookingProcess: 'सबसे पहले हम आलू को तेल में रोस्ट करेंगे। फिर बचे हुए तेल में बड़ी को रोस्ट करके निकाल लेंगे।' },
      { name: 'Bagan', standardQty: 45, unit: 'L', cookingProcess: '' },
      { name: 'Badi', standardQty: 1, unit: 'Kg', cookingProcess: '' },
      { name: 'Tomato Chopped', standardQty: 2, unit: 'L', cookingProcess: '' },
      { name: 'Sarso Tel', standardQty: 0.8, unit: 'L', cookingProcess: 'बचे हुए तेल में तेल और डालेंगे। इसके बाद तेजपत्ता, सूखी मिर्च, फोड़न और हींग डालेंगे।' },
      { name: 'Tejpatta', standardQty: 6, unit: 'gm', cookingProcess: '' },
      { name: 'Sukha Mircha', standardQty: 10, unit: 'gm', cookingProcess: '' },
      { name: 'Panchforan', standardQty: 40, unit: 'gm', cookingProcess: '' },
      { name: 'Hing', standardQty: 20, unit: 'gm', cookingProcess: '' },
      { name: 'G Chilli', standardQty: 90, unit: 'gm', cookingProcess: 'हरी मिर्च, अदरक, जीरा, गोलकी, हल्दी, लाल मिर्च और सरसों को मिक्सी में पीसकर पेस्ट बनाएँगे। इस पेस्ट को छौंक में डालकर 10 मिनट धीमी आँच पर पकाएँगे। जब मसाला तेल छोड़ दे, तब कटे बैंगन और टमाटर डाल देंगे।' },
      { name: 'Ginger', standardQty: 150, unit: 'gm', cookingProcess: '' },
      { name: 'Gota Jeera', standardQty: 30, unit: 'gm', cookingProcess: '' },
      { name: 'Golki', standardQty: 20, unit: 'gm', cookingProcess: '' },
      { name: 'Haldi', standardQty: 40, unit: 'gm', cookingProcess: '' },
      { name: 'K Red Chilli', standardQty: 30, unit: 'gm', cookingProcess: '' },
      { name: 'Gota Sarso', standardQty: 15, unit: 'gm', cookingProcess: '' },
      { name: 'Everest Garam Masala', standardQty: 40, unit: 'gm', cookingProcess: 'अंत में रोस्ट किए हुए आलू और क्रश की हुई बड़ी डालेंगे। इसके बाद गरम मसाला और धनिया पत्ता डालकर अच्छी तरह मिलाएँगे और 5 मिनट तक पकाएँगे।' },
      { name: 'Dhaniya Patta', standardQty: 2, unit: 'L', cookingProcess: '' },
    ],
  },
  {
    id: 'rec_jeera_rice',
    name: 'Jeera Rice',
    standardYield: 30,
    yieldUnit: 'L',
    ingredients: [
      { name: 'Rice', standardQty: 8, unit: 'Kg', cookingProcess: 'चावल को अच्छी तरह धोकर 30 मिनट पानी में भिगो दें।' },
      { name: 'Soyabean Oil', standardQty: 0.5, unit: 'L', cookingProcess: '' },
      { name: 'Jeera', standardQty: 60, unit: 'gm', cookingProcess: 'पतीले में तेल गरम करें, जीरा डालें। जीरा चटकने पर भीगा हुआ चावल और नापकर पानी डालें। स्वादानुसार नमक मिलाकर मध्यम आँच पर ढककर पकाएँ।' },
      { name: 'Salt', standardQty: 100, unit: 'gm', cookingProcess: '' },
    ],
  },
  {
    id: 'rec_dal_fry',
    name: 'Dal Fry',
    standardYield: 30,
    yieldUnit: 'L',
    ingredients: [
      { name: 'Dal (Arhar)', standardQty: 5, unit: 'Kg', cookingProcess: 'अरहर दाल को धोकर हल्दी और नमक के साथ प्रेशर कुकर में 4 सीटी तक पका लें।' },
      { name: 'Onion', standardQty: 2, unit: 'Kg', cookingProcess: '' },
      { name: 'Tomato Chopped', standardQty: 2, unit: 'L', cookingProcess: '' },
      { name: 'Soyabean Oil', standardQty: 0.5, unit: 'L', cookingProcess: 'कड़ाही में तेल गरम करके जीरा, कटा प्याज और टमाटर भूनें। लाल मिर्च और गरम मसाला डालें। पकी हुई दाल डालकर 10 मिनट तक उबालें।' },
      { name: 'Jeera', standardQty: 30, unit: 'gm', cookingProcess: '' },
      { name: 'Haldi', standardQty: 20, unit: 'gm', cookingProcess: '' },
      { name: 'K Red Chilli', standardQty: 20, unit: 'gm', cookingProcess: '' },
      { name: 'Salt', standardQty: 100, unit: 'gm', cookingProcess: '' },
      { name: 'Dhaniya Patta', standardQty: 1, unit: 'L', cookingProcess: 'गैस बंद करके ऊपर से बारीक कटा हरा धनिया पत्ता डालकर मिलाएँ।' },
    ],
  },
  {
    id: 'rec_sambhar',
    name: 'Sambhar',
    standardYield: 30,
    yieldUnit: 'L',
    ingredients: [
      { name: 'Dal (Arhar)', standardQty: 4, unit: 'Kg', cookingProcess: 'अरहर दाल और कटी हुई सहजन को हल्दी-नमक के साथ कुकर में उबाल लें।' },
      { name: 'Drumstick (Sahjan)', standardQty: 2, unit: 'Kg', cookingProcess: '' },
      { name: 'Tomato Chopped', standardQty: 3, unit: 'L', cookingProcess: '' },
      { name: 'Onion', standardQty: 2, unit: 'Kg', cookingProcess: 'तेल में राई, सूखी मिर्च, हींग और करी पत्ता का तड़का लगाएँ। प्याज और टमाटर डालकर नरम होने तक भूनें।' },
      { name: 'Sarso Tel', standardQty: 0.5, unit: 'L', cookingProcess: '' },
      { name: 'Rai (Mustard Seeds)', standardQty: 30, unit: 'gm', cookingProcess: '' },
      { name: 'Curry Leaves', standardQty: 20, unit: 'gm', cookingProcess: '' },
      { name: 'Hing', standardQty: 15, unit: 'gm', cookingProcess: '' },
      { name: 'Sambhar Masala', standardQty: 100, unit: 'gm', cookingProcess: 'सांभर मसाला और इमली का पल्प डालें। उबली हुई दाल मिलाकर 10-15 मिनट तक धीमी आँच पर पकाएँ।' },
      { name: 'Imli (Tamarind)', standardQty: 150, unit: 'gm', cookingProcess: '' },
      { name: 'Salt', standardQty: 120, unit: 'gm', cookingProcess: '' },
    ],
  },
  {
    id: 'rec_crispy_papad',
    name: 'Masala Papad & Lemon',
    standardYield: 100,
    yieldUnit: 'pcs',
    ingredients: [
      { name: 'Papad', standardQty: 100, unit: 'pcs', cookingProcess: 'पापड़ को धीमी आँच पर या तवे पर दोनों तरफ से क्रिस्पी होने तक रोस्ट करें।' },
      { name: 'Lemon (Nimbu)', standardQty: 25, unit: 'pcs', cookingProcess: 'नींबू को काटकर पापड़ पर निचोड़ें और ऊपर से बारीक कटा धनिया पत्ता व मसाला छिड़कें।' },
      { name: 'Tomato Chopped', standardQty: 1, unit: 'L', cookingProcess: '' },
      { name: 'Dhaniya Patta', standardQty: 0.5, unit: 'L', cookingProcess: '' },
      { name: 'Salt', standardQty: 50, unit: 'gm', cookingProcess: '' },
    ],
  },
];

const DEFAULT_DEPARTMENTS = [
  { id: 'dept_temple', name: 'Temple', defaultCount: 60, isChargeable: false },
  { id: 'dept_abhay', name: 'Abhay Hostel', defaultCount: 35, isChargeable: true },
  { id: 'dept_bit', name: 'BIT Voice', defaultCount: 7, isChargeable: true },
  { id: 'dept_congregation', name: 'Congregation', defaultCount: 45, isChargeable: true },
];

function buildDefaultMonthMenu() {
  const menu = {};
  for (let day = 1; day <= 31; day++) {
    const isSambharDay = day % 2 === 0;
    menu[day] = {
      breakfast: [
        { dish: 'Dal Fry', serving: 200 },
      ],
      lunch: [
        { dish: isSambharDay ? 'Sambhar' : 'Alu Bagan Badi', serving: 200 },
        { dish: 'Jeera Rice', serving: 400 },
        { dish: isSambharDay ? 'Alu Bagan Badi' : 'Dal Fry', serving: 250 },
      ],
      dinner: [
        { dish: 'Alu Bagan Badi', serving: 200 },
        { dish: 'Jeera Rice', serving: 350 },
      ],
    };
  }
  return menu;
}

const DEFAULT_AMOUNT_CLAIMS = [
  {
    id: generateId(),
    date: '2026-10-11',
    dept: 'Temple',
    menu: 'Jeera Rice, Sambhar',
    menuCost: 0,
    count: 50,
    paymentStatus: 'Non-Chargeable',
  },
  {
    id: generateId(),
    date: '2026-10-12',
    dept: 'Abhay Hostel',
    menu: 'Alu Bagan Badi, Jeera Rice',
    menuCost: 75,
    count: 35,
    paymentStatus: 'Pending',
  },
  {
    id: generateId(),
    date: '2026-10-13',
    dept: 'Congregation',
    menu: 'Dal Fry, Jeera Rice',
    menuCost: 65,
    count: 45,
    paymentStatus: 'Partial',
  },
  {
    id: generateId(),
    date: '2026-10-13',
    dept: 'BIT Voice',
    menu: 'Special Thali, Sambhar',
    menuCost: 90,
    count: 7,
    paymentStatus: 'Paid',
  },
  {
    id: generateId(),
    date: '2026-10-14',
    dept: 'Temple',
    menu: 'Alu Bagan Badi, Jeera Rice, Dal',
    menuCost: 0,
    count: 60,
    paymentStatus: 'Non-Chargeable',
  },
];

// ── Store API ──

export const store = {
  // ── Master List ──
  getMasterList() {
    const list = loadFromStorage(STORAGE_KEYS.MASTER_LIST);
    if (!list || list.length === 0) {
      saveToStorage(STORAGE_KEYS.MASTER_LIST, DEFAULT_MASTER_LIST);
      return DEFAULT_MASTER_LIST;
    }
    let updated = false;
    DEFAULT_MASTER_LIST.forEach(defaultItem => {
      const exists = list.some(i => i.name.toLowerCase().startsWith(defaultItem.name.toLowerCase()) || defaultItem.name.toLowerCase().startsWith(i.name.toLowerCase()));
      if (!exists) {
        list.push(defaultItem);
        updated = true;
      }
    });
    if (updated) {
      saveToStorage(STORAGE_KEYS.MASTER_LIST, list);
    }
    return list;
  },

  saveMasterList(list) {
    saveToStorage(STORAGE_KEYS.MASTER_LIST, list);
  },

  addMasterItem(item) {
    const list = this.getMasterList();
    const newItem = { ...item, id: generateId() };
    list.push(newItem);
    this.saveMasterList(list);
    return newItem;
  },

  updateMasterItem(id, updates) {
    const list = this.getMasterList();
    const idx = list.findIndex(i => i.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      this.saveMasterList(list);
    }
    return list;
  },

  deleteMasterItem(id) {
    const list = this.getMasterList().filter(i => i.id !== id);
    this.saveMasterList(list);
    return list;
  },

  // ── Recipes ──
  getRecipes() {
    const recipes = loadFromStorage(STORAGE_KEYS.RECIPES);
    if (!recipes || recipes.length === 0) {
      saveToStorage(STORAGE_KEYS.RECIPES, DEFAULT_RECIPES);
      return DEFAULT_RECIPES;
    }
    let updated = false;
    DEFAULT_RECIPES.forEach(dr => {
      if (!recipes.some(r => r.name.toLowerCase() === dr.name.toLowerCase())) {
        recipes.push(dr);
        updated = true;
      }
    });
    if (updated) {
      saveToStorage(STORAGE_KEYS.RECIPES, recipes);
    }
    return recipes;
  },

  saveRecipes(recipes) {
    saveToStorage(STORAGE_KEYS.RECIPES, recipes);
  },

  addRecipe(recipe) {
    const recipes = this.getRecipes();
    const newRecipe = { ...recipe, id: generateId() };
    recipes.push(newRecipe);
    this.saveRecipes(recipes);
    return newRecipe;
  },

  updateRecipe(id, updates) {
    const recipes = this.getRecipes();
    const idx = recipes.findIndex(r => r.id === id);
    if (idx !== -1) {
      recipes[idx] = { ...recipes[idx], ...updates };
      this.saveRecipes(recipes);
    }
    return recipes;
  },

  deleteRecipe(id) {
    const recipes = this.getRecipes().filter(r => r.id !== id);
    this.saveRecipes(recipes);
    return recipes;
  },

  // ── Monthly Menu ──
  getMonthlyMenu(yearMonth) {
    const all = loadFromStorage(STORAGE_KEYS.MONTHLY_MENU, {});
    if (!all[yearMonth] || Object.keys(all[yearMonth]).length === 0) {
      const defaultMenu = buildDefaultMonthMenu();
      all[yearMonth] = defaultMenu;
      saveToStorage(STORAGE_KEYS.MONTHLY_MENU, all);
      return defaultMenu;
    }
    return all[yearMonth];
  },

  saveMonthlyMenu(yearMonth, menu) {
    const all = loadFromStorage(STORAGE_KEYS.MONTHLY_MENU, {});
    all[yearMonth] = menu;
    saveToStorage(STORAGE_KEYS.MONTHLY_MENU, all);
  },

  setDayMenu(yearMonth, day, mealType, dishes) {
    const menu = this.getMonthlyMenu(yearMonth);
    if (!menu[day]) menu[day] = {};
    menu[day][mealType] = dishes;
    this.saveMonthlyMenu(yearMonth, menu);
    return menu;
  },

  // ── Departments ──
  getDepartments() {
    const depts = loadFromStorage(STORAGE_KEYS.DEPARTMENTS);
    if (!depts || depts.length === 0) {
      saveToStorage(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
      return DEFAULT_DEPARTMENTS;
    }
    let updated = false;
    depts.forEach(d => {
      if (d.name.includes('KH(10)')) {
        d.name = 'Temple';
        updated = true;
      }
      if (d.isChargeable === undefined) {
        if (d.name.toLowerCase().includes('temple')) {
          d.isChargeable = false;
        } else {
          d.isChargeable = true;
        }
        updated = true;
      }
    });
    if (updated) {
      saveToStorage(STORAGE_KEYS.DEPARTMENTS, depts);
    }
    return depts;
  },

  saveDepartments(depts) {
    saveToStorage(STORAGE_KEYS.DEPARTMENTS, depts);
  },

  addDepartment(dept) {
    const depts = this.getDepartments();
    const newDept = { ...dept, id: generateId() };
    depts.push(newDept);
    this.saveDepartments(depts);
    return newDept;
  },

  updateDepartment(id, updates) {
    const depts = this.getDepartments();
    const idx = depts.findIndex(d => d.id === id);
    if (idx !== -1) {
      depts[idx] = { ...depts[idx], ...updates };
      this.saveDepartments(depts);
    }
    return depts;
  },

  deleteDepartment(id) {
    const depts = this.getDepartments().filter(d => d.id !== id);
    this.saveDepartments(depts);
    return depts;
  },

  // ── Daily Kitchen ──
  getDailyKitchen(date) {
    const all = loadFromStorage(STORAGE_KEYS.DAILY_KITCHEN, {});
    return all[date] || null;
  },

  saveDailyKitchen(date, data) {
    const all = loadFromStorage(STORAGE_KEYS.DAILY_KITCHEN, {});
    all[date] = data;
    saveToStorage(STORAGE_KEYS.DAILY_KITCHEN, all);
  },

  // ── Amount Claims ──
  getAmountClaims() {
    const claims = loadFromStorage(STORAGE_KEYS.AMOUNT_CLAIMS);
    if (!claims || claims.length === 0) {
      saveToStorage(STORAGE_KEYS.AMOUNT_CLAIMS, DEFAULT_AMOUNT_CLAIMS);
      return DEFAULT_AMOUNT_CLAIMS;
    }
    let updated = false;
    claims.forEach(c => {
      if (c.dept.includes('KH(10)')) {
        c.dept = 'Temple';
        updated = true;
      }
      if (c.dept.toLowerCase().includes('temple')) {
        if (c.paymentStatus !== 'Non-Chargeable' || c.menuCost !== 0) {
          c.paymentStatus = 'Non-Chargeable';
          c.menuCost = 0;
          updated = true;
        }
      }
    });
    if (updated) {
      saveToStorage(STORAGE_KEYS.AMOUNT_CLAIMS, claims);
    }
    return claims;
  },

  saveAmountClaims(claims) {
    saveToStorage(STORAGE_KEYS.AMOUNT_CLAIMS, claims);
  },

  addAmountClaim(claim) {
    const claims = this.getAmountClaims();
    const newClaim = { ...claim, id: generateId() };
    claims.push(newClaim);
    this.saveAmountClaims(claims);
    return newClaim;
  },

  updateAmountClaim(id, updates) {
    const claims = this.getAmountClaims();
    const idx = claims.findIndex(c => c.id === id);
    if (idx !== -1) {
      claims[idx] = { ...claims[idx], ...updates };
      this.saveAmountClaims(claims);
    }
    return claims;
  },

  deleteAmountClaim(id) {
    const claims = this.getAmountClaims().filter(c => c.id !== id);
    this.saveAmountClaims(claims);
    return claims;
  },

  // ── Recipe History ──
  getRecipeHistory() {
    const history = loadFromStorage(STORAGE_KEYS.RECIPE_HISTORY);
    if (!history || history.length === 0) {
      saveToStorage(STORAGE_KEYS.RECIPE_HISTORY, DEFAULT_RECIPE_HISTORY);
      return DEFAULT_RECIPE_HISTORY;
    }
    return history;
  },

  saveRecipeHistory(list) {
    saveToStorage(STORAGE_KEYS.RECIPE_HISTORY, list);
  },

  addRecipeHistory(entry) {
    const list = this.getRecipeHistory();
    const existingIdx = list.findIndex(h => h.date === entry.date);
    const item = { ...entry, id: entry.id || generateId() };
    if (existingIdx !== -1) {
      list[existingIdx] = item;
    } else {
      list.unshift(item);
    }
    this.saveRecipeHistory(list);
    return list;
  },

  deleteRecipeHistory(id) {
    const list = this.getRecipeHistory().filter(h => h.id !== id);
    this.saveRecipeHistory(list);
    return list;
  },

  clearRecipeHistory() {
    this.saveRecipeHistory([]);
    return [];
  },

  // ── Firestore Cloud Synchronization ──
  async syncAllToFirestore() {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase Firestore is not configured yet. Please enter project credentials.');
    }

    const payload = {
      [STORAGE_KEYS.MASTER_LIST]: this.getMasterList(),
      [STORAGE_KEYS.RECIPES]: this.getRecipes(),
      [STORAGE_KEYS.MONTHLY_MENU]: loadFromStorage(STORAGE_KEYS.MONTHLY_MENU, {}),
      [STORAGE_KEYS.DEPARTMENTS]: this.getDepartments(),
      [STORAGE_KEYS.DAILY_KITCHEN]: loadFromStorage(STORAGE_KEYS.DAILY_KITCHEN, {}),
      [STORAGE_KEYS.AMOUNT_CLAIMS]: this.getAmountClaims(),
      [STORAGE_KEYS.RECIPE_HISTORY]: this.getRecipeHistory(),
    };

    const promises = Object.entries(payload).map(([k, v]) => syncDocToFirestore('kitchen_data', k, v));
    await Promise.all(promises);
    return true;
  },

  async pullAllFromFirestore() {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase Firestore is not configured yet.');
    }

    const keys = Object.values(STORAGE_KEYS);
    let updatedCount = 0;
    for (const key of keys) {
      const remoteData = await fetchDocFromFirestore('kitchen_data', key);
      if (remoteData !== null && remoteData !== undefined) {
        localStorage.setItem(key, JSON.stringify(remoteData));
        updatedCount++;
      }
    }
    return updatedCount;
  },

  initLiveFirestoreSync(onRemoteUpdate) {
    if (!isFirebaseConfigured()) return () => {};

    const unsubscribers = [];
    const keys = Object.values(STORAGE_KEYS);

    keys.forEach(key => {
      const unsub = listenDocFirestore('kitchen_data', key, remoteData => {
        if (remoteData !== null && remoteData !== undefined) {
          const currentLocal = localStorage.getItem(key);
          const serializedRemote = JSON.stringify(remoteData);
          if (currentLocal !== serializedRemote) {
            localStorage.setItem(key, serializedRemote);
            if (typeof onRemoteUpdate === 'function') {
              onRemoteUpdate(key, remoteData);
            }
          }
        }
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(fn => fn && fn());
    };
  },
};

const DEFAULT_RECIPE_HISTORY = [
  {
    id: 'hist_20261014',
    date: '2026-10-14',
    dateFormatted: 'Wednesday, 14 Oct 2026',
    generatedAt: '2026-10-13T07:30:00.000Z',
    totalPeople: 147,
    chargeablePeople: 87,
    nonChargeablePeople: 60,
    totalCost: 11240,
    departments: [
      { id: 'dept_temple', name: 'Temple', count: 60, isChargeable: false },
      { id: 'dept_abhay', name: 'Abhay Hostel', count: 35, isChargeable: true },
      { id: 'dept_bit', name: 'BIT Voice', count: 7, isChargeable: true },
      { id: 'dept_congregation', name: 'Congregation', count: 45, isChargeable: true },
    ],
    meals: {
      breakfast: [
        {
          dish: 'Dal Fry',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 1840,
          ingredients: [
            { name: 'Dal (Arhar)', standardQty: 5, requiredQty: 4.83, unit: 'Kg', rate: 140, amount: 676.2 },
            { name: 'Onion', standardQty: 2, requiredQty: 1.93, unit: 'Kg', rate: 30, amount: 57.9 },
            { name: 'Tomato Chopped', standardQty: 2, requiredQty: 1.93, unit: 'L', rate: 35, amount: 67.55 },
            { name: 'Soyabean Oil', standardQty: 0.5, requiredQty: 0.48, unit: 'L', rate: 120, amount: 57.6 },
            { name: 'Jeera', standardQty: 30, requiredQty: 29, unit: 'gm', rate: 1.5, amount: 43.5 },
            { name: 'Haldi', standardQty: 20, requiredQty: 19.33, unit: 'gm', rate: 0.4, amount: 7.73 },
            { name: 'K Red Chilli', standardQty: 20, requiredQty: 19.33, unit: 'gm', rate: 0.7, amount: 13.53 },
            { name: 'Salt', standardQty: 100, requiredQty: 96.67, unit: 'gm', rate: 0.02, amount: 1.93 },
            { name: 'Dhaniya Patta', standardQty: 1, requiredQty: 0.97, unit: 'L', rate: 20, amount: 19.4 },
          ],
          cookingSteps: [
            { stepNumber: 1, ingredient: 'Dal (Arhar)', text: 'अरहर दाल को धोकर हल्दी और नमक के साथ प्रेशर कुकर में 4 सीटी तक पका लें।' },
            { stepNumber: 2, ingredient: 'Soyabean Oil', text: 'कड़ाही में तेल गरम करके जीरा, कटा प्याज और टमाटर भूनें। लाल मिर्च और गरम मसाला डालें। पकी हुई दाल डालकर 10 मिनट तक उबालें।' },
            { stepNumber: 3, ingredient: 'Dhaniya Patta', text: 'गैस बंद करके ऊपर से बारीक कटा हरा धनिया पत्ता डालकर मिलाएँ।' }
          ]
        }
      ],
      lunch: [
        {
          dish: 'Alu Bagan Badi',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 4620,
          ingredients: [
            { name: 'Alu', standardQty: 15, requiredQty: 14.5, unit: 'L', rate: 30, amount: 435 },
            { name: 'Bagan', standardQty: 45, requiredQty: 43.5, unit: 'L', rate: 40, amount: 1740 },
            { name: 'Badi', standardQty: 1, requiredQty: 0.97, unit: 'Kg', rate: 120, amount: 116.4 },
            { name: 'Tomato Chopped', standardQty: 2, requiredQty: 1.93, unit: 'L', rate: 35, amount: 67.55 },
            { name: 'Sarso Tel', standardQty: 0.8, requiredQty: 0.77, unit: 'L', rate: 180, amount: 138.6 },
          ],
          cookingSteps: [
            { stepNumber: 1, ingredient: 'Alu', text: 'सबसे पहले हम आलू को तेल में रोस्ट करेंगे। फिर बचे हुए तेल में बड़ी को रोस्ट करके निकाल लेंगे।' },
            { stepNumber: 2, ingredient: 'Sarso Tel', text: 'बचे हुए तेल में तेल और डालेंगे। इसके बाद तेजपत्ता, सूखी मिर्च, फोड़न और हींग डालेंगे।' },
            { stepNumber: 3, ingredient: 'G Chilli', text: 'मसाला पेस्ट को छौंक में डालकर 10 मिनट धीमी आँच पर पकाएँगे। जब मसाला तेल छोड़ दे, तब कटे बैंगन और टमाटर डाल देंगे।' }
          ]
        },
        {
          dish: 'Jeera Rice',
          serving: 400,
          servingUnit: 'ml',
          requiredYield: 59,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 2880,
          ingredients: [
            { name: 'Rice', standardQty: 8, requiredQty: 15.73, unit: 'Kg', rate: 45, amount: 707.85 },
            { name: 'Soyabean Oil', standardQty: 0.5, requiredQty: 0.98, unit: 'L', rate: 120, amount: 117.6 },
            { name: 'Jeera', standardQty: 60, requiredQty: 118, unit: 'gm', rate: 1.5, amount: 177 },
          ],
          cookingSteps: [
            { stepNumber: 1, ingredient: 'Rice', text: 'चावल को अच्छी तरह धोकर 30 मिनट पानी में भिगो दें।' },
            { stepNumber: 2, ingredient: 'Jeera', text: 'पतीले में तेल गरम करें, जीरा डालें। भीगा हुआ चावल और नापकर पानी डालें।' }
          ]
        }
      ],
      dinner: [
        {
          dish: 'Alu Bagan Badi',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 4620,
          ingredients: [
            { name: 'Alu', standardQty: 15, requiredQty: 14.5, unit: 'L', rate: 30, amount: 435 },
            { name: 'Bagan', standardQty: 45, requiredQty: 43.5, unit: 'L', rate: 40, amount: 1740 },
          ],
          cookingSteps: [
            { stepNumber: 1, ingredient: 'Alu', text: 'सबसे पहले हम आलू को तेल में रोस्ट करेंगे।' }
          ]
        }
      ]
    }
  },
  {
    id: 'hist_20261013',
    date: '2026-10-13',
    dateFormatted: 'Tuesday, 13 Oct 2026',
    generatedAt: '2026-10-12T07:30:00.000Z',
    totalPeople: 147,
    chargeablePeople: 87,
    nonChargeablePeople: 60,
    totalCost: 10450,
    departments: [
      { id: 'dept_temple', name: 'Temple', count: 60, isChargeable: false },
      { id: 'dept_abhay', name: 'Abhay Hostel', count: 35, isChargeable: true },
      { id: 'dept_bit', name: 'BIT Voice', count: 7, isChargeable: true },
      { id: 'dept_congregation', name: 'Congregation', count: 45, isChargeable: true },
    ],
    meals: {
      breakfast: [
        {
          dish: 'Dal Fry',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 1840,
          ingredients: [
            { name: 'Dal (Arhar)', standardQty: 5, requiredQty: 4.83, unit: 'Kg', rate: 140, amount: 676.2 },
          ],
          cookingSteps: []
        }
      ],
      lunch: [
        {
          dish: 'Sambhar',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 3200,
          ingredients: [
            { name: 'Dal (Arhar)', standardQty: 4, requiredQty: 3.87, unit: 'Kg', rate: 140, amount: 541.8 },
            { name: 'Drumstick (Sahjan)', standardQty: 2, requiredQty: 1.93, unit: 'Kg', rate: 50, amount: 96.5 },
          ],
          cookingSteps: []
        },
        {
          dish: 'Jeera Rice',
          serving: 400,
          servingUnit: 'ml',
          requiredYield: 59,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 2880,
          ingredients: [],
          cookingSteps: []
        }
      ],
      dinner: [
        {
          dish: 'Alu Bagan Badi',
          serving: 200,
          servingUnit: 'ml',
          requiredYield: 29,
          yieldUnit: 'L',
          standardYield: 30,
          totalCost: 4620,
          ingredients: [],
          cookingSteps: []
        }
      ]
    }
  }
];

// ── Calculation Helpers ──
export function calculateRequiredQty(standardQty, requiredYield, standardYield) {
  if (!standardYield || standardYield === 0) return 0;
  return standardQty * (requiredYield / standardYield);
}

export function findMasterItem(ingredientName, masterList) {
  if (!ingredientName || !masterList) return null;
  const cleanName = ingredientName.trim().toLowerCase();
  // Exact or startsWith either way
  return masterList.find(m => {
    const mName = m.name.toLowerCase();
    return mName === cleanName ||
           mName.startsWith(cleanName) ||
           cleanName.startsWith(mName) ||
           mName.split(' ')[0] === cleanName.split(' ')[0];
  }) || null;
}

export function calculateIngredientCost(requiredQty, pricePerUnit) {
  return requiredQty * pricePerUnit;
}

export function calculateTotalRecipeCost(recipe, requiredYield, masterList) {
  let total = 0;
  for (const ing of recipe.ingredients) {
    const reqQty = calculateRequiredQty(ing.standardQty, requiredYield, recipe.standardYield);
    const masterItem = findMasterItem(ing.name, masterList);
    if (masterItem) {
      total += reqQty * masterItem.pricePerUnit;
    }
  }
  return total;
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num === 0) return '0';
  if (Number.isInteger(num)) return num.toString();
  return Number(num).toFixed(decimals);
}

export function getDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

export function getYearMonth(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
