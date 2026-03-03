import { useState, useEffect } from 'react';
import {
  Settings, AlertCircle, RefreshCw, CheckCircle2, Info,
  Save, RotateCcw, Lightbulb, ArrowRight, Plus, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getAssignedClasses,
  getTeacherAcademicYears,
  getTeacherSemesters,
  getAssessmentWeights,
  getWeightSuggestions,
  setAssessmentWeights,
  createTeacherAssessmentType
} from '../../services/classHeadService';

const DEFAULT_SEMESTERS = [
  { id: 5, name: 'First Semester' },
  { id: 6, name: 'Second Semester' }
];

const AssessmentWeightsPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [weights, setWeights] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newAssessmentTypeName, setNewAssessmentTypeName] = useState('');

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await getTeacherAcademicYears();
        if (res.success) {
          const years = res.data.items || [];
          setAcademicYears(years);
          const current = years.find((y) => y.is_current) || years[0];
          if (current) setSelectedAcademicYearId(String(current.id));
        }
      } catch (err) {
        console.error('Load class head years error:', err);
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    fetchClasses();
    const loadSemesters = async () => {
      if (!selectedAcademicYearId) {
        setSemesters(DEFAULT_SEMESTERS);
        setSelectedSemester(String(DEFAULT_SEMESTERS[0].id));
        return;
      }
      try {
        const res = await getTeacherSemesters({ academic_year_id: selectedAcademicYearId });
        if (res.success) {
          const items = res.data.items || [];
          if (items.length > 0) {
            setSemesters(items);
            setSelectedSemester(String(items[0].id));
          } else {
            setSemesters(DEFAULT_SEMESTERS);
            setSelectedSemester(String(DEFAULT_SEMESTERS[0].id));
          }
        }
      } catch (err) {
        console.error('Load class head semesters error:', err);
      }
    };
    loadSemesters();
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (!selectedClass) return;
    const cls = classes.find((c) => c.class_id === parseInt(selectedClass, 10));
    setAvailableSubjects(cls?.subjects || []);
    setSelectedSubject('');
    setWeights([]);
    setSuggestions([]);
  }, [selectedClass, classes]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedSemester) {
      fetchWeights();
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await getAssignedClasses(selectedAcademicYearId ? { academic_year_id: selectedAcademicYearId } : {});
      if (response.success) {
        setClasses(response.data?.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeights = async () => {
    setWeightsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const params = { class_id: selectedClass, subject_id: selectedSubject, semester_id: selectedSemester };
      const [weightsRes, suggestionsRes] = await Promise.all([
        getAssessmentWeights(params).catch(() => null),
        getWeightSuggestions(params).catch(() => null)
      ]);

      if (suggestionsRes?.success) {
        setSuggestions(suggestionsRes.data?.suggested_weights || suggestionsRes.data?.suggestions || []);
      }

      if (weightsRes?.success && weightsRes.data?.weights?.length > 0) {
        setWeights(weightsRes.data.weights.map((w) => ({
          assessment_type_id: w.assessment_type_id,
          name: w.assessment_type_name || w.name || `Type ${w.assessment_type_id}`,
          weight_percent: parseFloat(w.weight_percent) || 0
        })));
        setSource(weightsRes.data.source || 'teacher_defined');
      } else if (suggestionsRes?.success) {
        const suggestedWeights = suggestionsRes.data?.suggested_weights || suggestionsRes.data?.suggestions || [];
        setWeights(suggestedWeights.map((s) => ({
          assessment_type_id: s.assessment_type_id,
          name: s.assessment_type_name || s.name || `Type ${s.assessment_type_id}`,
          weight_percent: parseFloat(s.weight_percent || s.default_weight_percent) || 0
        })));
        setSource(suggestionsRes.data?.source || 'default');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load weights.');
    } finally {
      setWeightsLoading(false);
    }
  };

  const handleWeightChange = (index, value) => {
    const updated = [...weights];
    updated[index] = { ...updated[index], weight_percent: parseFloat(value) || 0 };
    setWeights(updated);
    setSuccess(null);
  };

  const handleAddAssessmentType = async () => {
    const name = newAssessmentTypeName.trim();
    if (!name) {
      setError('Assessment type name is required.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const response = await createTeacherAssessmentType({
        name,
        class_id: parseInt(selectedClass, 10),
        subject_id: parseInt(selectedSubject, 10)
      });
      if (!response.success) {
        setError(response.error?.message || 'Failed to add assessment type.');
        return;
      }
      setNewAssessmentTypeName('');
      await fetchWeights();
      setSuccess('Assessment type added. Set its weight and save.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to add assessment type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssessmentType = (assessmentTypeId) => {
    if (!window.confirm('Remove this assessment type from the current weight setup?')) return;
    const next = weights.filter((w) => w.assessment_type_id !== assessmentTypeId);
    setWeights(next);
    setSuccess('Assessment type removed from current setup. Click "Save Weights" to apply.');
    setError(null);
  };

  const loadSuggestions = async () => {
    setError(null);
    setSuccess(null);
    try {
      const params = { class_id: selectedClass, subject_id: selectedSubject, semester_id: selectedSemester };
      const res = await getWeightSuggestions(params);
      if (res?.success) {
        const freshSuggestions = res.data?.suggested_weights || [];
        setSuggestions(freshSuggestions);
        setWeights(freshSuggestions.map((s) => ({
          assessment_type_id: s.assessment_type_id,
          name: s.assessment_type_name || s.name || `Type ${s.assessment_type_id}`,
          weight_percent: parseFloat(s.weight_percent || s.default_weight_percent) || 0
        })));
        setSource(res.data?.source || 'default');
      }
    } catch (err) {
      console.error('Load class head suggestions error:', err);
    }
  };

  const totalWeight = weights.reduce((sum, w) => sum + (w.weight_percent || 0), 0);

  const handleSave = async () => {
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(`Weights must sum to exactly 100%. Currently: ${totalWeight.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await setAssessmentWeights({
        class_id: parseInt(selectedClass, 10),
        subject_id: parseInt(selectedSubject, 10),
        semester_id: parseInt(selectedSemester, 10),
        weights: weights.map((w) => ({
          assessment_type_id: w.assessment_type_id,
          weight_percent: w.weight_percent
        }))
      });
      if (response.success) {
        setSuccess('Assessment weights saved successfully!');
        setSource('teacher_defined');
        await fetchWeights();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save weights.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assessment Setup</h1>
        <p className="text-gray-500 mt-1">Define custom assessment breakdowns and weights for your subjects.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class, Subject & Semester</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year</label>
            <select value={selectedAcademicYearId} onChange={(e) => setSelectedAcademicYearId(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg">
              <option value="">All Years</option>
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg">
              <option value="">Select Class</option>
              {classes.map((cls) => <option key={cls.class_id} value={cls.class_id}>{cls.class_name} ({cls.grade?.name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={!selectedClass} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-100">
              <option value="">Select Subject</option>
              {availableSubjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg">
              <option value="">Select Semester</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.academic_year_name ? `${s.academic_year_name} - ${s.name}` : s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700"><AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span></div>}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between text-green-700">
          <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5" /><span className="text-sm">{success}</span></div>
          <button onClick={() => navigate('/class-head/grades')} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Go to Grade Entry <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {weightsLoading ? (
        <div className="flex items-center justify-center h-40"><RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      ) : selectedClass && selectedSubject && selectedSemester ? (
        <>
          {source === 'teacher_defined' && (
            <button onClick={loadSuggestions} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              <Lightbulb className="w-4 h-4" />
              Load Latest School Head Weight Template
            </button>
          )}

          {source && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Info className="w-4 h-4" />
              <span>Source: {source === 'teacher_defined' ? 'Custom (set by you)' : source === 'weight_template' ? 'Weight Template (from School Head)' : 'Default (School Head suggestions)'}</span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Assessment Categories</h2>
                <p className="text-xs text-gray-500 mt-1">Class heads can add/remove assessment types and tune weights.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="text" value={newAssessmentTypeName} onChange={(e) => setNewAssessmentTypeName(e.target.value)} placeholder="New assessment type (e.g., Oral)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64" />
                <button onClick={handleAddAssessmentType} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {weights.map((w, index) => (
                <div key={w.assessment_type_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-gray-400" />
                      {w.name}
                    </h3>
                    <button onClick={() => handleDeleteAssessmentType(w.assessment_type_id)} disabled={saving} className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-50" title="Remove assessment type from this setup">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-20">Weight (%):</span>
                    <input type="range" min="0" max="100" step="1" value={w.weight_percent || 0} onChange={(e) => handleWeightChange(index, e.target.value)} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <input type="number" min="0" max="100" value={w.weight_percent || 0} onChange={(e) => handleWeightChange(index, e.target.value)} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary & Actions</h2>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-gray-900">
                  Total Assessment Weight:{' '}
                  <span className={Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                    {totalWeight.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={loadSuggestions} disabled={suggestions.length === 0} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </button>
                <button onClick={handleSave} disabled={saving || Math.abs(totalWeight - 100) >= 0.01} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Weights'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Settings className="w-12 h-12 mx-auto mb-3" />
          <p>Select a class, subject, and semester to configure weights.</p>
        </div>
      )}
    </div>
  );
};

export default AssessmentWeightsPage;
