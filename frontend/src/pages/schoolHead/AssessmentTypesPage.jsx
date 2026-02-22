// Assessment Types & Weight Templates Page
// Manage assessment types and weight templates
// API-compliant: CRUD for assessment types and weight templates

import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Scale,
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle,
  X,
  Percent
} from 'lucide-react';
import {
  getAssessmentTypes,
  createAssessmentType,
  updateAssessmentType,
  deleteAssessmentType,
  getWeightTemplates,
  createWeightTemplate,
  updateWeightTemplate,
  deleteWeightTemplate
} from '../../services/schoolHeadService';

// Assessment Type Card
const AssessmentTypeCard = ({ type, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{type.name}</h3>
            {type.code && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{type.code}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(type)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(type)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">{type.description || 'No description'}</p>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-sm text-gray-600">Default Weight:</span>
        <span className="font-semibold text-indigo-600">{type.default_weight_percent}%</span>
      </div>
    </div>
  );
};

// Weight Template Card
const WeightTemplateCard = ({ template, onEdit, onDelete }) => {
  const totalWeight = template.weights?.reduce((sum, w) => sum + w.weight_percent, 0) || 0;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Scale className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            {template.is_default && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Default</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(template)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(template)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Weights Preview */}
      <div className="space-y-2 mb-3">
        {template.weights?.slice(0, 4).map((w, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{w.assessment_type_name}</span>
            <span className="font-medium">{w.weight_percent}%</span>
          </div>
        ))}
        {template.weights?.length > 4 && (
          <span className="text-xs text-gray-400">+{template.weights.length - 4} more</span>
        )}
      </div>
      
      <div className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
        Total: {totalWeight}%
      </div>
    </div>
  );
};

// Assessment Type Modal
const AssessmentTypeModal = ({ isOpen, mode, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    default_weight_percent: 10
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (type && mode === 'edit') {
      setFormData({
        name: type.name || '',
        code: type.code || '',
        description: type.description || '',
        default_weight_percent: type.default_weight_percent || 10
      });
    } else {
      setFormData({ name: '', code: '', description: '', default_weight_percent: 10 });
    }
    setError(null);
  }, [type, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save assessment type');
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
            {mode === 'create' ? 'Add Assessment Type' : 'Edit Assessment Type'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Mid-Term Exam"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., MID"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Weight (%)</label>
            <input
              type="number"
              value={formData.default_weight_percent}
              onChange={(e) => setFormData({ ...formData, default_weight_percent: parseInt(e.target.value) || 0 })}
              min="1"
              max="100"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
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
              {mode === 'create' ? 'Add Type' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Weight Template Modal
const WeightTemplateModal = ({ isOpen, mode, template, assessmentTypes, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    weights: [],
    is_default: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (template && mode === 'edit') {
      // Ensure weight values are numbers (MySQL DECIMAL may return strings)
      const parsedWeights = (template.weights || []).map(w => ({
        ...w,
        weight_percent: parseFloat(w.weight_percent) || 0
      }));
      setFormData({
        name: template.name || '',
        description: template.description || '',
        weights: parsedWeights,
        is_default: template.is_default || false
      });
    } else {
      // Initialize weights with assessment types - parseFloat to avoid string concatenation
      const defaultWeights = assessmentTypes.map(at => ({
        assessment_type_id: at.id,
        assessment_type_name: at.name,
        weight_percent: parseFloat(at.default_weight_percent) || 0,
        max_score: 100
      }));
      setFormData({ name: '', description: '', weights: defaultWeights, is_default: false });
    }
    setError(null);
  }, [template, mode, isOpen, assessmentTypes]);

  const updateWeight = (index, value) => {
    const newWeights = [...formData.weights];
    newWeights[index] = { ...newWeights[index], weight_percent: parseFloat(value) || 0 };
    setFormData({ ...formData, weights: newWeights });
  };

  const totalWeight = formData.weights.reduce((sum, w) => sum + (parseFloat(w.weight_percent) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (totalWeight !== 100) {
      setError('Total weight must equal 100%');
      return;
    }

    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create Weight Template' : 'Edit Weight Template'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Standard Core Subjects"
            />
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

          {/* Weights */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Weight Distribution</label>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {formData.weights.map((w, index) => (
                <div key={w.assessment_type_id || index} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-gray-700 flex-1">{w.assessment_type_name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={w.weight_percent}
                      onChange={(e) => updateWeight(index, e.target.value)}
                      min="0"
                      max="100"
                      className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-center"
                    />
                    <Percent className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
              
              <div className={`flex items-center justify-between pt-3 border-t border-gray-200 font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Total</span>
                <span>{totalWeight}%</span>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Set as default template</span>
          </label>

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
              {mode === 'create' ? 'Create Template' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, item, type, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Delete {type === 'assessmentType' ? 'Assessment Type' : 'Weight Template'}
        </h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{item?.name}"? This action cannot be undone.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
const AssessmentTypesPage = () => {
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [weightTemplates, setWeightTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [typeModal, setTypeModal] = useState({ open: false, mode: 'create', type: null });
  const [templateModal, setTemplateModal] = useState({ open: false, mode: 'create', template: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: null, item: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data - each call handled individually so one failure doesn't block the other
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [typesRes, templatesRes] = await Promise.all([
        getAssessmentTypes().catch(err => {
          console.error('Error fetching assessment types:', err);
          return null;
        }),
        getWeightTemplates().catch(err => {
          console.error('Error fetching weight templates:', err);
          return null;
        })
      ]);
      
      if (typesRes?.success) {
        setAssessmentTypes(typesRes.data.items || []);
      }
      if (templatesRes?.success) {
        setWeightTemplates(templatesRes.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle assessment type save
  const handleSaveType = async (formData) => {
    if (typeModal.mode === 'create') {
      await createAssessmentType(formData);
    } else {
      await updateAssessmentType(typeModal.type.id, formData);
    }
    fetchData();
  };

  // Handle template save
  const handleSaveTemplate = async (formData) => {
    if (templateModal.mode === 'create') {
      await createWeightTemplate(formData);
    } else {
      await updateWeightTemplate(templateModal.template.id, formData);
    }
    fetchData();
  };

  // Handle delete
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      if (deleteModal.type === 'assessmentType') {
        await deleteAssessmentType(deleteModal.item.id);
      } else {
        await deleteWeightTemplate(deleteModal.item.id);
      }
      fetchData();
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
          <p className="text-gray-500 mt-2">Loading assessment configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessment Configuration</h1>
        <p className="text-gray-500 mt-1">Configure assessment types and weight templates for grading.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Assessment Types Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Assessment Types</h2>
          <button
            onClick={() => setTypeModal({ open: true, mode: 'create', type: null })}
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
          >
            <Plus className="w-5 h-5" />
            Add Type
          </button>
        </div>
        
        {assessmentTypes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No assessment types configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessmentTypes.map((type) => (
              <AssessmentTypeCard
                key={type.id}
                type={type}
                onEdit={() => setTypeModal({ open: true, mode: 'edit', type })}
                onDelete={() => setDeleteModal({ open: true, type: 'assessmentType', item: type })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Weight Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weight Templates</h2>
          <button
            onClick={() => setTemplateModal({ open: true, mode: 'create', template: null })}
            disabled={assessmentTypes.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Create Template
          </button>
        </div>
        
        {assessmentTypes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Scale className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Add assessment types first to create templates</p>
          </div>
        ) : weightTemplates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Scale className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No weight templates configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weightTemplates.map((template) => (
              <WeightTemplateCard
                key={template.id}
                template={template}
                onEdit={() => setTemplateModal({ open: true, mode: 'edit', template })}
                onDelete={() => setDeleteModal({ open: true, type: 'weightTemplate', item: template })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AssessmentTypeModal
        isOpen={typeModal.open}
        mode={typeModal.mode}
        type={typeModal.type}
        onClose={() => setTypeModal({ open: false, mode: 'create', type: null })}
        onSave={handleSaveType}
      />

      <WeightTemplateModal
        isOpen={templateModal.open}
        mode={templateModal.mode}
        template={templateModal.template}
        assessmentTypes={assessmentTypes}
        onClose={() => setTemplateModal({ open: false, mode: 'create', template: null })}
        onSave={handleSaveTemplate}
      />

      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        item={deleteModal.item}
        type={deleteModal.type}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, type: null, item: null })}
        loading={actionLoading}
      />
    </div>
  );
};

export default AssessmentTypesPage;

