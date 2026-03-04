// Store House Dashboard - Overview of rosters, students, and transcripts
// API: GET /store-house/rosters, GET /store-house/students/search, GET /store-house/transcripts, GET /store-house/periods

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, Users, FileText, RefreshCw, AlertCircle,
  ArrowRight, ClipboardList, GraduationCap
} from 'lucide-react';
import { listRosters, searchStudents, listTranscripts, getAvailablePeriods } from '../../services/storeHouseService';

const StoreHouseDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ rosters: 0, students: 0, transcripts: 0 });
  const [recentRosters, setRecentRosters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await getAvailablePeriods();
        if (res.success && res.data) {
          const years = res.data.academic_years || [];
          const sems = res.data.semesters || [];
          setAcademicYears(years);
          setSemesters(sems);
        }
      } catch (err) {
        console.error('Error loading periods:', err);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAcademicYearId, selectedSemesterId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rosterParams = {};
      if (selectedAcademicYearId) rosterParams.academic_year_id = selectedAcademicYearId;
      if (selectedSemesterId) rosterParams.semester_id = selectedSemesterId;

      const [rostersRes, studentsRes, transcriptsRes] = await Promise.all([
        listRosters(rosterParams).catch(() => null),
        searchStudents().catch(() => null),
        listTranscripts().catch(() => null),
      ]);

      const rosterItems = rostersRes?.data?.items || [];
      const studentItems = studentsRes?.data?.items || [];
      const transcriptItems = transcriptsRes?.data?.items || [];

      setStats({
        rosters: rosterItems.length,
        students: studentItems.length,
        transcripts: transcriptItems.length,
      });

      setRecentRosters(rosterItems.slice(0, 5));
    } catch (err) {
      setError('Failed to load dashboard data.');
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

  // Quick action cards
  const quickActions = [
    {
      title: 'Class Rosters',
      description: 'View and manage received rosters from class heads',
      icon: ClipboardList,
      count: stats.rosters,
      label: 'rosters received',
      path: '/store-house/rosters',
      color: 'indigo',
    },
    {
      title: 'Student Records',
      description: 'Search students and view cumulative academic records',
      icon: Users,
      count: stats.students,
      label: 'students registered',
      path: '/store-house/students',
      color: 'blue',
    },
    {
      title: 'Transcripts',
      description: 'Generate and manage student transcripts',
      icon: FileText,
      count: stats.transcripts,
      label: 'transcripts generated',
      path: '/store-house/transcripts',
      color: 'green',
    },
  ];

  const colorMap = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  };

  const semestersForYear = semesters.filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId));
  const yearsFromSemesters = semesters.reduce((acc, s) => {
    if (!acc.some((y) => String(y.id) === String(s.academic_year_id))) {
      acc.push({ id: s.academic_year_id, name: s.academic_year_name });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store House Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage long-term academic records, rosters, and student transcripts.
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
              <option value="">All Years</option>
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
              <option value="">All Semesters</option>
              {semestersForYear.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Semester ${s.semester_number}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const colors = colorMap[action.color];
          return (
            <div
              key={action.title}
              onClick={() => navigate(action.path)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <action.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.badge}`}>
                  {action.count}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{action.description}</p>
              <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                Open <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Rosters */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Rosters</h2>
          <button
            onClick={() => navigate('/store-house/rosters')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {recentRosters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Semester</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class Head</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Received</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRosters.map((roster) => (
                  <tr
                    key={roster.roster_id}
                    onClick={() => navigate('/store-house/rosters')}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{roster.class?.name}</p>
                        <p className="text-xs text-gray-500">{roster.class?.grade_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{roster.semester || roster.academic_year}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">{roster.student_count}</td>
                    <td className="px-4 py-3 text-gray-600">{roster.class_head || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {roster.received_at ? new Date(roster.received_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {roster.status || 'Complete'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Archive className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">No rosters received yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreHouseDashboard;
