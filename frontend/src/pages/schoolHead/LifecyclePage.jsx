import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getLifecycleAcademicYears,
  getLifecycleSemesters,
  initializeClassesForAcademicYear,
  openSemester,
  closeSemesterSubmission,
  lockSemester,
  reopenSemester
} from '../../services/schoolHeadService';

const LifecyclePage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [initForm, setInitForm] = useState({
    target_academic_year_id: '',
    source_academic_year_id: '',
    copy_class_heads: false
  });
  const [semesterForm, setSemesterForm] = useState({
    semester_id: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMeta = async () => {
    try {
      setMetaLoading(true);
      const [yearsRes, semRes] = await Promise.all([getLifecycleAcademicYears(), getLifecycleSemesters()]);
      if (!yearsRes.success) throw new Error(yearsRes.error?.message || 'Failed to load academic years.');
      if (!semRes.success) throw new Error(semRes.error?.message || 'Failed to load semesters.');
      const years = yearsRes.data?.items || [];
      const semItems = semRes.data?.items || [];
      setAcademicYears(years);
      setSemesters(semItems);
      setInitForm((prev) => ({
        ...prev,
        target_academic_year_id: prev.target_academic_year_id || String(years[0]?.id || ''),
        source_academic_year_id: prev.source_academic_year_id || String(years[1]?.id || years[0]?.id || '')
      }));
      setSemesterForm((prev) => ({
        ...prev,
        semester_id: semItems.some((x) => String(x.id) === String(prev.semester_id))
          ? prev.semester_id
          : String(semItems[0]?.id || '')
      }));
    } catch (err) {
      setError(err.message || 'Failed to load lifecycle metadata.');
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const semesterOptions = useMemo(() => {
    if (!semesters.length) return [];
    return semesters.map((sem) => ({
      value: String(sem.id),
      label: `${sem.academic_year_name} - ${sem.name || `Semester ${sem.semester_number}`}`
    }));
  }, [semesters]);

  const run = async (fn, payload, successMsg) => {
    try {
      setLoading(true);
      const res = await fn(payload);
      if (!res.success) throw new Error(res.error?.message || 'Operation failed.');
      setSuccess(successMsg);
      setError('');
    } catch (err) {
      setError(err.message || 'Operation failed.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await initializeClassesForAcademicYear(Number(initForm.target_academic_year_id), {
        source_academic_year_id: Number(initForm.source_academic_year_id),
        copy_class_heads: !!initForm.copy_class_heads
      });
      if (!res.success) throw new Error(res.error?.message || 'Operation failed.');
      const createdSemesters = Number(res.data?.created_semesters || 0);
      setSuccess(
        createdSemesters > 0
          ? `Class initialization completed. ${createdSemesters} semester(s) created for target year.`
          : 'Class initialization completed.'
      );
      setError('');
      await loadMeta();
    } catch (err) {
      setError(err.message || 'Operation failed.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterAction = async (action) => {
    const semesterId = Number(semesterForm.semester_id);
    const data = { reason: semesterForm.reason || 'Lifecycle action from school head page' };
    if (!semesterId) {
      setError('semester_id is required.');
      return;
    }

    if (action === 'open') await run((x) => openSemester(x.semesterId, x.data), { semesterId, data }, 'Semester opened.');
    if (action === 'close') await run((x) => closeSemesterSubmission(x.semesterId, x.data), { semesterId, data }, 'Semester submissions closed.');
    if (action === 'lock') await run((x) => lockSemester(x.semesterId, x.data), { semesterId, data }, 'Semester locked.');
    if (action === 'reopen') await run((x) => reopenSemester(x.semesterId, x.data), { semesterId, data }, 'Semester reopened.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lifecycle Operations</h1>
        <p className="text-gray-500 mt-1">Incremental lifecycle controls for classes and semesters.</p>
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

      <form onSubmit={handleInitialize} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Initialize Classes for Academic Year</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={initForm.target_academic_year_id}
            onChange={(e) => setInitForm((f) => ({ ...f, target_academic_year_id: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select target academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <select
            value={initForm.source_academic_year_id}
            onChange={(e) => setInitForm((f) => ({ ...f, source_academic_year_id: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
            required
          >
            <option value="">Select source academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
            <input
              type="checkbox"
              checked={initForm.copy_class_heads}
              onChange={(e) => setInitForm((f) => ({ ...f, copy_class_heads: e.target.checked }))}
            />
            Copy class heads
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Processing...' : 'Initialize Classes'}
        </button>
      </form>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-indigo-600" />
          Semester Lifecycle Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={semesterForm.semester_id}
            onChange={(e) => setSemesterForm((f) => ({ ...f, semester_id: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Select semester</option>
            {semesterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            placeholder="Reason (optional)"
            value={semesterForm.reason}
            onChange={(e) => setSemesterForm((f) => ({ ...f, reason: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleSemesterAction('open')} disabled={loading} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Open</button>
          <button onClick={() => handleSemesterAction('close')} disabled={loading} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Close Submission</button>
          <button onClick={() => handleSemesterAction('lock')} disabled={loading} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Lock</button>
          <button onClick={() => handleSemesterAction('reopen')} disabled={loading} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Reopen</button>
        </div>
      </div>

      {loading || metaLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          {metaLoading ? 'Loading lifecycle options...' : 'Processing...'}
        </div>
      ) : null}
    </div>
  );
};

export default LifecyclePage;

