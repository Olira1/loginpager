// Parent Service - API calls for the Parent portal
// All endpoints are under /api/v1/parent

import api from './api';

// ============================================================
// CHILDREN
// ============================================================

/** GET /parent/children - List all children linked to this parent */
export const listChildren = async () => {
  const response = await api.get('/parent/children');
  return response.data;
};

// ============================================================
// CHILD REPORTS
// ============================================================

/** GET /parent/children/:id/reports/semester - View child's semester report */
export const getChildSemesterReport = async (studentId, { semester_id, academic_year_id }) => {
  const response = await api.get(`/parent/children/${studentId}/reports/semester`, {
    params: { semester_id, academic_year_id },
  });
  return response.data;
};

/** GET /parent/children/:id/reports/year - View child's year report */
export const getChildYearReport = async (studentId, { academic_year_id }) => {
  const response = await api.get(`/parent/children/${studentId}/reports/year`, {
    params: { academic_year_id },
  });
  return response.data;
};

// ============================================================
// CHILD SUBJECTS
// ============================================================

/** GET /parent/children/:id/subjects/scores - List child's subject scores */
export const listChildSubjectScores = async (studentId, { semester_id }) => {
  const response = await api.get(`/parent/children/${studentId}/subjects/scores`, {
    params: { semester_id },
  });
  return response.data;
};

/** GET /parent/children/:id/subjects/:subject_id/grades - View child's subject breakdown */
export const getChildSubjectGrades = async (studentId, subjectId, { semester_id }) => {
  const response = await api.get(`/parent/children/${studentId}/subjects/${subjectId}/grades`, {
    params: { semester_id },
  });
  return response.data;
};

// ============================================================
// CHILD RANK
// ============================================================

/** GET /parent/children/:id/rank - View child's rank and comparison */
export const getChildRank = async (studentId, { semester_id, academic_year_id, type = 'semester' }) => {
  const response = await api.get(`/parent/children/${studentId}/rank`, {
    params: { semester_id, academic_year_id, type },
  });
  return response.data;
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  listChildren,
  getChildSemesterReport,
  getChildYearReport,
  listChildSubjectScores,
  getChildSubjectGrades,
  getChildRank,
};
