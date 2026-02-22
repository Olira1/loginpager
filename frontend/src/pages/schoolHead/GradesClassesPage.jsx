// Grades & Classes Management Page
// Hierarchical view of grades with classes underneath
// API-compliant: CRUD for grades and classes

import { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  School,
  Plus, 
  Edit2, 
  Trash2, 
  UserCheck,
  ChevronDown,
  ChevronRight,
  Users,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import {
  getGrades,
  getClasses,
  createGrade,
  updateGrade,
  deleteGrade,
  createClass,
  updateClass,
  deleteClass,
  assignClassHead,
  removeClassHead,
  getTeachers
} from '../../services/schoolHeadService';

// Grade Card with expandable classes
const GradeCard = ({ grade, isExpanded, onToggle, onEditGrade, onDeleteGrade, onAddClass, onEditClass, onDeleteClass, onAssignClassHead, classes, loadingClasses }) => {
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
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{grade.name}</h3>
            <p className="text-sm text-gray-500">{grade.total_classes || 0} Classes • {grade.total_students || 0} Students</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddClass(grade)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Add Class"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditGrade(grade)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit Grade"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteGrade(grade)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Grade"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Classes List (expanded) */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {loadingClasses ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : classes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No classes in this grade</p>
          ) : (
            <div className="space-y-2">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <School className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{classItem.name}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-3 h-3" />
                        <span>{classItem.student_count || 0} Students</span>
                        {classItem.class_head && (
                          <>
                            <span>•</span>
                            <span>Head: {classItem.class_head.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAssignClassHead(classItem)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Assign Class Head"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditClass(grade, classItem)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                      title="Edit Class"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteClass(classItem)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Grade Modal (Create/Edit)
const GradeModal = ({ isOpen, mode, grade, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (grade && mode === 'edit') {
      setFormData({
        name: grade.name || '',
        level: grade.level || '',
        description: grade.description || ''
      });
    } else {
      setFormData({ name: '', level: '', description: '' });
    }
    setError(null);
  }, [grade, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save grade');
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
            {mode === 'create' ? 'Add New Grade' : 'Edit Grade'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Grade 9"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Level *</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Level</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
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
              {mode === 'create' ? 'Add Grade' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Class Modal (Create/Edit)
const ClassModal = ({ isOpen, mode, grade, classItem, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    capacity: 60
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (classItem && mode === 'edit') {
      setFormData({
        name: classItem.name || '',
        capacity: classItem.capacity || 60
      });
    } else {
      setFormData({ name: '', capacity: 60 });
    }
    setError(null);
  }, [classItem, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save class');
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
            {mode === 'create' ? `Add Class to ${grade?.name}` : 'Edit Class'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., 9A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
              min="1"
              max="100"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              {mode === 'create' ? 'Add Class' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assign Class Head Modal
const AssignClassHeadModal = ({ isOpen, classItem, teachers, onClose, onSave }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setSelectedTeacher(classItem?.class_head?.id || '');
    setError(null);
  }, [classItem, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(selectedTeacher || null);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to assign class head');
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
            Assign Class Head - {classItem?.name}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Remove Class Head --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
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
              Save Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, title, message, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
const GradesClassesPage = () => {
  const [grades, setGrades] = useState([]);
  const [classesMap, setClassesMap] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Expanded grades
  const [expandedGrades, setExpandedGrades] = useState({});
  const [loadingClasses, setLoadingClasses] = useState({});

  // Modal states
  const [gradeModal, setGradeModal] = useState({ open: false, mode: 'create', grade: null });
  const [classModal, setClassModal] = useState({ open: false, mode: 'create', grade: null, classItem: null });
  const [classHeadModal, setClassHeadModal] = useState({ open: false, classItem: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, item: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch grades
  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await getGrades();
      if (response.success) {
        setGrades(response.data.items || []);
        setError(null);
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

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const response = await getTeachers();
      if (response.success) {
        setTeachers(response.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  // Fetch classes for a grade
  const fetchClasses = async (gradeId) => {
    try {
      setLoadingClasses(prev => ({ ...prev, [gradeId]: true }));
      const response = await getClasses(gradeId);
      if (response.success) {
        setClassesMap(prev => ({ ...prev, [gradeId]: response.data.items || [] }));
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoadingClasses(prev => ({ ...prev, [gradeId]: false }));
    }
  };

  useEffect(() => {
    fetchGrades();
    fetchTeachers();
  }, []);

  // Toggle grade expansion
  const toggleGrade = (gradeId) => {
    const isExpanded = expandedGrades[gradeId];
    setExpandedGrades(prev => ({ ...prev, [gradeId]: !isExpanded }));
    
    // Fetch classes when expanding
    if (!isExpanded && !classesMap[gradeId]) {
      fetchClasses(gradeId);
    }
  };

  // Handle grade save
  const handleSaveGrade = async (formData) => {
    if (gradeModal.mode === 'create') {
      await createGrade(formData);
    } else {
      await updateGrade(gradeModal.grade.id, formData);
    }
    fetchGrades();
  };

  // Handle class save
  const handleSaveClass = async (formData) => {
    if (classModal.mode === 'create') {
      await createClass(classModal.grade.id, formData);
    } else {
      await updateClass(classModal.classItem.id, formData);
    }
    fetchClasses(classModal.grade.id);
    fetchGrades(); // Refresh counts
  };

  // Handle class head assignment
  const handleSaveClassHead = async (teacherId) => {
    if (teacherId) {
      await assignClassHead(classHeadModal.classItem.id, teacherId);
    } else {
      await removeClassHead(classHeadModal.classItem.id);
    }
    // Find the grade this class belongs to
    const gradeId = classHeadModal.classItem.grade_id;
    if (gradeId) {
      fetchClasses(gradeId);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      if (deleteModal.type === 'grade') {
        await deleteGrade(deleteModal.item.id);
        fetchGrades();
      } else if (deleteModal.type === 'class') {
        await deleteClass(deleteModal.item.id);
        const gradeId = deleteModal.item.grade_id;
        if (gradeId) {
          fetchClasses(gradeId);
        }
        fetchGrades();
      }
      setDeleteModal({ open: false, type: null, item: null });
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
          <p className="text-gray-500 mt-2">Loading grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade & Class Management</h1>
          <p className="text-gray-500 mt-1">Define and organize grades and classes within your school.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setGradeModal({ open: true, mode: 'create', grade: null })}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Grade
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grades List */}
      {grades.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Grades Configured</h3>
          <p className="text-gray-500 mt-1">Start by adding grade levels for your school.</p>
          <button
            onClick={() => setGradeModal({ open: true, mode: 'create', grade: null })}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Add First Grade
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {grades.map((grade) => (
            <GradeCard
              key={grade.id}
              grade={grade}
              isExpanded={expandedGrades[grade.id]}
              onToggle={() => toggleGrade(grade.id)}
              onEditGrade={() => setGradeModal({ open: true, mode: 'edit', grade })}
              onDeleteGrade={() => setDeleteModal({ open: true, type: 'grade', item: grade })}
              onAddClass={() => setClassModal({ open: true, mode: 'create', grade, classItem: null })}
              onEditClass={(g, c) => setClassModal({ open: true, mode: 'edit', grade: g, classItem: c })}
              onDeleteClass={(c) => setDeleteModal({ open: true, type: 'class', item: { ...c, grade_id: grade.id } })}
              onAssignClassHead={(c) => setClassHeadModal({ open: true, classItem: { ...c, grade_id: grade.id } })}
              classes={classesMap[grade.id] || []}
              loadingClasses={loadingClasses[grade.id]}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <GradeModal
        isOpen={gradeModal.open}
        mode={gradeModal.mode}
        grade={gradeModal.grade}
        onClose={() => setGradeModal({ open: false, mode: 'create', grade: null })}
        onSave={handleSaveGrade}
      />

      <ClassModal
        isOpen={classModal.open}
        mode={classModal.mode}
        grade={classModal.grade}
        classItem={classModal.classItem}
        onClose={() => setClassModal({ open: false, mode: 'create', grade: null, classItem: null })}
        onSave={handleSaveClass}
      />

      <AssignClassHeadModal
        isOpen={classHeadModal.open}
        classItem={classHeadModal.classItem}
        teachers={teachers}
        onClose={() => setClassHeadModal({ open: false, classItem: null })}
        onSave={handleSaveClassHead}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        title={deleteModal.type === 'grade' ? 'Delete Grade' : 'Delete Class'}
        message={`Are you sure you want to delete "${deleteModal.item?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, type: null, item: null })}
        loading={actionLoading}
      />
    </div>
  );
};

export default GradesClassesPage;

