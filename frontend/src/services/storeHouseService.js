// Store House Service - API calls for the Store House portal
// All endpoints are under /api/v1/store-house

import api from './api';

// ============================================================
// ROSTERS
// ============================================================

/** GET /store-house/rosters - List all rosters received */
export const listRosters = async (params = {}) => {
  const response = await api.get('/store-house/rosters', { params });
  return response.data;
};

/** GET /store-house/rosters/:roster_id - Get roster detail with students */
export const getRoster = async (rosterId) => {
  const response = await api.get(`/store-house/rosters/${rosterId}`);
  return response.data;
};

// ============================================================
// STUDENT SEARCH & CUMULATIVE RECORDS
// ============================================================

/** GET /store-house/students/search - Search students */
export const searchStudents = async (params = {}) => {
  const response = await api.get('/store-house/students/search', { params });
  return response.data;
};

/** GET /store-house/students/:student_id/cumulative-record - Get cumulative record */
export const getCumulativeRecord = async (studentId) => {
  const response = await api.get(`/store-house/students/${studentId}/cumulative-record`);
  return response.data;
};

// ============================================================
// TRANSCRIPTS
// ============================================================

/** GET /store-house/transcripts - List all generated transcripts */
export const listTranscripts = async () => {
  const response = await api.get('/store-house/transcripts');
  return response.data;
};

/** GET /store-house/transcripts/:transcript_id - Get transcript detail */
export const getTranscript = async (transcriptId) => {
  const response = await api.get(`/store-house/transcripts/${transcriptId}`);
  return response.data;
};

/** POST /store-house/students/:student_id/transcript - Generate new transcript */
export const generateTranscript = async (studentId, { purpose }) => {
  const response = await api.post(`/store-house/students/${studentId}/transcript`, { purpose });
  return response.data;
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  listRosters,
  getRoster,
  searchStudents,
  getCumulativeRecord,
  listTranscripts,
  getTranscript,
  generateTranscript,
};
