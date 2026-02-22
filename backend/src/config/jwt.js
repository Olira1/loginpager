// JWT Configuration
// Note: dotenv is loaded in server.js before this file

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
};

module.exports = jwtConfig;




