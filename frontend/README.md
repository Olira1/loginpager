# School Portal Frontend

React.js frontend application for the School Portal grade management system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
frontend/
  src/
    components/   # Reusable UI components
    pages/        # Pages by role
    services/     # API calls
    context/      # Auth context
    hooks/        # Custom hooks
    utils/        # Helpers
```

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling

## Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:5000/api/v1
```
