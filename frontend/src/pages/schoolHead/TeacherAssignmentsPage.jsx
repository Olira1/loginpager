// Teacher Assignments Page
// Assign teachers to classes and subjects
// API-compliant: CRUD for teaching assignments

import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Users,
  Plus, 
  Trash2, 
  Search,
  Filter,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  School
} from 'lucide-react';
import {
  getTeachers,
  getGrades,
  getClasses,
  getSubjects,
  getTeachingAssignments,
  createTeachingAssignment,
  deleteTeachingAssignment
} from '../../services/schoolHeadService';

// Assignment Row
const AssignmentRow = ({ assignment, onDelete }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <span className="font-medium text-gray-900">{assignment.teacher?.name || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600">{assignment.class?.grade_name}</td>
      <td className="px-4 py-3 text-gray-600">{assignment.class?.name}</td>
      <td className="px-4 py-3 text-gray-600">{assignment.subject?.name}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(assignment)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          title="Remove Assignment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

// Teacher Card in sidebar
const TeacherCard = ({ teacher, assignmentCount }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
        <span className="text-indigo-600 font-medium text-sm">
          {teacher.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{teacher.name}</p>
        <p className="text-xs text-gray-500">{assignmentCount} assignment(s)</p>
      </div>
    </div>
  );
};

// Create Assignment Modal
const CreateAssignmentModal = ({ isOpen, teachers, grades, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    teacher_id: '',
    grade_id: '',
    class_id: '',
    subject_id: ''
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({ teacher_id: '', grade_id: '', class_id: '', subject_id: '' });
      setClasses([]);
      setSubjects([]);
      setError(null);
    }
  }, [isOpen]);

  // Fetch classes and subjects when grade is selected
  useEffect(() => {
    if (formData.grade_id) {
      fetchClassesAndSubjects(formData.grade_id);
    }
  }, [formData.grade_id]);

  const fetchClassesAndSubjects = async (gradeId) => {
    setLoadingOptions(true);
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        getClasses(gradeId),
        getSubjects(gradeId)
      ]);
      if (classesRes.success) {
        setClasses(classesRes.data.items || []);
      }
      if (subjectsRes.success) {
        setSubjects(subjectsRes.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && formData.teacher_id) {
      setStep(2);
    } else if (step === 2 && formData.grade_id) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave({
        teacher_id: parseInt(formData.teacher_id),
        class_id: parseInt(formData.class_id),
        subject_id: parseInt(formData.subject_id)
      });
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Teaching Assignment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-gray-50">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Teacher */}
          {step === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Teacher</label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Choose a teacher --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Select Grade */}
          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Grade</label>
              <select
                value={formData.grade_id}
                onChange={(e) => setFormData({ ...formData, grade_id: e.target.value, class_id: '', subject_id: '' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Choose a grade --</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Step 3: Select Class & Subject */}
          {step === 3 && (
            <div className="space-y-4">
              {loadingOptions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Choose a class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                    <select
                      value={formData.subject_id}
                      onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Choose a subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t border-gray-200">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !formData.teacher_id) || (step === 2 && !formData.grade_id)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.class_id || !formData.subject_id}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Assignment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, assignment, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Remove Assignment</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove {assignment?.teacher?.name}'s assignment to {assignment?.subject?.name} in {assignment?.class?.name}?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
const TeacherAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, assignment: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, teachersRes, gradesRes] = await Promise.all([
        getTeachingAssignments(),
        getTeachers(),
        getGrades()
      ]);
      
      if (assignmentsRes.success) {
        setAssignments(assignmentsRes.data.items || []);
      }
      if (teachersRes.success) {
        setTeachers(teachersRes.data.items || []);
      }
      if (gradesRes.success) {
        setGrades(gradesRes.data.items || []);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter assignments
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = !search || 
      a.teacher?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.subject?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.class?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = !gradeFilter || a.class?.grade_name === gradeFilter;
    const matchesTeacher = !teacherFilter || a.teacher?.id?.toString() === teacherFilter;
    return matchesSearch && matchesGrade && matchesTeacher;
  });

  // Count assignments per teacher
  const getTeacherAssignmentCount = (teacherId) => {
    return assignments.filter(a => a.teacher?.id === teacherId).length;
  };

  // Handle create
  const handleCreate = async (formData) => {
    await createTeachingAssignment(formData);
    fetchData();
  };

  // Handle delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteTeachingAssignment(deleteModal.assignment.id);
      fetchData();
      setDeleteModal({ open: false, assignment: null });
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Assignments</h1>
          <p className="text-gray-500 mt-1">Assign teachers to classes and subjects.</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          <Plus className="w-5 h-5" />
          New Assignment
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Teacher List Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="bg-gray-50 rounded-xl p-4 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teachers ({teachers.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {teachers.map((teacher) => (
                <TeacherCard 
                  key={teacher.id} 
                  teacher={teacher} 
                  assignmentCount={getTeacherAssignmentCount(teacher.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by teacher, class, or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Grades</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Teachers</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assignments Table */}
          {assignments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Assignments Yet</h3>
              <p className="text-gray-500 mt-1">Start by assigning teachers to classes and subjects.</p>
              <button
                onClick={() => setCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Create First Assignment
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssignments.map((assignment) => (
                      <AssignmentRow
                        key={assignment.id}
                        assignment={assignment}
                        onDelete={() => setDeleteModal({ open: true, assignment })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredAssignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No assignments match your filters
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={createModal}
        teachers={teachers}
        grades={grades}
        onClose={() => setCreateModal(false)}
        onSave={handleCreate}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        assignment={deleteModal.assignment}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, assignment: null })}
        loading={actionLoading}
      />
    </div>
  );
};

export default TeacherAssignmentsPage;

