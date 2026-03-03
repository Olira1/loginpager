// Rank Page - View rank and class comparison
// API: GET /student/rank

import { useState, useEffect } from 'react';
import {
  Award, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  BarChart3, Users, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { getAvailablePeriods, getRank } from '../../services/studentService';

const FALLBACK_PERIODS = {
  academic_years: [{ id: 3, name: 'Current Academic Year', is_current: true }],
  semesters: [
    { id: 5, name: 'First Semester', academic_year_id: 3, academic_year_name: 'Current Academic Year' },
    { id: 6, name: 'Second Semester', academic_year_id: 3, academic_year_name: 'Current Academic Year' }
  ]
};

const RankPage = () => {
  const [rankData, setRankData] = useState(null);
  const [periods, setPeriods] = useState({ academic_years: [], semesters: [] });
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const semesters = periods.semesters.filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId));

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await getAvailablePeriods();
        if (res.success) {
          const data = res.data || { academic_years: [], semesters: [] };
          const normalized = (data.academic_years?.length && data.semesters?.length) ? data : FALLBACK_PERIODS;
          setPeriods(normalized);
          const year = normalized.academic_years.find((y) => y.is_current) || normalized.academic_years[0];
          if (year) {
            setSelectedAcademicYearId(String(year.id));
            const sems = (normalized.semesters || []).filter((s) => Number(s.academic_year_id) === Number(year.id));
            if (sems[0]) setSelectedSemester(String(sems[0].id));
          }
        } else {
          setPeriods(FALLBACK_PERIODS);
          setSelectedAcademicYearId(String(FALLBACK_PERIODS.academic_years[0].id));
          setSelectedSemester(String(FALLBACK_PERIODS.semesters[0].id));
        }
      } catch (err) {
        console.error('Failed to load periods:', err);
        setPeriods(FALLBACK_PERIODS);
        setSelectedAcademicYearId(String(FALLBACK_PERIODS.academic_years[0].id));
        setSelectedSemester(String(FALLBACK_PERIODS.semesters[0].id));
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedAcademicYearId) return;
    const sems = (periods.semesters || []).filter((s) => Number(s.academic_year_id) === Number(selectedAcademicYearId));
    if (sems.length > 0 && !sems.some((s) => String(s.id) === String(selectedSemester))) {
      setSelectedSemester(String(sems[0].id));
    }
  }, [selectedAcademicYearId, periods.semesters]);

  useEffect(() => {
    if (selectedSemester && selectedAcademicYearId) fetchRank();
  }, [selectedSemester, selectedAcademicYearId]);

  const fetchRank = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRank({
        semester_id: parseInt(selectedSemester),
        academic_year_id: parseInt(selectedAcademicYearId),
        type: 'semester',
      });
      if (res.success) {
        setRankData(res.data);
      } else {
        setError(res.error?.message || 'Rank data not available.');
      }
    } catch (err) {
      setError('Failed to load rank data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const comparison = rankData?.comparison || {};
  const rank = rankData?.rank || {};
  const scores = rankData?.scores || {};

  // Calculate rank percentile
  const percentile = rank.total_students
    ? Math.round(((rank.total_students - rank.position) / rank.total_students) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Rank</h1>
          <p className="text-gray-500 mt-1">Your rank and class comparison.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedAcademicYearId}
            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {periods.academic_years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.academic_year_name} - {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {rankData ? (
        <>
          {/* Rank Hero Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-8 text-white text-center">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-80" />
            <p className="text-sm opacity-80 mb-1">{rankData.class_name} - {rankData.period}</p>
            <p className="text-6xl font-bold mb-2">
              {rank.position ? `#${rank.position}` : '—'}
            </p>
            <p className="text-sm opacity-80">
              out of {rank.total_students} students
            </p>
            {percentile > 0 && (
              <p className="text-sm mt-2 bg-white/20 inline-block px-3 py-1 rounded-full">
                Top {100 - percentile}% of class
              </p>
            )}
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <BarChart3 className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Your Total</p>
              <p className="text-2xl font-bold text-gray-900">{scores.total?.toFixed(1) || '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Your Average</p>
              <p className="text-2xl font-bold text-gray-900">{scores.average?.toFixed(1) || '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              {comparison.above_average
                ? <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                : <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />}
              <p className="text-xs text-gray-500">Remark</p>
              <p className={`text-lg font-bold ${
                rankData.remark === 'Promoted' ? 'text-green-600' : 'text-red-600'
              }`}>{rankData.remark || 'Pending'}</p>
            </div>
          </div>

          {/* Class Comparison */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Class Comparison
            </h2>

            <div className="space-y-4">
              {/* Class Average */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Minus className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Class Average</p>
                    <p className="text-xs text-gray-500">Average score of all students</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-700">{comparison.class_average?.toFixed(1) || '—'}</p>
              </div>

              {/* Your Difference */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                comparison.above_average ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  {comparison.above_average
                    ? <ArrowUp className="w-5 h-5 text-green-600" />
                    : <ArrowDown className="w-5 h-5 text-red-600" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {comparison.above_average ? 'Above Average' : 'Below Average'}
                    </p>
                    <p className="text-xs text-gray-500">Your score vs class average</p>
                  </div>
                </div>
                <p className={`text-lg font-bold ${comparison.above_average ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.difference_from_average != null
                    ? `${comparison.difference_from_average > 0 ? '+' : ''}${comparison.difference_from_average?.toFixed(1)}`
                    : '—'}
                </p>
              </div>

              {/* Class Highest */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <div className="flex items-center gap-3">
                  <ArrowUp className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Highest in Class</p>
                    <p className="text-xs text-gray-500">Top student's total score</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-700">{comparison.class_highest_total?.toFixed(1) || '—'}</p>
              </div>

              {/* Class Lowest */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                <div className="flex items-center gap-3">
                  <ArrowDown className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Lowest in Class</p>
                    <p className="text-xs text-gray-500">Lowest student's total score</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-amber-700">{comparison.class_lowest_total?.toFixed(1) || '—'}</p>
              </div>
            </div>
          </div>
        </>
      ) : !error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Rank Data</p>
          <p className="text-sm mt-1">Your rank will appear here once semester results are compiled.</p>
        </div>
      ) : null}
    </div>
  );
};

export default RankPage;
