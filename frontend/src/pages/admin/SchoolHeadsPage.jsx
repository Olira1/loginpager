import { useEffect, useMemo, useState } from 'react';
import { UserCog, Search, Plus, Loader2, AlertCircle, Edit, X, KeyRound } from 'lucide-react';
import {
  activateSchoolHead,
  createSchoolHead,
  deactivateSchoolHead,
  getSchoolHead,
  getSchoolHeads,
  getSchools,
  resetSchoolHeadPassword,
  updateSchoolHead
} from '../../services/adminService';

const initialCreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: 'M',
  password: '',
  school_id: ''
};

const initialEditForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: 'M',
  school_id: ''
};

const getApiError = (err, fallback) =>
  err?.response?.data?.error?.message || err?.message || fallback;

const SchoolHeadsPage = () => {
  const [schoolHeads, setSchoolHeads] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState(initialEditForm);

  const fetchSchoolHeads = async () => {
    try {
      setLoading(true);
      const params = { status: statusFilter, limit: 100 };
      if (schoolFilter) params.school_id = schoolFilter;
      if (search.trim()) params.search = search.trim();

      const response = await getSchoolHeads(params);
      if (response.success) {
        setSchoolHeads(response.data?.items || []);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load school heads.');
      }
    } catch (err) {
      setError(getApiError(err, 'Failed to load school heads.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await getSchools({ status: 'active', limit: 200 });
      if (response.success) {
        setSchools(response.data?.items || []);
      }
    } catch {
      // Ignore dropdown loading failures and keep page usable.
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchSchoolHeads();
  }, [statusFilter, schoolFilter]);

  const visibleSchoolHeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schoolHeads;
    return schoolHeads.filter(
      (head) =>
        String(head.full_name || '').toLowerCase().includes(q) ||
        String(head.email || '').toLowerCase().includes(q) ||
        String(head.phone || '').toLowerCase().includes(q) ||
        String(head.school?.name || '').toLowerCase().includes(q)
    );
  }, [schoolHeads, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...createForm,
        school_id: Number(createForm.school_id)
      };
      const response = await createSchoolHead(payload);
      if (!response.success) {
        setError(response.error?.message || 'Failed to create school head.');
        return;
      }
      setCreateOpen(false);
      setCreateForm(initialCreateForm);
      await fetchSchoolHeads();
    } catch (err) {
      setError(getApiError(err, 'Failed to create school head.'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (head) => {
    try {
      setSaving(true);
      const response = await getSchoolHead(head.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to load school head details.');
        return;
      }

      const details = response.data;
      setEditTarget(head);
      setEditForm({
        first_name: details.first_name || '',
        last_name: details.last_name || '',
        email: details.email || '',
        phone: details.phone || '',
        gender: details.gender || 'M',
        school_id: details.school?.id ? String(details.school.id) : ''
      });
    } catch (err) {
      setError(getApiError(err, 'Failed to load school head details.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setSaving(true);
      const payload = {
        ...editForm,
        school_id: Number(editForm.school_id)
      };
      const response = await updateSchoolHead(editTarget.id, payload);
      if (!response.success) {
        setError(response.error?.message || 'Failed to update school head.');
        return;
      }
      setEditTarget(null);
      setEditForm(initialEditForm);
      await fetchSchoolHeads();
    } catch (err) {
      setError(getApiError(err, 'Failed to update school head.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (head) => {
    try {
      setSaving(true);
      const response =
        head.status === 'active'
          ? await deactivateSchoolHead(head.id)
          : await activateSchoolHead(head.id);

      if (!response.success) {
        setError(response.error?.message || 'Failed to update status.');
        return;
      }
      await fetchSchoolHeads();
    } catch (err) {
      setError(getApiError(err, 'Failed to update status.'));
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (head) => {
    try {
      setSaving(true);
      const response = await resetSchoolHeadPassword(head.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to reset password.');
        return;
      }
      setCredentialsModal({
        title: 'School Head Password Reset',
        credentials: {
          username: response.data?.username,
          temporary_password: response.data?.new_temporary_password
        }
      });
    } catch (err) {
      setError(getApiError(err, 'Failed to reset password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Heads</h1>
          <p className="text-gray-500">Create and manage school head accounts.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add School Head
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or school"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Schools</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
        <button
          onClick={fetchSchoolHeads}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[240px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : visibleSchoolHeads.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          <UserCog className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          No school heads found.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">School Head</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleSchoolHeads.map((head) => (
                <tr key={head.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{head.full_name}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      <div>{head.email || '-'}</div>
                      <div>{head.phone || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{head.school?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        head.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {head.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(head)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onResetPassword(head)}
                        disabled={saving}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-700"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(head)}
                        disabled={saving}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium ${
                          head.status === 'active'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {head.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="w-full max-w-2xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create School Head</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="First name"
                value={createForm.first_name}
                onChange={(e) => setCreateForm((v) => ({ ...v, first_name: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Last name"
                value={createForm.last_name}
                onChange={(e) => setCreateForm((v) => ({ ...v, last_name: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))}
                required
              />
              <select
                className="border rounded-lg px-3 py-2"
                value={createForm.gender}
                onChange={(e) => setCreateForm((v) => ({ ...v, gender: e.target.value }))}
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <select
                className="border rounded-lg px-3 py-2"
                value={createForm.school_id}
                onChange={(e) => setCreateForm((v) => ({ ...v, school_id: e.target.value }))}
                required
              >
                <option value="">Select School</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <input
                className="md:col-span-2 border rounded-lg px-3 py-2"
                type="password"
                placeholder="Temporary password"
                value={createForm.password}
                onChange={(e) => setCreateForm((v) => ({ ...v, password: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={handleEdit} className="w-full max-w-2xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit School Head</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="First name"
                value={editForm.first_name}
                onChange={(e) => setEditForm((v) => ({ ...v, first_name: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Last name"
                value={editForm.last_name}
                onChange={(e) => setEditForm((v) => ({ ...v, last_name: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))}
              />
              <select
                className="border rounded-lg px-3 py-2"
                value={editForm.gender}
                onChange={(e) => setEditForm((v) => ({ ...v, gender: e.target.value }))}
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <select
                className="border rounded-lg px-3 py-2"
                value={editForm.school_id}
                onChange={(e) => setEditForm((v) => ({ ...v, school_id: e.target.value }))}
                required
              >
                <option value="">Select School</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {credentialsModal ? (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{credentialsModal.title}</h3>
              <button type="button" onClick={() => setCredentialsModal(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {credentialsModal.credentials ? (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">New Credentials</p>
                <p>Username: <span className="font-mono">{credentialsModal.credentials.username}</span></p>
                <p>Password: <span className="font-mono">{credentialsModal.credentials.temporary_password}</span></p>
                <p className="text-amber-600 text-xs mt-2">User must change password on next login.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SchoolHeadsPage;
