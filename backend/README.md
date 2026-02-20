# Fortune Cookie Backend with MySQL/TiDB

Express API with MySQL authentication and fortune cookie messages.

## Local Development (MAMP)

1. Start MAMP and ensure MySQL is running

2. Create database and user in phpMyAdmin:
```sql
CREATE DATABASE fortune;
CREATE USER 'fortune'@'localhost' IDENTIFIED BY '1234t';
GRANT ALL PRIVILEGES ON fortune.* TO 'fortune'@'localhost';
FLUSH PRIVILEGES;

USE fortune;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

3. Your `.env` file should have MAMP settings:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=fortune
DB_PASSWORD=1234t
DB_NAME=fortune
DB_SSL=false
```

4. Install and run:
```bash
npm install
npm start
```

## Production Deployment (Render + TiDB)

### TiDB Setup
1. Create TiDB Serverless cluster at https://tidbcloud.com
2. Create users table (same SQL as above)
3. Get connection details from TiDB Console

### Render Deployment
1. Push code to GitHub
2. Create Web Service on Render
3. Set Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `npm start`

### Environment Variables (Render)
Add these in Render Dashboard → Environment:
- `DB_HOST` - TiDB host (e.g., gateway01.eu-central-1.prod.aws.tidbcloud.com)
- `DB_PORT` - `4000`
- `DB_USER` - TiDB username
- `DB_PASSWORD` - TiDB password
- `DB_NAME` - `test`
- `DB_SSL` - `true`
- `JWT_SECRET` - Random secret string
- `FRONTEND_URL` - Your Vercel URL (e.g., https://loginpager.vercel.app)

## API Endpoints

- `POST /api/signup` - Register new user (email, password)
- `POST /api/login` - Login user (returns JWT token)
- `GET /api/fortune` - Get random fortune (requires Authorization header)
- `GET /health` - Health check

## Useful Scripts

- `npm start` - Start server
- `node test-db.js` - Test database connection
- `node check-users.js` - List all users in database
