# Fortune Cookie Backend

Simple Express API that returns random fortune cookie messages.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Server runs on http://localhost:3000

## API Endpoints

- `GET /api/fortune` - Returns a random fortune
- `GET /health` - Health check endpoint

## Deploy to Render

1. Push code to GitHub
2. Go to Render Dashboard
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - Name: fortune-cookie-api
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Click "Create Web Service"

After deployment, update the frontend API URL to your Render URL.
