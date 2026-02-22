// Main Express application setup
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware - CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // List of allowed origins - includes environment variable for production
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      process.env.FRONTEND_URL,  // Dynamic frontend URL from environment
      /\.vercel\.app$/  // Allow all Vercel preview deployments
    ].filter(Boolean);  // Remove undefined values
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/v1/auth', require('./src/routes/auth'));
app.use('/api/v1/admin', require('./src/routes/admin'));
app.use('/api/v1/school', require('./src/routes/schoolHead'));
app.use('/api/v1/teacher', require('./src/routes/teacher'));
app.use('/api/v1/class-head', require('./src/routes/classHead'));
app.use('/api/v1/student', require('./src/routes/student'));
app.use('/api/v1/parent', require('./src/routes/parent'));
app.use('/api/v1/store-house', require('./src/routes/storeHouse'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong!'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

module.exports = app;




