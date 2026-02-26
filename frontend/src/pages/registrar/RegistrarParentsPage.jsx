import { useEffect, useMemo, useState } from 'react';
import { Users, Search, Loader2, AlertCircle, Eye, Edit, X, KeyRound } from 'lucide-react';
import { getParent, getParents, updateParent, resetUserPassword } from '../../services/registrarService';

const defaultEditForm = {
  first_name: '',
  last_name: '',
  phone: ''
};

const RegistrarParentsPage = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [details, setDetails] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [credentialsModal, setCredentialsModal] = useState(null);

  const fetchParents = async () => {
    try {
      setLoading(true);
      const response = await getParents({ search });
      if (response.success) {
        setParents(response.data?.items || []);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load parents.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load parents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, []);

  const visibleParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      String(p.full_name || '').toLowerCase().includes(q) ||
      String(p.phone || '').toLowerCase().includes(q)
    );
  }, [parents, search]);

  const onOpenDetails = async (parentId) => {
    try {
      const response = await getParent(parentId);
      if (response.success) {
        setDetails(response.data);
      } else {
        setError(response.error?.message || 'Failed to load parent details.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load parent details.');
    }
  };

  const onOpenEdit = (parent) => {
    const names = String(parent.full_name || '').split(' ');
    setEditTarget(parent);
    setEditForm({
      first_name: names[0] || '',
      last_name: names.slice(1).join(' ') || '',
      phone: parent.phone || ''
    });
  };

  const onEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSaving(true);
      const response = await updateParent(editTarget.id, editForm);
      if (!response.success) {
        setError(response.error?.message || 'Failed to update parent.');
        return;
      }
      setEditTarget(null);
      await fetchParents();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update parent.');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (parent) => {
    try {
      setSaving(true);
      const response = await resetUserPassword(parent.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to reset password.');
        return;
      }
      setCredentialsModal({
        title: 'Parent Password Reset',
        parent: {
          username: response.data?.username,
          temporary_password: response.data?.new_temporary_password,
          must_change_password: response.data?.must_change_password
        }
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
        <p className="text-gray-500">View parent records and update contact information.</p>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={fetchParents}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : visibleParents.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          No parents found.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Children</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleParents.map((parent) => (
                <tr key={parent.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{parent.full_name}</td>
                  <td className="px-4 py-3">{parent.phone || '-'}</td>
                  <td className="px-4 py-3">{parent.children_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenDetails(parent.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEdit(parent)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onResetPassword(parent)}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 inline-flex items-center gap-1"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3 h-3" />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Parent Details</h3>
              <button type="button" onClick={() => setDetails(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">Full name:</span> {details.full_name}</p>
              <p><span className="font-medium">Phone:</span> {details.phone || '-'}</p>
              <p><span className="font-medium">Username:</span> {details.user_account?.username || '-'}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Children</h4>
              {details.children?.length ? (
                <div className="space-y-2">
                  {details.children.map((child) => (
                    <div key={child.student_id} className="border border-gray-200 rounded-lg p-3 text-sm">
                      <p className="font-medium text-gray-900">{child.full_name}</p>
                      <p className="text-gray-600">Code: {child.student_code}</p>
                      <p className="text-gray-600">Class: {child.class_name}</p>
                      <p className="text-gray-600">Relationship: {child.relationship}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No linked children.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={onEdit} className="w-full max-w-xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Parent</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={editForm.first_name} onChange={(e) => setEditForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={editForm.last_name} onChange={(e) => setEditForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2 md:col-span-2" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))} required />
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
                <X className="w-4 h-4" />
              </button>
            </div>
            {credentialsModal.parent ? (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">Parent Credentials</p>
                <p>Username: <span className="font-mono">{credentialsModal.parent.username}</span></p>
                <p>Password: <span className="font-mono">{credentialsModal.parent.temporary_password}</span></p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RegistrarParentsPage;
