// Subjects Configuration Page
// Manage subjects per grade level
// API-compliant: CRUD for subjects per grade

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import {
  getGrades,
  getSubjects,
  addSubject,
  updateSubject,
  removeSubject
} from '../../services/schoolHeadService';

// Subject Row
const SubjectRow = ({ subject, onEdit, onDelete }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <span className="font-medium text-gray-900">{subject.name}</span>
          {subject.code && (
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{subject.code}</span>
          )}
          <div className="text-sm text-gray-500">
            {subject.credit_hours && <span>{subject.credit_hours} credit hours</span>}
            {subject.is_required && <span className="ml-2 text-green-600">• Required</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(subject)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
          title="Edit Subject"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(subject)}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Remove Subject"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Grade Subjects Card
const GradeSubjectsCard = ({ grade, isExpanded, onToggle, subjects, loadingSubjects, onAddSubject, onEditSubject, onDeleteSubject }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Grade Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <button className="p-1">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          <div>
            <h3 className="font-semibold text-gray-900">{grade.name}</h3>
            <p className="text-sm text-gray-500">{subjects?.length || 0} Subjects</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAddSubject(grade); }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Subjects List */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {loadingSubjects ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : subjects?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No subjects configured for this grade</p>
          ) : (
            <div className="space-y-2">
              {subjects?.map((subject) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  onEdit={(s) => onEditSubject(grade, s)}
                  onDelete={(s) => onDeleteSubject(grade, s)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Subject Modal
const SubjectModal = ({ isOpen, mode, grade, subject, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    credit_hours: 4,
    is_required: true,
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (subject && mode === 'edit') {
      setFormData({
        name: subject.name || '',
        code: subject.code || '',
        credit_hours: subject.credit_hours || 4,
        is_required: subject.is_required ?? true,
        description: subject.description || ''
      });
    } else {
      setFormData({ name: '', code: '', credit_hours: 4, is_required: true, description: '' });
    }
    setError(null);
  }, [subject, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? `Add Subject to ${grade?.name}` : 'Edit Subject'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Mathematics"
            />
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., MATH"
              maxLength={10}
            />
          </div> */}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Credit Hours</label>
              <input
                type="number"
                value={formData.credit_hours}
                onChange={(e) => setFormData({ ...formData, credit_hours: parseInt(e.target.value) || 0 })}
                min="1"
                max="10"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center pt-7">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Required Subject</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Add Subject' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, subject, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Remove Subject</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to remove "{subject?.name}" from this grade? This may affect existing grade records.
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
const SubjectsPage = () => {
  const [grades, setGrades] = useState([]);
  const [subjectsMap, setSubjectsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded grades
  const [expandedGrades, setExpandedGrades] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState({});

  // Modal states
  const [subjectModal, setSubjectModal] = useState({ open: false, mode: 'create', grade: null, subject: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, grade: null, subject: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch grades
  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await getGrades();
      if (response.success) {
        setGrades(response.data.items || []);
        setError(null);
        
        // Expand first grade by default
        if (response.data.items?.length > 0) {
          const firstGradeId = response.data.items[0].id;
          setExpandedGrades({ [firstGradeId]: true });
          fetchSubjects(firstGradeId);
        }
      } else {
        const errorData = response.error;
        setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load grades');
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subjects for a grade
  const fetchSubjects = async (gradeId) => {
    try {
      setLoadingSubjects(prev => ({ ...prev, [gradeId]: true }));
      const response = await getSubjects(gradeId);
      if (response.success) {
        setSubjectsMap(prev => ({ ...prev, [gradeId]: response.data.items || [] }));
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoadingSubjects(prev => ({ ...prev, [gradeId]: false }));
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  // Toggle grade expansion
  const toggleGrade = (gradeId) => {
    const isExpanded = expandedGrades[gradeId];
    setExpandedGrades(prev => ({ ...prev, [gradeId]: !isExpanded }));
    
    // Fetch subjects when expanding
    if (!isExpanded && !subjectsMap[gradeId]) {
      fetchSubjects(gradeId);
    }
  };

  // Handle subject save
  const handleSaveSubject = async (formData) => {
    if (subjectModal.mode === 'create') {
      await addSubject(subjectModal.grade.id, formData);
    } else {
      await updateSubject(subjectModal.grade.id, subjectModal.subject.id, formData);
    }
    fetchSubjects(subjectModal.grade.id);
  };

  // Handle delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await removeSubject(deleteModal.grade.id, deleteModal.subject.id);
      fetchSubjects(deleteModal.grade.id);
      setDeleteModal({ open: false, grade: null, subject: null });
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
          <p className="text-gray-500 mt-2">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Configuration</h1>
          <p className="text-gray-500 mt-1">Define subjects per grade level and manage curriculum.</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grades with Subjects */}
      {grades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Grades Configured</h3>
          <p className="text-gray-500 mt-1">Create grades first before adding subjects.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grades.map((grade) => (
            <GradeSubjectsCard
              key={grade.id}
              grade={grade}
              isExpanded={expandedGrades[grade.id]}
              onToggle={() => toggleGrade(grade.id)}
              subjects={subjectsMap[grade.id]}
              loadingSubjects={loadingSubjects[grade.id]}
              onAddSubject={(g) => setSubjectModal({ open: true, mode: 'create', grade: g, subject: null })}
              onEditSubject={(g, s) => setSubjectModal({ open: true, mode: 'edit', grade: g, subject: s })}
              onDeleteSubject={(g, s) => setDeleteModal({ open: true, grade: g, subject: s })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <SubjectModal
        isOpen={subjectModal.open}
        mode={subjectModal.mode}
        grade={subjectModal.grade}
        subject={subjectModal.subject}
        onClose={() => setSubjectModal({ open: false, mode: 'create', grade: null, subject: null })}
        onSave={handleSaveSubject}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        subject={deleteModal.subject}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, grade: null, subject: null })}
        loading={actionLoading}
      />
    </div>
  );
};

export default SubjectsPage;

