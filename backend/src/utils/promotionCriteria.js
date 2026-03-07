/**
 * Shared promotion criteria utilities.
 * Used by Class Head, Student, and Parent controllers for consistent pass/fail logic.
 */

const { pool } = require('../config/db');

/**
 * Get school's passing threshold from promotion_criteria (fallback 50).
 * @param {number|null} schoolId - School ID
 * @returns {Promise<number>} Passing average (e.g. 80)
 */
const getSchoolPassingThreshold = async (schoolId) => {
  if (!schoolId) return 50;
  try {
    const [rows] = await pool.query(
      `SELECT passing_average, passing_per_subject FROM promotion_criteria 
       WHERE school_id = ? AND is_active = 1 
       ORDER BY created_at DESC LIMIT 1`,
      [schoolId]
    );
    if (rows.length === 0) return 50;
    const avg = Number(rows[0].passing_average);
    const perSubj = Number(rows[0].passing_per_subject);
    return (avg != null && !isNaN(avg)) ? avg : ((perSubj != null && !isNaN(perSubj)) ? perSubj : 50);
  } catch (err) {
    console.warn('Could not load promotion criteria, using default 50:', err.message);
    return 50;
  }
};

module.exports = { getSchoolPassingThreshold };
