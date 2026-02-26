import { useEffect, useMemo, useState } from 'react';
import { Package, Search, Plus, Loader2, AlertCircle, Edit, X, KeyRound, Trash2 } from 'lucide-react';
import {
  activateStoreHouseUser,
  createStoreHouseUser,
  deactivateStoreHouseUser,
  deleteStoreHouseUser,
  getStoreHouseUsers,
  resetStoreHouseUserPassword,
  updateStoreHouseUser
} from '../../services/schoolHeadService';

const defaultCreateForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: 'M',
  password: ''
};

const defaultEditForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: 'M'
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || fallback;

const StoreHouseUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getStoreHouseUsers({ status: statusFilter, limit: 100, search: search.trim() || undefined });
      if (response.success) {
        setUsers(response.data?.items || []);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load store house users.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load store house users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        String(user.full_name || '').toLowerCase().includes(q) ||
        String(user.email || '').toLowerCase().includes(q) ||
        String(user.phone || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await createStoreHouseUser(createForm);
      if (!response.success) {
        setError(response.error?.message || 'Failed to create store house user.');
        return;
      }
      setCreateOpen(false);
      setCreateForm(defaultCreateForm);
      await fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create store house user.'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setEditTarget(user);
    const names = String(user.full_name || '').trim().split(' ');
    setEditForm({
      first_name: names[0] || '',
      last_name: names.slice(1).join(' ') || '',
      email: user.email || '',
      phone: user.phone || '',
      gender: user.gender || 'M'
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSaving(true);
      const response = await updateStoreHouseUser(editTarget.id, editForm);
      if (!response.success) {
        setError(response.error?.message || 'Failed to update store house user.');
        return;
      }
      setEditTarget(null);
      setEditForm(defaultEditForm);
      await fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update store house user.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      setSaving(true);
      const response =
        user.status === 'active'
          ? await deactivateStoreHouseUser(user.id)
          : await activateStoreHouseUser(user.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to update store house user status.');
        return;
      }
      await fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update store house user status.'));
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (user) => {
    try {
      setSaving(true);
      const response = await resetStoreHouseUserPassword(user.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to reset password.');
        return;
      }
      setCredentialsModal({
        title: 'Store House User Password Reset',
        credentials: {
          username: response.data?.username,
          temporary_password: response.data?.new_temporary_password
        }
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteStoreHouseUser = async (user) => {
    const ok = window.confirm(`Delete store house user "${user.full_name}"? This action cannot be undone.`);
    if (!ok) return;

    try {
      setSaving(true);
      const response = await deleteStoreHouseUser(user.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to delete store house user.');
        return;
      }
      await fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete store house user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store House Users</h1>
          <p className="text-gray-500">Manage store house accounts for your school.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Store House User
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={fetchUsers}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[240px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          No store house users found.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      <div>{user.email || '-'}</div>
                      <div>{user.phone || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.gender || '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onResetPassword(user)}
                        disabled={saving}
                        className="p-1.5 rounded hover:bg-amber-50 text-amber-700"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user)}
                        disabled={saving}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => onDeleteStoreHouseUser(user)}
                        disabled={saving}
                        className="p-1.5 rounded hover:bg-red-50 text-red-700"
                        title="Delete Store House User"
                      >
                        <Trash2 className="w-4 h-4" />
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
              <h3 className="text-lg font-semibold">Create Store House User</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={createForm.first_name} onChange={(e) => setCreateForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={createForm.last_name} onChange={(e) => setCreateForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="email" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={createForm.phone} onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={createForm.gender} onChange={(e) => setCreateForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="password" placeholder="Temporary password" value={createForm.password} onChange={(e) => setCreateForm((v) => ({ ...v, password: e.target.value }))} required />
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
              <h3 className="text-lg font-semibold">Edit Store House User</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={editForm.first_name} onChange={(e) => setEditForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={editForm.last_name} onChange={(e) => setEditForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))} />
              <select className="border rounded-lg px-3 py-2" value={editForm.gender} onChange={(e) => setEditForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
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

export default StoreHouseUsersPage;
