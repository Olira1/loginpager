import { useEffect, useState } from 'react';
import { Calendar, Loader2, AlertCircle, Lock, Unlock, CheckCircle2, Plus } from 'lucide-react';
import {
  getAcademicYears,
  createAcademicYear,
  activateAcademicYear,
  lockAcademicYear,
  reopenAcademicYear
} from '../../services/adminService';

const AcademicYearsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    set_as_current: false
  });

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const res = await getAcademicYears();
      if (!res.success) throw new Error(res.error?.message || 'Failed to load academic years.');
      setItems(res.data?.items || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load academic years.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademicYears();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await createAcademicYear(form);
      if (!res.success) throw new Error(res.error?.message || 'Failed to create academic year.');
      setSuccess('Academic year created successfully.');
      setForm({ name: '', start_date: '', end_date: '', set_as_current: false });
      await loadAcademicYears();
    } catch (err) {
      setError(err.message || 'Failed to create academic year.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (actionFn, id, actionLabel) => {
    try {
      setSubmitting(true);
      const res = await actionFn(id, { reason: `${actionLabel} from admin page` });
      if (!res.success) throw new Error(res.error?.message || `Failed to ${actionLabel.toLowerCase()}.`);
      setSuccess(`Academic year ${actionLabel.toLowerCase()}d successfully.`);
      await loadAcademicYears();
    } catch (err) {
      setError(err.message || `Failed to ${actionLabel.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academic Year Lifecycle</h1>
        <p className="text-gray-500 mt-1">Manage year creation, activation, lock, and reopen operations.</p>
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

      <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Academic Year
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="2018 E.C"
            className="px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            className="px-3 py-2 border rounded-lg"
            required
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
            <input
              type="checkbox"
              checked={form.set_as_current}
              onChange={(e) => setForm((f) => ({ ...f, set_as_current: e.target.checked }))}
            />
            Set as current
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Create Academic Year'}
        </button>
      </form>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Academic Years</h2>
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((year) => (
              <div key={year.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    {year.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {String(year.start_date || '').slice(0, 10)} - {String(year.end_date || '').slice(0, 10)} | Status: {year.lifecycle_status}
                    {year.is_current ? ' | Current' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAction(activateAcademicYear, year.id, 'Activate')}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => runAction(lockAcademicYear, year.id, 'Lock')}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 inline-flex items-center gap-1"
                    disabled={submitting}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock
                  </button>
                  <button
                    onClick={() => runAction(reopenAcademicYear, year.id, 'Reopen')}
                    className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 inline-flex items-center gap-1"
                    disabled={submitting}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Reopen
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-gray-500">No academic years found.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicYearsPage;

