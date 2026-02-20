# Fortune Cookie Frontend

React + Vite + Tailwind CSS frontend for the Fortune Cookie app.

## Local Development

1. Install dependencies (already done):
```bash
npm install
```

2. Start dev server:
```bash
npm run dev
```

3. Make sure backend is running on http://localhost:3000

## Deploy to Vercel

1. Push code to GitHub

2. Go to Vercel Dashboard

3. Click "Add New" → "Project"

4. Import your repository

5. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend/login`
   - Build Command: `npm run build`
   - Output Directory: `dist`

6. Add Environment Variable:
   - Name: `VITE_API_URL`
   - Value: Your Render backend URL (e.g., `https://your-app.onrender.com`)

7. Click "Deploy"

## Update API URL for Production

Before deploying, update `src/App.jsx` line 13 to use environment variable:

```javascript
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fortune`)
```
