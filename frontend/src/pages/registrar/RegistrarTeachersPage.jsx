import { useEffect, useMemo, useState } from 'react';
import { Users, Search, Plus, Loader2, AlertCircle, Edit, X } from 'lucide-react';
import {
  createTeacher,
  deactivateTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  activateTeacher,
  resetUserPassword
} from '../../services/registrarService';

const defaultCreateForm = {
  first_name: '',
  last_name: '',
  gender: 'M',
  date_of_birth: '',
  email: '',
  phone: '',
  qualification: '',
  specialization: ''
};

const defaultEditForm = {
  first_name: '',
  last_name: '',
  gender: 'M',
  date_of_birth: '',
  email: '',
  phone: '',
  qualification: '',
  specialization: ''
};

const RegistrarTeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [credentialsModal, setCredentialsModal] = useState(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await getTeachers({ search, status });
      if (response.success) {
        setTeachers(response.data?.items || []);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load teachers.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [status]);

  const visibleTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      String(t.full_name || '').toLowerCase().includes(q) ||
      String(t.staff_code || '').toLowerCase().includes(q) ||
      String(t.email || '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await createTeacher(createForm);
      if (!response.success) {
        setError(response.error?.message || 'Failed to create teacher.');
        return;
      }
      setCredentialsModal({
        title: 'Teacher Created',
        teacher: response.data?.teacher_credentials || response.data?.credentials || null
      });
      setCreateOpen(false);
      setCreateForm(defaultCreateForm);
      await fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create teacher.');
    } finally {
      setSaving(false);
    }
  };

  const onOpenEdit = async (teacher) => {
    try {
      setSaving(true);
      const response = await getTeacher(teacher.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to load teacher details.');
        return;
      }
      const t = response.data;
      setEditTarget(teacher);
      setEditForm({
        first_name: t.first_name || '',
        last_name: t.last_name || '',
        gender: t.gender || 'M',
        date_of_birth: t.date_of_birth ? String(t.date_of_birth).slice(0, 10) : '',
        email: t.email || '',
        phone: t.phone || '',
        qualification: t.qualification || '',
        specialization: t.specialization || ''
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load teacher details.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSaving(true);
      const response = await updateTeacher(editTarget.id, editForm);
      if (!response.success) {
        setError(response.error?.message || 'Failed to update teacher.');
        return;
      }
      setEditTarget(null);
      await fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update teacher.');
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async (teacher) => {
    try {
      setSaving(true);
      if (teacher.status === 'active') {
        await deactivateTeacher(teacher.id, { reason: 'Manual deactivation by registrar' });
      } else {
        await activateTeacher(teacher.id);
      }
      await fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update teacher status.');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (teacher) => {
    try {
      setSaving(true);
      const targetUserId = teacher.user_id || teacher.id;
      const response = await resetUserPassword(targetUserId);
      if (!response.success) {
        setError(response.error?.message || 'Failed to reset password.');
        return;
      }
      setCredentialsModal({
        title: 'Teacher Password Reset',
        teacher: {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500">Manage teacher records and activation status.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Teacher
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
            placeholder="Search by name, staff code, or email"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={fetchTeachers}
          className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : visibleTeachers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          No teachers found.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Staff Code</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{teacher.full_name}</td>
                  <td className="px-4 py-3">{teacher.staff_code}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      <div>{teacher.email || '-'}</div>
                      <div>{teacher.phone || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenEdit(teacher)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleStatus(teacher)}
                        disabled={saving}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium ${
                          teacher.status === 'active'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                        title={teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => onResetPassword(teacher)}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
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

      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={onCreate} className="w-full max-w-2xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Teacher</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={createForm.first_name} onChange={(e) => setCreateForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={createForm.last_name} onChange={(e) => setCreateForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={createForm.gender} onChange={(e) => setCreateForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="date" value={createForm.date_of_birth} onChange={(e) => setCreateForm((v) => ({ ...v, date_of_birth: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" type="email" placeholder="Email (optional)" value={createForm.email} onChange={(e) => setCreateForm((v) => ({ ...v, email: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={createForm.phone} onChange={(e) => setCreateForm((v) => ({ ...v, phone: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Qualification" value={createForm.qualification} onChange={(e) => setCreateForm((v) => ({ ...v, qualification: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Specialization" value={createForm.specialization} onChange={(e) => setCreateForm((v) => ({ ...v, specialization: e.target.value }))} />
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
          <form onSubmit={onEdit} className="w-full max-w-2xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Teacher</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={editForm.first_name} onChange={(e) => setEditForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={editForm.last_name} onChange={(e) => setEditForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={editForm.gender} onChange={(e) => setEditForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm((v) => ({ ...v, date_of_birth: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Qualification" value={editForm.qualification} onChange={(e) => setEditForm((v) => ({ ...v, qualification: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2" placeholder="Specialization" value={editForm.specialization} onChange={(e) => setEditForm((v) => ({ ...v, specialization: e.target.value }))} />
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
            {credentialsModal.teacher ? (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">Teacher Credentials</p>
                <p>Username: <span className="font-mono">{credentialsModal.teacher.username}</span></p>
                <p>Password: <span className="font-mono">{credentialsModal.teacher.temporary_password}</span></p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RegistrarTeachersPage;
