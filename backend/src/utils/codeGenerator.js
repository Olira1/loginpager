const { pool } = require('../config/db');

/**
 * Generate a student code in format STU{YEAR}{SEQUENCE}.
 * Auto-increments globally per year.
 * Example: STU202500001
 * @param {number} schoolId
 * @param {number} [year] - Defaults to current year
 * @returns {Promise<string>}
 */
const generateStudentCode = async (schoolId, year) => {
  // Kept for backward compatibility with existing callers.
  void schoolId;
  const y = year || new Date().getFullYear();
  const prefix = `STU${y}`;

  const [rows] = await pool.query(
    `SELECT u.username FROM users u
     WHERE u.username LIKE ?
     ORDER BY u.username DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let sequence = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].username;
    const lastSeq = parseInt(lastCode.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

/**
 * Generate a staff / teacher code in format TCH{YEAR}{SEQUENCE}.
 * Auto-increments globally per year.
 * Example: TCH202500001
 * @param {number} schoolId
 * @param {number} [year] - Defaults to current year
 * @returns {Promise<string>}
 */
const generateStaffCode = async (schoolId, year) => {
  // Kept for backward compatibility with existing callers.
  void schoolId;
  const y = year || new Date().getFullYear();
  const prefix = `TCH${y}`;

  const [rows] = await pool.query(
    `SELECT t.staff_code FROM teachers t
     WHERE t.staff_code LIKE ?
     ORDER BY t.staff_code DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let sequence = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].staff_code;
    const lastSeq = parseInt(lastCode.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

module.exports = {
  generateStudentCode,
  generateStaffCode,
};
