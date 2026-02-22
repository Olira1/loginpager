// Schools Management Page
// List, create, edit, delete, activate/deactivate schools
// API-compliant design

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  Eye, 
  Edit2, 
  Trash2, 
  Power,
  PowerOff,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  activateSchool,
  deactivateSchool
} from '../../services/adminService';

// School Card Component
const SchoolCard = ({ school, onView, onEdit, onToggleStatus, onDelete }) => {
  const isActive = school.status === 'active';
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{school.name}</h3>
            <p className="text-sm text-gray-500">{school.code}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          isActive 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">{school.address || 'No address'}</p>
        {school.school_head && (
          <p className="text-sm text-gray-500">
            <span className="text-gray-400">Head:</span> {school.school_head.name}
          </p>
        )}
        {school.email && (
          <p className="text-sm text-gray-500 truncate">
            <span className="text-gray-400">Email:</span> {school.email}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={() => onView(school)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onEdit(school)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onToggleStatus(school)}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isActive
              ? 'text-red-600 hover:bg-red-50'
              : 'text-green-600 hover:bg-green-50'
          }`}
        >
          {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          {isActive ? 'Suspend' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

// School Modal (Create/Edit/View)
const SchoolModal = ({ isOpen, mode, school, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    school_head_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (school && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: school.name || '',
        code: school.code || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        school_head_id: school.school_head?.id || ''
      });
    } else {
      setFormData({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
        school_head_id: ''
      });
    }
    setError(null);
  }, [school, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Extract error message from response
      const errorData = err.response?.data?.error;
      const errorMessage = typeof errorData === 'object' 
        ? errorData.message 
        : errorData || 'Failed to save school';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const title = mode === 'create' ? 'Create New School' : mode === 'edit' ? 'Edit School' : 'School Details';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              School Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isViewMode}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter school name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              School Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={isViewMode || mode === 'edit'}
              required
              maxLength={10}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="e.g., AASS"
            />
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                school head id *
              </label>
              <input
                type="text"
                value={formData.school_head_id}
                onChange={(e) => setFormData({ ...formData, school_head_id: e.target.value })}
                disabled={isViewMode}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter school head id"
              />
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={isViewMode}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={isViewMode}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="+251..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isViewMode}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="school@example.com"
              />
            </div>
          </div>

          {/* School statistics in view mode */}
          {isViewMode && school?.statistics && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3">Statistics</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{school.statistics.total_students || 0}</p>
                  <p className="text-sm text-gray-500">Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{school.statistics.total_teachers || 0}</p>
                  <p className="text-sm text-gray-500">Teachers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{school.statistics.total_classes || 0}</p>
                  <p className="text-sm text-gray-500">Classes</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isViewMode && (
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
                {mode === 'create' ? 'Create School' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Confirmation Modal
const ConfirmModal = ({ isOpen, title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
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
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${colorClasses[confirmColor]}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Schools Page Component
const SchoolsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total_items: 0, total_pages: 1 });
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, school: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch schools
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await getSchools(params);
      
      if (response.success) {
        setSchools(response.data.items || []);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
        setError(null);
      } else {
        const errorData = response.error;
        setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load schools');
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [pagination.page, search, statusFilter]);

  // Check for create action in URL
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setModalMode('create');
      setSelectedSchool(null);
      setModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  // Handle view school
  const handleView = async (school) => {
    try {
      const response = await getSchool(school.id);
      if (response.success) {
        setSelectedSchool(response.data);
        setModalMode('view');
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching school details:', err);
    }
  };

  // Handle edit school
  const handleEdit = (school) => {
    setSelectedSchool(school);
    setModalMode('edit');
    setModalOpen(true);
  };

  // Handle create school
  const handleCreate = () => {
    setSelectedSchool(null);
    setModalMode('create');
    setModalOpen(true);
  };

  // Handle save school (create/edit)
  const handleSave = async (formData) => {
    if (modalMode === 'create') {
      await createSchool(formData);
    } else {
      await updateSchool(selectedSchool.id, formData);
    }
    fetchSchools();
  };

  // Handle toggle status
  const handleToggleStatus = (school) => {
    setConfirmModal({
      open: true,
      type: school.status === 'active' ? 'deactivate' : 'activate',
      school
    });
  };

  // Confirm toggle status
  const confirmToggleStatus = async () => {
    setActionLoading(true);
    try {
      const { school, type } = confirmModal;
      if (type === 'activate') {
        await activateSchool(school.id);
      } else {
        await deactivateSchool(school.id);
      }
      fetchSchools();
      setConfirmModal({ open: false, type: null, school: null });
    } catch (err) {
      console.error('Error toggling school status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete school
  const handleDelete = (school) => {
    setConfirmModal({
      open: true,
      type: 'delete',
      school
    });
  };

  // Confirm delete
  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await deleteSchool(confirmModal.school.id);
      fetchSchools();
      setConfirmModal({ open: false, type: null, school: null });
    } catch (err) {
      console.error('Error deleting school:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Management</h1>
          <p className="text-gray-500 mt-1">Manage all schools in the platform</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create New School
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools by name..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
            <p className="text-gray-500 mt-2">Loading schools...</p>
          </div>
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Schools Found</h3>
          <p className="text-gray-500 mt-1">
            {search || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first school to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create School
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Schools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                onView={handleView}
                onEdit={handleEdit}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total_items)} of {pagination.total_items} schools
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.total_pages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* School Modal */}
      <SchoolModal
        isOpen={modalOpen}
        mode={modalMode}
        school={selectedSchool}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Confirm Modal for Status Toggle */}
      {confirmModal.type && confirmModal.type !== 'delete' && (
        <ConfirmModal
          isOpen={confirmModal.open}
          title={confirmModal.type === 'activate' ? 'Activate School' : 'Suspend School'}
          message={`Are you sure you want to ${confirmModal.type} "${confirmModal.school?.name}"? ${
            confirmModal.type === 'deactivate' 
              ? 'This will prevent users from accessing this school.'
              : 'This will allow users to access this school again.'
          }`}
          confirmLabel={confirmModal.type === 'activate' ? 'Activate' : 'Suspend'}
          confirmColor={confirmModal.type === 'activate' ? 'green' : 'red'}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmModal({ open: false, type: null, school: null })}
          loading={actionLoading}
        />
      )} 

      {/* Confirm Modal for Delete */}
      {confirmModal.type === 'delete' && (
        <ConfirmModal
          isOpen={confirmModal.open}
          title="Delete School"
          message={`Are you sure you want to delete "${confirmModal.school?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal({ open: false, type: null, school: null })}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default SchoolsPage;

