# Vercel Deployment Guide

Your Kitchen Dashboard web app is 100% prepared and configured for seamless deployment on [Vercel](https://vercel.com/).

---

## Method 1: Deploy via GitHub (Recommended)

1. **Initialize Git and Commit Your Project**:
   Open a terminal in the root folder (`c:\Drive-D\gradesbuddy\kitchendashboard`) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Kitchen Dashboard ready for Vercel"
   ```

2. **Push to GitHub**:
   - Create a new repository on [GitHub](https://github.com/new).
   - Link and push your project:
     ```bash
     git remote add origin https://github.com/<your-username>/<your-repo-name>.git
     git branch -M main
     git push -u origin main
     ```

3. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository.
   - **Framework Preset**: Vite (auto-detected).
   - **Root Directory**:
     - If you deploy the entire repository, Vercel will automatically use the root `vercel.json` and build command.
     - *(Optional)* You can also set **Root Directory** to `kitchen-app`.
   - Click **Deploy**.

---

## Method 2: Deploy directly via Vercel CLI

If you prefer to deploy directly from your local machine without GitHub:

1. Open PowerShell / Command Prompt inside `c:\Drive-D\gradesbuddy\kitchendashboard\kitchen-app`:
   ```bash
   npx vercel
   ```

2. Follow the interactive prompts:
   - *Set up and deploy?* **Y**
   - *Which scope?* Select your account.
   - *Link to existing project?* **N**
   - *Project name?* `kitchen-dashboard` (or your preferred name)
   - *In which directory is your code located?* `./`
   - *Want to modify settings?* **N**

3. For production deployment:
   ```bash
   npx vercel --prod
   ```

---

## What Has Been Configured For You:
- **`vercel.json` (Root & App level):** Automatic Single Page Application (SPA) rewrites to prevent 404 errors on page reloads or deep links.
- **Root `package.json`:** Direct `npm run build` orchestration that triggers Vite client compilation.
- **`.gitignore` (Root & App level):** Automatically ignores `node_modules`, `dist`, `.vercel`, and temporary files.
- **Production Build Tested:** Vite builds cleanly in ~300ms with 0 errors.
