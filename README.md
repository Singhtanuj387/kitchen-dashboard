# 🍳 Kitchen Dashboard

A comprehensive, production-grade Kitchen Operations & Catering Management Dashboard designed with Apple-style Day Theme aesthetics, tactile feedback, and responsive typography.

Built with **React 19**, **Vite**, and **Vanilla CSS**. Ready for 1-click deployment on **Vercel**.

---

## 🌟 Key Sections & Features

1. **🔥 Daily Kitchen (Operations)**
   - Select any date to view scheduled meals across Breakfast, Lunch, and Dinner.
   - Input actual department headcounts with live totals and billable vs non-chargeable breakdown.
   - Proportional ingredient scaling based on required yield.
   - Step-by-step Hindi cooking processes (विधि).
   - WhatsApp-ready production sheet clipboard export.
   - Printable kitchen sheet layout (`window.print()`).

2. **📦 Master List of Vegetables & Groceries**
   - Centralized inventory management with unit tracking (`Kg`, `L`, `gm`, and `pcs`).
   - Price per unit management and search filter.
   - Add, edit, and delete grocery items.

3. **🍳 Recipes**
   - Dual quantity columns:
     - **Standard Qty (Fixed):** Base standard yield (e.g. 30 L or 100 pcs).
     - **Required Qty (Calculated):** Dynamically scales based on required yield:
       $$\text{Required Qty} = \text{Standard Qty} \times \left(\frac{\text{Required Yield}}{\text{Standard Yield}}\right)$$
   - Step-by-step cooking process in Hindi (विधि).
   - Automated ingredient batch cost calculation.

4. **📅 Monthly Menu**
   - Interactive monthly calendar with color-coded tags for Breakfast (amber), Lunch (emerald), and Dinner (violet).
   - Dish scheduling with adaptive serving quantities (`ml` or `pcs` per person).

5. **🏢 Departments**
   - Manage food distribution departments with default headcounts.
   - Set departments as **Chargeable (Billable)** or **Non-Chargeable (Free / Seva)**:
     - *Temple + KH(10)* is designated non-chargeable (exempt from billing with ₹0 claims).
   - Quick one-click toggle directly on cards, directory table, and edit modal.

6. **💰 Amount Claim (Finance & Billing)**
   - Department billing ledger tracking meal counts, menu costs, and receivables.
   - Status tracking (`Paid`, `Pending`, `Partial`, `Non-Chargeable`).
   - Automatically excludes non-chargeable departments from Grand Total receivables.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/Singhtanuj387/kitchen-dashboard.git
cd kitchen-dashboard

# Navigate to app directory and install dependencies
cd kitchen-app
npm install

# Start Vite development server
npm run dev
```

App runs locally at: `http://localhost:5173/`

---

## 🌐 Deploy to Vercel

The project is pre-configured with `vercel.json` for seamless SPA routing and zero-config deployment.

### Option 1: Vercel Dashboard (Connected to GitHub)
1. Import repository at [vercel.com/new](https://vercel.com/new).
2. Framework Preset: **Vite** (auto-detected).
3. Click **Deploy**.

### Option 2: Vercel CLI
```bash
cd kitchen-app
npx vercel --prod
```

---

## 🛠️ Tech Stack
- **Frontend:** React 19, React Router 7 (`HashRouter`)
- **Build Tool:** Vite 8
- **Styling:** Vanilla CSS (Apple Day Theme design system, glassmorphic surfaces, tactile feedback)
- **Persistence:** LocalStorage with state migrations and default seed data
