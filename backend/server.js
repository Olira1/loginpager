// Server entry point
require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Start server and test database connection
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.log('⚠️  Server starting without database connection');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();



