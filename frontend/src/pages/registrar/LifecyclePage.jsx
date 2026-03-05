import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  listPromotionCriteria,
  previewPromotions,
  commitPromotions,
  getStudentEnrollments,
  getRegistrationBatchById,
  getRegistrationBatches,
  getRegistrationMetadata,
  getStudents
} from '../../services/registrarService';

const RegistrarLifecyclePage = () => {
  const [form, setForm] = useState({
    from_academic_year_id: '',
    to_academic_year_id: '',
    source_grade_level: '',
    default_target_class_id: '',
    promotion_criteria_id: ''
  });
  const [studentId, setStudentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [batch, setBatch] = useState(null);
  const [metadata, setMetadata] = useState({ academic_years: [], grades: [], classes: [] });
  const [promotionCriteria, setPromotionCriteria] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        setMetaLoading(true);
        const [metaRes, criteriaRes, studentsRes, batchesRes] = await Promise.all([
          getRegistrationMetadata(),
          listPromotionCriteria(),
          getStudents({ page: 1, limit: 500 }),
          getRegistrationBatches({ page: 1, limit: 200 })
        ]);
        if (!metaRes.success) throw new Error(metaRes.error?.message || 'Failed to load metadata.');
        setMetadata(metaRes.data || { academic_years: [], grades: [], classes: [] });
        setPromotionCriteria(criteriaRes.success ? criteriaRes.data?.items || [] : []);
        setStudents(studentsRes.success ? studentsRes.data?.items || [] : []);
        setBatches(batchesRes.success ? batchesRes.data?.items || [] : []);
        setForm((prev) => ({
          ...prev,
          from_academic_year_id: prev.from_academic_year_id || String(metaRes.data?.academic_years?.[1]?.id || metaRes.data?.academic_years?.[0]?.id || ''),
          to_academic_year_id: prev.to_academic_year_id || String(metaRes.data?.academic_years?.[0]?.id || ''),
          source_grade_level: prev.source_grade_level || String(metaRes.data?.grades?.[0]?.level || '')
        }));
      } catch (err) {
        setError(err.message || 'Failed to load lifecycle metadata.');
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  const doAction = async (fn, onSuccess) => {
    try {
      setLoading(true);
      const res = await fn();
      if (!res.success) throw new Error(res.error?.message || 'Operation failed.');
      onSuccess(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const payload = {
    from_academic_year_id: Number(form.from_academic_year_id),
    to_academic_year_id: Number(form.to_academic_year_id),
    source_grade_level: Number(form.source_grade_level),
    default_target_class_id: Number(form.default_target_class_id),
    promotion_criteria_id: form.promotion_criteria_id ? Number(form.promotion_criteria_id) : null
  };

  // Target classes for promoted students: one grade level up (e.g. Grade 9 -> Grade 10)
  const classOptions = useMemo(() => {
    const toYear = Number(form.to_academic_year_id);
    const sourceLevel = Number(form.source_grade_level);
    if (!toYear) return [];
    // Promoted students go to next grade: source 9 -> target 10
    const targetLevel = sourceLevel > 0 ? sourceLevel + 1 : null;
    const gradeIds = targetLevel
      ? (metadata.grades || []).filter((g) => Number(g.level) === targetLevel).map((g) => Number(g.id))
      : (metadata.grades || []).map((g) => Number(g.id));
    return (metadata.classes || []).filter((c) => Number(c.academic_year_id) === toYear && (gradeIds.length === 0 || gradeIds.includes(Number(c.grade_id))));
  }, [form.to_academic_year_id, form.source_grade_level, metadata.classes, metadata.grades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lifecycle & Promotions</h1>
        <p className="text-gray-500 mt-1">Preview/commit promotions and inspect enrollment history.</p>
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

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Promotion Preview / Commit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select className="px-3 py-2 border rounded-lg" value={form.from_academic_year_id} onChange={(e) => setForm((f) => ({ ...f, from_academic_year_id: e.target.value }))}>
            <option value="">From Academic Year</option>
            {(metadata.academic_years || []).map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded-lg" value={form.to_academic_year_id} onChange={(e) => setForm((f) => ({ ...f, to_academic_year_id: e.target.value, default_target_class_id: '' }))}>
            <option value="">To Academic Year</option>
            {(metadata.academic_years || []).map((year) => (
              <option key={year.id} value={year.id}>{year.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded-lg" value={form.source_grade_level} onChange={(e) => setForm((f) => ({ ...f, source_grade_level: e.target.value, default_target_class_id: '' }))}>
            <option value="">Source Grade Level</option>
            {(metadata.grades || []).map((grade) => (
              <option key={grade.id} value={grade.level}>Grade {grade.level} ({grade.name})</option>
            ))}
          </select>
          <select className="px-3 py-2 border rounded-lg" value={form.default_target_class_id} onChange={(e) => setForm((f) => ({ ...f, default_target_class_id: e.target.value }))}>
            <option value="">Default Target Class</option>
            {classOptions.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <select
            className={`px-3 py-2 border rounded-lg ${!form.promotion_criteria_id ? 'border-amber-400 bg-amber-50' : ''}`}
            value={form.promotion_criteria_id}
            onChange={(e) => setForm((f) => ({ ...f, promotion_criteria_id: e.target.value }))}
            title="Required. Set by School Head under Promotion Criteria."
          >
            <option value="">Promotion Criteria (required)</option>
            {promotionCriteria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (passing avg: {c.passing_average})
              </option>
            ))}
          </select>
        </div>
        {promotionCriteria.length === 0 ? (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            No promotion criteria found. Ask the School Head to create promotion criteria first (School Portal → Promotion Criteria).
          </div>
        ) : null}
        <div className="flex gap-2">
          <button
            disabled={loading || !form.promotion_criteria_id}
            onClick={() => doAction(() => previewPromotions(payload), (data) => { setPreview(data); setSuccess('Promotion preview generated.'); })}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
          <button
            disabled={loading || !form.promotion_criteria_id}
            onClick={() => doAction(() => commitPromotions({ ...payload, class_mappings: [] }), (data) => { setSuccess(`Promotion commit completed. Batch ${data.batch_code}`); })}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Commit
          </button>
        </div>
        {preview ? (
          <div className="space-y-1">
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              Eligible: {preview.eligible} | Promoted: {preview.promoted} | Repeated: {preview.repeated} | Graduated: {preview.graduated}
              {preview.conflicts?.length ? ` | Conflicts: ${preview.conflicts.length}` : ''}
              {preview.passing_average != null ? ` (passing avg: ${preview.passing_average})` : ''}
            </div>
            {preview.eligible > 0 && preview.promoted === 0 && preview.repeated === preview.eligible ? (
              <p className="text-xs text-amber-700">No students promoted. Ensure Class Head has published semester results for this academic year.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Student Enrollment History</h2>
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded-lg flex-1" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {[s.first_name, s.last_name].filter(Boolean).join(' ') || s.full_name || `Student ${s.id}`}
              </option>
            ))}
          </select>
          <button
            disabled={loading || !studentId}
            onClick={() => doAction(() => getStudentEnrollments(Number(studentId)), (data) => { setEnrollments(data.items || []); setSuccess('Enrollment history loaded.'); })}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            Load
          </button>
        </div>
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.id} className="text-sm border rounded-lg p-2">
              Year: {e.academic_year_name} | Grade: {e.grade_name} | Class: {e.class_name} | Status: {e.status}{e.is_current ? ' | Current' : ''}
            </div>
          ))}
          {enrollments.length === 0 ? <p className="text-sm text-gray-500">No data loaded.</p> : null}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Registration Batch Detail</h2>
        <div className="flex gap-2">
          <select className="px-3 py-2 border rounded-lg flex-1" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.batch_code} ({b.batch_type})</option>
            ))}
          </select>
          <button
            disabled={loading || !batchId}
            onClick={() => doAction(() => getRegistrationBatchById(Number(batchId)), (data) => { setBatch(data); setSuccess('Batch loaded.'); })}
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Load
          </button>
        </div>
        {batch ? (
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
            Code: {batch.batch_code} | Type: {batch.batch_type} | Success: {batch.successful_rows} | Failed: {batch.failed_rows}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No batch loaded.</p>
        )}
      </div>
      {metaLoading ? <p className="text-sm text-gray-500">Loading form options...</p> : null}
    </div>
  );
};

export default RegistrarLifecyclePage;

