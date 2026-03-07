import { useEffect, useMemo, useState } from 'react';
import { Users, Search, Plus, Loader2, AlertCircle, Edit, X, KeyRound } from 'lucide-react';
import {
  createStudent,
  deactivateStudent,
  getStudents,
  getStudent,
  updateStudent,
  activateStudent,
  getRegistrationMetadata,
  resetUserPassword
} from '../../services/registrarService';

const defaultCreateForm = {
  first_name: '',
  last_name: '',
  gender: 'M',
  date_of_birth: '',
  grade_id: '',
  class_id: '',
  academic_year_id: '',
  parent_first_name: '',
  parent_last_name: '',
  parent_phone: '',
  parent_relationship: 'father'
};

const defaultEditForm = {
  first_name: '',
  last_name: '',
  gender: 'M',
  date_of_birth: '',
  grade_id: '',
  class_id: '',
  academic_year_id: '',
  parent_first_name: '',
  parent_last_name: '',
  parent_phone: '',
  parent_relationship: 'father'
};

const RegistrarStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [filterYear, setFilterYear] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [metadata, setMetadata] = useState({ grades: [], classes: [], academic_years: [] });
  const [metadataLoading, setMetadataLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = { search, status };
      if (filterYear) params.academic_year_id = filterYear;
      if (filterGrade) params.grade_id = filterGrade;
      if (filterClass) params.class_id = filterClass;
      const response = await getStudents(params);
      if (response.success) {
        setStudents(response.data?.items || []);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load students.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      const response = await getRegistrationMetadata();
      if (response.success) {
        setMetadata(response.data || { grades: [], classes: [], academic_years: [] });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load grade/class/year options.');
    } finally {
      setMetadataLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchMetadata();
  }, [status, filterYear, filterGrade, filterClass]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      String(s.full_name || '').toLowerCase().includes(q) ||
      String(s.student_code || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const classesForFilter = useMemo(() => {
    if (!filterGrade) return metadata.classes || [];
    let list = (metadata.classes || []).filter((c) => Number(c.grade_id) === Number(filterGrade));
    if (filterYear) {
      list = list.filter((c) => Number(c.academic_year_id) === Number(filterYear));
    }
    return list;
  }, [metadata.classes, filterGrade, filterYear]);

  const classesForCreateGrade = useMemo(() => {
    if (!createForm.grade_id) return [];
    let list = (metadata.classes || []).filter((c) => Number(c.grade_id) === Number(createForm.grade_id));
    if (createForm.academic_year_id) {
      list = list.filter((c) => Number(c.academic_year_id) === Number(createForm.academic_year_id));
    }
    return list;
  }, [metadata.classes, createForm.grade_id, createForm.academic_year_id]);

  const classesForEditGrade = useMemo(() => {
    if (!editForm.grade_id) return [];
    let list = (metadata.classes || []).filter((c) => Number(c.grade_id) === Number(editForm.grade_id));
    if (editForm.academic_year_id) {
      list = list.filter((c) => Number(c.academic_year_id) === Number(editForm.academic_year_id));
    }
    return list;
  }, [metadata.classes, editForm.grade_id, editForm.academic_year_id]);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        gender: createForm.gender,
        date_of_birth: createForm.date_of_birth,
        grade_id: Number(createForm.grade_id),
        class_id: Number(createForm.class_id),
        academic_year_id: Number(createForm.academic_year_id),
        parent: {
          first_name: createForm.parent_first_name,
          last_name: createForm.parent_last_name,
          phone: createForm.parent_phone,
          relationship: createForm.parent_relationship
        }
      };
      const response = await createStudent(payload);
      if (!response.success) {
        setError(response.error?.message || 'Failed to create student.');
        return;
      }

      setCredentialsModal({
        title: 'Student Created',
        student: response.data?.student_credentials || null,
        parent: response.data?.parent_credentials || null
      });
      setCreateOpen(false);
      setCreateForm(defaultCreateForm);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create student.');
    } finally {
      setSaving(false);
    }
  };

  const onOpenEdit = async (student) => {
    try {
      setSaving(true);
      const response = await getStudent(student.id);
      if (!response.success) {
        setError(response.error?.message || 'Failed to load student details.');
        return;
      }
      const s = response.data;
      setEditTarget(student);
      setEditForm({
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        gender: s.gender || 'M',
        date_of_birth: s.date_of_birth ? String(s.date_of_birth).slice(0, 10) : '',
        grade_id: s.grade?.id ? String(s.grade.id) : '',
        class_id: s.class?.id ? String(s.class.id) : '',
        academic_year_id: s.academic_year?.id ? String(s.academic_year.id) : '',
        parent_first_name: s.parent?.full_name ? String(s.parent.full_name).split(' ')[0] : '',
        parent_last_name: s.parent?.full_name ? String(s.parent.full_name).split(' ').slice(1).join(' ') : '',
        parent_phone: s.parent?.phone || '',
        parent_relationship: s.parent?.relationship || 'father'
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load student details.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSaving(true);
      const response = await updateStudent(editTarget.id, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth,
        grade_id: Number(editForm.grade_id),
        class_id: Number(editForm.class_id),
        academic_year_id: Number(editForm.academic_year_id),
        parent: {
          first_name: editForm.parent_first_name,
          last_name: editForm.parent_last_name,
          phone: editForm.parent_phone,
          relationship: editForm.parent_relationship
        }
      });
      if (!response.success) {
        setError(response.error?.message || 'Failed to update student.');
        return;
      }
      setEditTarget(null);
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async (student) => {
    try {
      setSaving(true);
      if (student.status === 'active') {
        await deactivateStudent(student.id, { reason: 'Manual deactivation by registrar' });
      } else {
        await activateStudent(student.id);
      }
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update student status.');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async (student) => {
    try {
      setSaving(true);
      const targetUserId = student.user_id || student.id;
      const response = await resetUserPassword(targetUserId);
      if (!response.success) {
        setError(response.error?.message || 'Failed to reset password.');
        return;
      }
      setCredentialsModal({
        title: 'Student Password Reset',
        student: {
          username: response.data?.username,
          temporary_password: response.data?.new_temporary_password,
          must_change_password: response.data?.must_change_password
        },
        parent: null
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
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">Manage student records, updates, status, and credentials.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Student
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
            placeholder="Search by name or student code"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterClass(''); }} className="px-3 py-2 border border-gray-300 rounded-lg" disabled={metadataLoading}>
          <option value="">All Years</option>
          {(metadata.academic_years || []).map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
        </select>
        <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setFilterClass(''); }} className="px-3 py-2 border border-gray-300 rounded-lg" disabled={metadataLoading}>
          <option value="">All Grades</option>
          {(metadata.grades || []).map((g) => <option key={g.id} value={g.id}>{g.level ? `Grade ${g.level}` : g.name}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" disabled={metadataLoading}>
          <option value="">All Classes</option>
          {classesForFilter.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={fetchStudents} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : visibleStudents.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          No students found.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{student.full_name}</td>
                  <td className="px-4 py-3">{student.student_code}</td>
                  <td className="px-4 py-3">{student.class?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onOpenEdit(student)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleStatus(student)}
                        disabled={saving}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium ${student.status === 'active' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {student.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => onResetPassword(student)}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 inline-flex items-center gap-1"
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

      {createOpen ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={onCreate} className="w-full max-w-3xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Student</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={createForm.first_name} onChange={(e) => setCreateForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={createForm.last_name} onChange={(e) => setCreateForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={createForm.gender} onChange={(e) => setCreateForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="date" value={createForm.date_of_birth} onChange={(e) => setCreateForm((v) => ({ ...v, date_of_birth: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={createForm.grade_id} onChange={(e) => setCreateForm((v) => ({ ...v, grade_id: e.target.value, class_id: '' }))} required disabled={metadataLoading}>
                <option value="">Select Grade</option>
                {(metadata.grades || []).map((g) => <option key={g.id} value={g.id}>{g.level ? `Grade ${g.level}` : g.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={createForm.academic_year_id} onChange={(e) => setCreateForm((v) => ({ ...v, academic_year_id: e.target.value, class_id: '' }))} required disabled={metadataLoading}>
                <option value="">Select Academic Year</option>
                {(metadata.academic_years || []).map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={createForm.class_id} onChange={(e) => setCreateForm((v) => ({ ...v, class_id: e.target.value }))} required disabled={!createForm.grade_id || metadataLoading}>
                <option value="">{createForm.grade_id && createForm.academic_year_id ? 'Select Class' : 'Select Grade and Year first'}</option>
                {classesForCreateGrade.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="border rounded-lg px-3 py-2" placeholder="Parent first name" value={createForm.parent_first_name} onChange={(e) => setCreateForm((v) => ({ ...v, parent_first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Parent last name" value={createForm.parent_last_name} onChange={(e) => setCreateForm((v) => ({ ...v, parent_last_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Parent phone" value={createForm.parent_phone} onChange={(e) => setCreateForm((v) => ({ ...v, parent_phone: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={createForm.parent_relationship} onChange={(e) => setCreateForm((v) => ({ ...v, parent_relationship: e.target.value }))}>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">{saving ? 'Saving...' : 'Create'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center p-4">
          <form onSubmit={onEdit} className="w-full max-w-3xl bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Student</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2" placeholder="First name" value={editForm.first_name} onChange={(e) => setEditForm((v) => ({ ...v, first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Last name" value={editForm.last_name} onChange={(e) => setEditForm((v) => ({ ...v, last_name: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={editForm.gender} onChange={(e) => setEditForm((v) => ({ ...v, gender: e.target.value }))}>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm((v) => ({ ...v, date_of_birth: e.target.value }))} />
              <select className="border rounded-lg px-3 py-2" value={editForm.grade_id} onChange={(e) => setEditForm((v) => ({ ...v, grade_id: e.target.value, class_id: '' }))} required disabled={metadataLoading}>
                <option value="">Select Grade</option>
                {(metadata.grades || []).map((g) => <option key={g.id} value={g.id}>{g.level ? `Grade ${g.level}` : g.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={editForm.academic_year_id} onChange={(e) => setEditForm((v) => ({ ...v, academic_year_id: e.target.value, class_id: '' }))} required disabled={metadataLoading}>
                <option value="">Select Academic Year</option>
                {(metadata.academic_years || []).map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={editForm.class_id} onChange={(e) => setEditForm((v) => ({ ...v, class_id: e.target.value }))} required disabled={!editForm.grade_id || metadataLoading}>
                <option value="">{editForm.grade_id && editForm.academic_year_id ? 'Select Class' : 'Select Grade and Year first'}</option>
                {classesForEditGrade.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="border rounded-lg px-3 py-2" placeholder="Parent first name" value={editForm.parent_first_name} onChange={(e) => setEditForm((v) => ({ ...v, parent_first_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Parent last name" value={editForm.parent_last_name} onChange={(e) => setEditForm((v) => ({ ...v, parent_last_name: e.target.value }))} required />
              <input className="border rounded-lg px-3 py-2" placeholder="Parent phone" value={editForm.parent_phone} onChange={(e) => setEditForm((v) => ({ ...v, parent_phone: e.target.value }))} required />
              <select className="border rounded-lg px-3 py-2" value={editForm.parent_relationship} onChange={(e) => setEditForm((v) => ({ ...v, parent_relationship: e.target.value }))}>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 rounded-lg border border-gray-300">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {credentialsModal ? (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{credentialsModal.title}</h3>
              <button type="button" onClick={() => setCredentialsModal(null)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            {credentialsModal.student ? (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">Student Credentials</p>
                <p>Username: <span className="font-mono">{credentialsModal.student.username}</span></p>
                <p>Password: <span className="font-mono">{credentialsModal.student.temporary_password}</span></p>
              </div>
            ) : null}
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

export default RegistrarStudentsPage;
