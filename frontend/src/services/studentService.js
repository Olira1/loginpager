// Student Service - API calls for the Student portal
// All endpoints are under /api/v1/student

import api from './api';

// ============================================================
// PROFILE
// ============================================================

/** GET /student/profile - Get student profile info */
export const getProfile = async () => {
  const response = await api.get('/student/profile');
  return response.data;
};

// ============================================================
// SEMESTER REPORT
// ============================================================

/** GET /student/reports/semester - View semester grade report */
export const getSemesterReport = async ({ semester_id, academic_year_id }) => {
  const response = await api.get('/student/reports/semester', {
    params: { semester_id, academic_year_id },
  });
  return response.data;
};

// ============================================================
// YEAR REPORT
// ============================================================

/** GET /student/reports/year - View year grade report (both semesters) */
export const getYearReport = async ({ academic_year_id }) => {
  const response = await api.get('/student/reports/year', {
    params: { academic_year_id },
  });
  return response.data;
};

// ============================================================
// SUBJECT SCORES LIST (from marks, no published report needed)
// ============================================================

/** GET /student/subjects/scores - List all subjects with scores */
export const listSubjectScores = async ({ semester_id }) => {
  const response = await api.get('/student/subjects/scores', {
    params: { semester_id },
  });
  return response.data;
};

// ============================================================
// SUBJECT GRADES BREAKDOWN
// ============================================================

/** GET /student/subjects/:subject_id/grades - View assessment-level breakdown */
export const getSubjectGrades = async (subjectId, { semester_id }) => {
  const response = await api.get(`/student/subjects/${subjectId}/grades`, {
    params: { semester_id },
  });
  return response.data;
};

// ============================================================
// RANK & COMPARISON
// ============================================================

/** GET /student/rank - View rank and class comparison */
export const getRank = async ({ semester_id, academic_year_id, type = 'semester' }) => {
  const response = await api.get('/student/rank', {
    params: { semester_id, academic_year_id, type },
  });
  return response.data;
};

// ============================================================
// TEACHER REMARKS
// ============================================================

/** GET /student/remarks - View teacher remarks */
export const getRemarks = async ({ semester_id, academic_year_id }) => {
  const response = await api.get('/student/remarks', {
    params: { semester_id, academic_year_id },
  });
  return response.data;
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  getProfile,
  getSemesterReport,
  getYearReport,
  listSubjectScores,
  getSubjectGrades,
  getRank,
  getRemarks,
};
