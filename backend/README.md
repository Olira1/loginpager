# School Portal Backend

Express.js REST API for the School Portal grade management system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=school_portal
DB_PORT=3306
FRONTEND_URL=http://localhost:5173
```

3. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## Project Structure

```
backend/
  src/
    config/       # DB connection, JWT config
    controllers/  # Route handlers by role
    middleware/   # Auth, role-check, error handler
    models/       # Database queries
    routes/       # API routes by role
    utils/        # Helpers
  app.js          # Express app setup
  server.js       # Server entry point
```

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

See [API Contract](../API%20CONTRACT/apicontract.md) for complete endpoint documentation.




