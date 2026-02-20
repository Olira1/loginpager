-- Grant all privileges to fortune user
GRANT ALL PRIVILEGES ON fortune.* TO 'fortune'@'%';
FLUSH PRIVILEGES;

-- Create the users table
USE fortune;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
