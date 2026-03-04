// Student Dashboard - Academic overview with subject performance cards
// Shows overall summary and per-subject scores with link to detailed assessment view
// API: GET /student/profile, GET /student/rank, GET /student/subjects/scores, GET /student/periods

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Award, TrendingUp, BookOpen, RefreshCw,
  AlertCircle, BarChart3, ArrowRight, ClipboardList
} from 'lucide-react';
import { getProfile, getRank, getAvailablePeriods } from '../../services/studentService';
import api from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [subjectScores, setSubjectScores] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load available periods on mount
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await getAvailablePeriods();
        if (res.success && res.data) {
          const years = res.data.academic_years || [];
          const sems = res.data.semesters || [];
          setAcademicYears(years);
          setSemesters(sems);
          if (sems.length > 0) {
            setSelectedSemesterId(String(sems[0].id));
            setSelectedAcademicYearId(String(sems[0].academic_year_id));
          }
        }
      } catch (err) {
        console.error('Error loading periods:', err);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedSemesterId && selectedAcademicYearId) {
      fetchDashboardData();
    } else if (academicYears.length === 0 && semesters.length === 0) {
      // No periods - try fetching profile only
      getProfile().then((r) => r?.success && setProfile(r.data)).finally(() => setLoading(false));
    }
  }, [selectedSemesterId, selectedAcademicYearId]);

  const fetchDashboardData = async () => {
    if (!selectedSemesterId || !selectedAcademicYearId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileRes, rankRes, subjectsRes] = await Promise.all([
        getProfile().catch(() => null),
        getRank({ semester_id: selectedSemesterId, academic_year_id: selectedAcademicYearId, type: 'semester' }).catch(() => null),
        api.get('/student/subjects/scores', { params: { semester_id: selectedSemesterId } }).catch(() => null),
      ]);

      if (profileRes?.success) setProfile(profileRes.data);
      if (rankRes?.success) setRankData(rankRes.data);
      if (subjectsRes?.data?.success) {
        setSubjectScores(subjectsRes.data.data.items || []);
      }
    } catch (err) {
      setError('Failed to load dashboard data.');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const semestersForYear = semesters.filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId));
  const yearsFromSemesters = semesters.reduce((acc, s) => {
    if (!acc.some((y) => String(y.id) === String(s.academic_year_id))) {
      acc.push({ id: s.academic_year_id, name: s.academic_year_name });
    }
    return acc;
  }, []);

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const average = rankData?.scores?.average || 0;
  const rank = rankData?.rank?.position || '—';
  const totalStudents = rankData?.rank?.total_students || 0;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {profile?.name || 'Student'}! Here's your academic overview.
          </p>
        </div>
        {yearsFromSemesters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                const yearId = e.target.value;
                setSelectedAcademicYearId(yearId);
                const first = semesters.find((s) => String(s.academic_year_id) === String(yearId));
                if (first) setSelectedSemesterId(String(first.id));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {yearsFromSemesters.map((y) => (
                <option key={y.id} value={y.id}>{y.name || `Year ${y.id}`}</option>
              ))}
            </select>
            <select
              value={selectedSemesterId}
              onChange={(e) => {
                const sem = semesters.find((s) => String(s.id) === e.target.value);
                setSelectedSemesterId(e.target.value);
                if (sem) setSelectedAcademicYearId(String(sem.academic_year_id));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {semestersForYear.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.academic_year_name || '')} - {s.name || `Semester ${s.semester_number}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Academic Summary Card - filtered by selected year/semester */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Academic Summary</h2>
        <p className="text-sm text-gray-500 mb-4">
          Performance for {semestersForYear.find((s) => String(s.id) === selectedSemesterId)?.name || 'selected semester'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <GraduationCap className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Class</p>
            <p className="text-lg font-bold text-gray-900">{profile?.class_name || '—'}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <BarChart3 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Semester Average</p>
            <p className="text-lg font-bold text-blue-700">{average > 0 ? average.toFixed(1) : '—'}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <Award className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Class Rank</p>
            <p className="text-lg font-bold text-green-700">
              {rank !== '—' ? `${rank} / ${totalStudents}` : '—'}
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">vs Class Avg</p>
            <p className={`text-lg font-bold ${rankData?.comparison?.above_average ? 'text-green-700' : rankData?.comparison?.difference_from_average != null ? 'text-red-600' : 'text-gray-500'}`}>
              {rankData?.comparison?.difference_from_average != null
                ? `${rankData.comparison.difference_from_average > 0 ? '+' : ''}${rankData.comparison.difference_from_average.toFixed(1)}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => navigate('/student/subjects')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            <ClipboardList className="w-4 h-4" /> View Assessment Marks <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/student/semester-report?academic_year_id=${selectedAcademicYearId}`)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            View Semester Report <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/student/rank')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            View Rank Details <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subject Performance */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Subject Performance</h2>
          {subjectScores.length > 0 && (
            <button
              onClick={() => navigate('/student/subjects')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View All Assessment Details <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {subjectScores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectScores.map((subject) => (
              <div
                key={subject.name}
                onClick={() => navigate('/student/subjects')}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Total Weighted Score</p>
                  <p className={`text-2xl font-bold ${subject.score >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>
                    {subject.score?.toFixed(1) || 0}
                    <span className="text-sm text-gray-400 font-normal">/100</span>
                  </p>
                </div>

                {/* Score bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${subject.score >= 50 ? 'bg-indigo-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(subject.score || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />
                  Click to view assessment breakdown
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">No Subject Data Yet</p>
            <p className="text-sm mt-1">Subject scores will appear here once your teachers submit marks.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
