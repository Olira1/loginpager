// Class Snapshot Page - Class Head Portal
// Shows full class performance table with all students, all subjects, totals, averages, and ranks
// API: GET /api/v1/class-head/reports/class-snapshot

import { useState, useEffect } from 'react';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronDown,
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
} from 'lucide-react';
import { getClassSnapshot } from '../../services/classHeadService';

const ClassSnapshotPage = () => {
  // State
  const [snapshot, setSnapshot] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('5');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('3');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch snapshot data
  const fetchSnapshot = async () => {
    try {
      setLoading(true);
      const response = await getClassSnapshot({
        semester_id: parseInt(selectedSemesterId),
        academic_year_id: parseInt(selectedAcademicYearId),
      });

      if (response.success) {
        setSnapshot(response.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching snapshot:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load class snapshot');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and selection change
  useEffect(() => {
    fetchSnapshot();
  }, [selectedSemesterId, selectedAcademicYearId]);

  // Calculate class-wide stats from snapshot data
  const getClassStats = () => {
    if (!snapshot?.items?.length) return null;

    const items = snapshot.items;
    const totals = items.map((s) => s.total).filter((t) => t > 0);
    const averages = items.map((s) => s.average).filter((a) => a > 0);

    return {
      totalStudents: items.length,
      classAverage: averages.length > 0
        ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1)
        : 0,
      highestTotal: totals.length > 0 ? Math.max(...totals) : 0,
      lowestTotal: totals.length > 0 ? Math.min(...totals) : 0,
      promoted: items.filter((s) => s.average >= 50).length,
      notPromoted: items.filter((s) => s.average < 50 && s.average > 0).length,
    };
  };

  const stats = getClassStats();

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-700 bg-green-50';
    if (score >= 70) return 'text-blue-700 bg-blue-50';
    if (score >= 50) return 'text-yellow-700 bg-yellow-50';
    if (score > 0) return 'text-red-700 bg-red-50';
    return 'text-gray-400';
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading class snapshot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Snapshot</h1>
          <p className="text-gray-500 mt-1">
            {snapshot?.class ? (
              <>Complete performance overview for {snapshot.class.name} &mdash; {snapshot.semester}</>
            ) : (
              'View all students with their subject scores, totals, and ranks'
            )}
          </p>
        </div>
        <button
          onClick={fetchSnapshot}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
            <div className="relative">
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="5">First Semester (2017 E.C)</option>
                <option value="6">Second Semester (2017 E.C)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="3">2024/2025 (2017 E.C)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
            <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Students</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalStudents}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
            <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Class Average</p>
            <p className="text-xl font-bold text-gray-900">{stats.classAverage}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Highest Total</p>
            <p className="text-xl font-bold text-green-600">{stats.highestTotal}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
            <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Lowest Total</p>
            <p className="text-xl font-bold text-red-600">{stats.lowestTotal}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100 text-center">
            <Trophy className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Promoted</p>
            <p className="text-xl font-bold text-green-600">{stats.promoted}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-red-100 text-center">
            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Not Promoted</p>
            <p className="text-xl font-bold text-red-600">{stats.notPromoted}</p>
          </div>
        </div>
      )}

      {/* Snapshot Table */}
      {snapshot?.items?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Performance Table — {snapshot.subjects?.length || 0} Subjects
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-12">
                    Rank
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50 z-10 min-w-[180px]">
                    Student Name
                  </th>
                  {/* Dynamic subject columns */}
                  {snapshot.subjects?.map((subject) => (
                    <th
                      key={subject}
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]"
                    >
                      {subject}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 min-w-[80px]">
                    Total
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 min-w-[80px]">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshot.items.map((student) => (
                  <tr
                    key={student.student_id}
                    className={`hover:bg-gray-50 ${student.rank <= 3 ? 'bg-yellow-50/30' : ''}`}
                  >
                    {/* Rank */}
                    <td className="px-3 py-2.5 text-center text-sm font-bold sticky left-0 bg-white">
                      {student.rank <= 3 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          student.rank === 1
                            ? 'bg-yellow-100 text-yellow-700'
                            : student.rank === 2
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {student.rank}
                        </span>
                      ) : (
                        <span className="text-gray-500">{student.rank}</span>
                      )}
                    </td>
                    {/* Student Name */}
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 sticky left-12 bg-white">
                      {student.student_name}
                    </td>
                    {/* Subject Scores */}
                    {snapshot.subjects?.map((subject) => {
                      const score = student.subject_scores?.[subject] || 0;
                      return (
                        <td key={subject} className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(score)}`}>
                            {score > 0 ? score : '—'}
                          </span>
                        </td>
                      );
                    })}
                    {/* Total */}
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-indigo-700 bg-indigo-50/50">
                      {student.total}
                    </td>
                    {/* Average */}
                    <td className="px-3 py-2.5 text-center text-sm font-bold bg-indigo-50/50">
                      <span className={student.average >= 50 ? 'text-green-600' : 'text-red-600'}>
                        {student.average}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500">
            {snapshot.items.length} students &middot; {snapshot.subjects?.length || 0} subjects
          </div>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Snapshot Data</h3>
            <p className="text-gray-500 mt-1">No performance data available for this semester. Ensure grades have been entered and compiled.</p>
          </div>
        )
      )}
    </div>
  );
};

export default ClassSnapshotPage;
