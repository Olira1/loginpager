import { useEffect, useMemo, useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLifecycleSemesters, lockSemesterResults } from '../../services/classHeadService';

const ClassHeadLifecyclePage = () => {
  const [form, setForm] = useState({
    semester_id: '',
    academic_year_id: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [semesters, setSemesters] = useState([]);

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        setMetaLoading(true);
        const res = await getLifecycleSemesters();
        if (!res.success) throw new Error(res.error?.message || 'Failed to load semesters.');
        const items = res.data?.items || [];
        setSemesters(items);
        if (items[0]) {
          setForm((prev) => ({
            ...prev,
            semester_id: String(items[0].id),
            academic_year_id: String(items[0].academic_year_id)
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load lifecycle options.');
      } finally {
        setMetaLoading(false);
      }
    };
    loadSemesters();
  }, []);

  const selectedSemester = useMemo(
    () => semesters.find((sem) => String(sem.id) === String(form.semester_id)),
    [form.semester_id, semesters]
  );

  const handleLock = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await lockSemesterResults({
        semester_id: Number(form.semester_id),
        academic_year_id: Number(form.academic_year_id),
        reason: form.reason || 'Locked from class head lifecycle page'
      });
      if (!res.success) throw new Error(res.error?.message || 'Failed to lock semester.');
      setSuccess('Semester locked successfully.');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to lock semester.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Semester Lifecycle</h1>
        <p className="text-gray-500 mt-1">Lock finalized semester results.</p>
      </div>

      {error ? (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{success}</span>
        </div>
      ) : null}

      <form onSubmit={handleLock} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={form.semester_id}
            onChange={(e) => {
              const semester = semesters.find((sem) => String(sem.id) === e.target.value);
              setForm((f) => ({
                ...f,
                semester_id: e.target.value,
                academic_year_id: semester ? String(semester.academic_year_id) : ''
              }));
            }}
            className="px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select semester</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.academic_year_name} - {sem.name || `Semester ${sem.semester_number}`}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Academic Year"
            value={selectedSemester?.academic_year_name || ''}
            className="px-3 py-2 border rounded-lg"
            disabled
            required
          />
        </div>
        {selectedSemester ? (
          <p className="text-xs text-gray-500">
            Selected status: {selectedSemester.lifecycle_status}
          </p>
        ) : null}
        <input
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Lock className="w-4 h-4" />
          {loading ? 'Locking...' : 'Lock Semester'}
        </button>
      </form>
      {metaLoading ? <p className="text-sm text-gray-500">Loading semester options...</p> : null}
    </div>
  );
};

export default ClassHeadLifecyclePage;

