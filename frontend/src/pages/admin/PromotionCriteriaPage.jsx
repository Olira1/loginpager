// Promotion Criteria Management Page
// List, create, edit, delete promotion criteria
// API-compliant design

import { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle,
  X,
  Check,
  Star
} from 'lucide-react';
import {
  getPromotionCriteria,
  getPromotionCriteriaById,
  createPromotionCriteria,
  updatePromotionCriteria,
  deletePromotionCriteria
} from '../../services/adminService';

// Default score labels for Ethiopian system
const DEFAULT_SCORE_LABELS = [
  { min_score: 90, max_score: 100, label: 'Excellent' },
  { min_score: 80, max_score: 89, label: 'Very Good' },
  { min_score: 60, max_score: 79, label: 'Good' },
  { min_score: 50, max_score: 59, label: 'Satisfactory' },
  { min_score: 0, max_score: 49, label: 'Fail' }
];

// Criteria Card Component
const CriteriaCard = ({ criteria, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{criteria.name}</h3>
              {criteria.is_default && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  <Star className="w-3 h-3" />
                  Default
                </span>
              )}
            </div>
            {criteria.description && (
              <p className="text-sm text-gray-500 mt-0.5">{criteria.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Criteria Details */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-indigo-600">{criteria.passing_average}%</p>
          <p className="text-xs text-gray-500">Passing Average</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{criteria.passing_per_subject}%</p>
          <p className="text-xs text-gray-500">Min Per Subject</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{criteria.max_failing_subjects}</p>
          <p className="text-xs text-gray-500">Max Fails Allowed</p>
        </div>
      </div>

      {/* Score Labels */}
      {criteria.score_labels && criteria.score_labels.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Score Labels</p>
          <div className="flex flex-wrap gap-2">
            {criteria.score_labels.map((label, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
              >
                {label.min_score}-{label.max_score}: {label.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        {criteria.schools_using !== undefined && (
          <span className="text-sm text-gray-500">
            Used by {criteria.schools_using} school{criteria.schools_using !== 1 ? 's' : ''}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => onEdit(criteria)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(criteria)}
            disabled={criteria.is_default}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Score Label Editor
const ScoreLabelEditor = ({ labels, onChange, disabled }) => {
  const addLabel = () => {
    const newLabels = [...labels, { min_score: 0, max_score: 0, label: '' }];
    onChange(newLabels);
  };

  const updateLabel = (index, field, value) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], [field]: value };
    onChange(newLabels);
  };

  const removeLabel = (index) => {
    const newLabels = labels.filter((_, i) => i !== index);
    onChange(newLabels);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Score Labels (Score Ranges)
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={addLabel}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Label
          </button>
        )}
      </div>
      
      {labels.map((label, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="number"
            value={label.min_score}
            onChange={(e) => updateLabel(index, 'min_score', parseInt(e.target.value) || 0)}
            disabled={disabled}
            placeholder="Min"
            min="0"
            max="100"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-sm"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={label.max_score}
            onChange={(e) => updateLabel(index, 'max_score', parseInt(e.target.value) || 0)}
            disabled={disabled}
            placeholder="Max"
            min="0"
            max="100"
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-sm"
          />
          <input
            type="text"
            value={label.label}
            onChange={(e) => updateLabel(index, 'label', e.target.value)}
            disabled={disabled}
            placeholder="Label (e.g., Excellent)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 text-sm"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => removeLabel(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      
      {labels.length === 0 && (
        <p className="text-sm text-gray-400 italic">No score labels defined</p>
      )}
    </div>
  );
};

// Criteria Modal (Create/Edit)
const CriteriaModal = ({ isOpen, mode, criteria, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    passing_average: 50,
    passing_per_subject: 40,
    max_failing_subjects: 2,
    score_labels: DEFAULT_SCORE_LABELS,
    is_default: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (criteria && mode === 'edit') {
      setFormData({
        name: criteria.name || '',
        description: criteria.description || '',
        passing_average: criteria.passing_average || 50,
        passing_per_subject: criteria.passing_per_subject || 40,
        max_failing_subjects: criteria.max_failing_subjects || 2,
        score_labels: criteria.score_labels || DEFAULT_SCORE_LABELS,
        is_default: criteria.is_default || false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        passing_average: 50,
        passing_per_subject: 40,
        max_failing_subjects: 2,
        score_labels: DEFAULT_SCORE_LABELS,
        is_default: false
      });
    }
    setError(null);
  }, [criteria, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save criteria');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Create Promotion Criteria' : 'Edit Promotion Criteria';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Criteria Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Ethiopian Standard Promotion Criteria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Passing Average (%) *
              </label>
              <input
                type="number"
                value={formData.passing_average}
                onChange={(e) => setFormData({ ...formData, passing_average: parseInt(e.target.value) || 0 })}
                required
                min="0"
                max="100"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Min Per Subject (%) *
              </label>
              <input
                type="number"
                value={formData.passing_per_subject}
                onChange={(e) => setFormData({ ...formData, passing_per_subject: parseInt(e.target.value) || 0 })}
                required
                min="0"
                max="100"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Max Failing Subjects *
              </label>
              <input
                type="number"
                value={formData.max_failing_subjects}
                onChange={(e) => setFormData({ ...formData, max_failing_subjects: parseInt(e.target.value) || 0 })}
                required
                min="0"
                max="10"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <ScoreLabelEditor
            labels={formData.score_labels}
            onChange={(labels) => setFormData({ ...formData, score_labels: labels })}
            disabled={false}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">
              Set as default criteria for new schools
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create Criteria' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, criteria, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Promotion Criteria</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{criteria?.name}"? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Promotion Criteria Page
const PromotionCriteriaPage = () => {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCriteria, setSelectedCriteria] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, criteria: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch criteria
  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const response = await getPromotionCriteria();
      
      if (response.success) {
        setCriteria(response.data.items || []);
        setError(null);
      } else {
        const errorData = response.error;
        setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load criteria');
      }
    } catch (err) {
      console.error('Error fetching criteria:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load criteria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  // Handle create
  const handleCreate = () => {
    setSelectedCriteria(null);
    setModalMode('create');
    setModalOpen(true);
  };

  // Handle edit
  const handleEdit = (item) => {
    setSelectedCriteria(item);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Handle save
  const handleSave = async (formData) => {
    if (modalMode === 'create') {
      await createPromotionCriteria(formData);
    } else {
      await updatePromotionCriteria(selectedCriteria.id, formData);
    }
    fetchCriteria();
  };

  // Handle delete
  const handleDelete = (item) => {
    setDeleteModal({ open: true, criteria: item });
  };

  // Confirm delete
  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await deletePromotionCriteria(deleteModal.criteria.id);
      fetchCriteria();
      setDeleteModal({ open: false, criteria: null });
    } catch (err) {
      console.error('Error deleting criteria:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotion Criteria</h1>
          <p className="text-gray-500 mt-1">
            Manage global promotion rules for Ethiopian secondary schools
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Criteria
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800">Ethiopian Grading System</h3>
          <p className="text-sm text-amber-700 mt-1">
            Ethiopian secondary schools use numerical scores (Total, Average, Rank) with promotion status.
            No letter grades (A, B, C, D) are used. Score labels are for display purposes only.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-gray-500 mt-2">Loading criteria...</p>
          </div>
        </div>
      ) : criteria.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Promotion Criteria</h3>
          <p className="text-gray-500 mt-1">Create your first promotion criteria to get started</p>
          <button
            onClick={handleCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Criteria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {criteria.map((item) => (
            <CriteriaCard
              key={item.id}
              criteria={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Criteria Modal */}
      <CriteriaModal
        isOpen={modalOpen}
        mode={modalMode}
        criteria={selectedCriteria}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        criteria={deleteModal.criteria}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, criteria: null })}
        loading={actionLoading}
      />
    </div>
  );
};

export default PromotionCriteriaPage;

