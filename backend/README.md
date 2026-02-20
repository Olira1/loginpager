# Fortune Cookie Backend with MySQL

Express API with MySQL authentication and fortune cookie messages.

## Local Development Setup

1. Install MySQL and create database:
```bash
mysql -u root -p < init-db.sql
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=fortune_cookie_db
JWT_SECRET=your_random_secret_key
```

4. Install dependencies:
```bash
npm install
```

5. Start server:
```bash
npm start
```

## API Endpoints

- `POST /api/signup` - Register new user
- `POST /api/login` - Login user
- `GET /api/fortune` - Get random fortune (requires auth token)
- `GET /health` - Health check

## Deploy to Render with MySQL

### Option 1: Render PostgreSQL (Recommended - Free tier available)

Render doesn't offer MySQL, but PostgreSQL works great. Update `db.js` to use PostgreSQL instead.

### Option 2: External MySQL (Railway, PlanetScale, etc.)

1. Create MySQL database on Railway or PlanetScale
2. Get connection details
3. In Render Dashboard → Environment, add:
   - `DB_HOST` - Your MySQL host
   - `DB_USER` - Your MySQL user
   - `DB_PASSWORD` - Your MySQL password
   - `DB_NAME` - Your database name
   - `JWT_SECRET` - Random secret string
   - `FRONTEND_URL` - Your Vercel URL

4. Deploy

### Option 3: Use PostgreSQL on Render (Easiest)

I can convert the code to use PostgreSQL if you prefer - it's free on Render!
