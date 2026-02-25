import api from './api';

// ============ STUDENTS ============
export const createStudent = async (data) => {
  const response = await api.post('/registrar/students', data);
  return response.data;
};

export const getStudents = async (params = {}) => {
  const response = await api.get('/registrar/students', { params });
  return response.data;
};

export const getStudent = async (studentId) => {
  const response = await api.get(`/registrar/students/${studentId}`);
  return response.data;
};

export const updateStudent = async (studentId, data) => {
  const response = await api.put(`/registrar/students/${studentId}`, data);
  return response.data;
};

export const deactivateStudent = async (studentId, data = {}) => {
  const response = await api.patch(`/registrar/students/${studentId}/deactivate`, data);
  return response.data;
};

export const activateStudent = async (studentId) => {
  const response = await api.patch(`/registrar/students/${studentId}/activate`);
  return response.data;
};

export const uploadStudents = async ({ file }) => {
  const form = new FormData();
  form.append('file', file);

  const response = await api.post('/registrar/students/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getStudentUploadTemplate = async () => {
  const response = await api.get('/registrar/students/upload/template');
  return response.data;
};

// ============ TEACHERS ============
export const createTeacher = async (data) => {
  const response = await api.post('/registrar/teachers', data);
  return response.data;
};

export const getTeachers = async (params = {}) => {
  const response = await api.get('/registrar/teachers', { params });
  return response.data;
};

export const getTeacher = async (teacherId) => {
  const response = await api.get(`/registrar/teachers/${teacherId}`);
  return response.data;
};

export const updateTeacher = async (teacherId, data) => {
  const response = await api.put(`/registrar/teachers/${teacherId}`, data);
  return response.data;
};

export const deactivateTeacher = async (teacherId, data = {}) => {
  const response = await api.patch(`/registrar/teachers/${teacherId}/deactivate`, data);
  return response.data;
};

export const activateTeacher = async (teacherId) => {
  const response = await api.patch(`/registrar/teachers/${teacherId}/activate`);
  return response.data;
};

export const uploadTeachers = async ({ file }) => {
  const form = new FormData();
  form.append('file', file);

  const response = await api.post('/registrar/teachers/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getTeacherUploadTemplate = async () => {
  const response = await api.get('/registrar/teachers/upload/template');
  return response.data;
};

// ============ PARENTS ============
export const getParents = async (params = {}) => {
  const response = await api.get('/registrar/parents', { params });
  return response.data;
};

export const getParent = async (parentId) => {
  const response = await api.get(`/registrar/parents/${parentId}`);
  return response.data;
};

export const updateParent = async (parentId, data) => {
  const response = await api.put(`/registrar/parents/${parentId}`, data);
  return response.data;
};

// ============ UTILITY ============
export const resetUserPassword = async (userId) => {
  const response = await api.post(`/registrar/users/${userId}/reset-password`);
  return response.data;
};

export const getRegistrarStatistics = async () => {
  const response = await api.get('/registrar/statistics');
  return response.data;
};

export const getRegistrationMetadata = async () => {
  const response = await api.get('/registrar/metadata');
  return response.data;
};

export default {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  activateStudent,
  uploadStudents,
  getStudentUploadTemplate,
  createTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  deactivateTeacher,
  activateTeacher,
  uploadTeachers,
  getTeacherUploadTemplate,
  getParents,
  getParent,
  updateParent,
  resetUserPassword,
  getRegistrarStatistics,
  getRegistrationMetadata,
};
