const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL = '#$@!%*?&';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL;

/**
 * Generate a cryptographically random password.
 * Guarantees at least 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 * @param {number} length - Password length (default: 12)
 * @returns {string} Plain text password
 */
const generatePassword = (length = 12) => {
  const required = [
    UPPERCASE[crypto.randomInt(UPPERCASE.length)],
    LOWERCASE[crypto.randomInt(LOWERCASE.length)],
    DIGITS[crypto.randomInt(DIGITS.length)],
    SPECIAL[crypto.randomInt(SPECIAL.length)],
  ];

  const remaining = length - required.length;
  for (let i = 0; i < remaining; i++) {
    required.push(ALL_CHARS[crypto.randomInt(ALL_CHARS.length)]);
  }

  // Shuffle using Fisher-Yates
  for (let i = required.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
};

/**
 * Hash a plain text password with bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Validate password meets complexity requirements:
 * min 8 chars, at least 1 uppercase, 1 lowercase, 1 number.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true, message: 'Password meets requirements.' };
};

module.exports = {
  generatePassword,
  hashPassword,
  validatePasswordStrength,
  SALT_ROUNDS,
};
