// Averages Page - View computed averages and rankings (read-only)
// Maps to: GET /teacher/classes/:class_id/subjects/:subject_id/averages

import { useState, useEffect } from 'react';
import {
  BarChart3, AlertCircle, RefreshCw, Trophy, TrendingUp,
  TrendingDown, Users, Award
} from 'lucide-react';
import { getAssignedClasses, getComputedAverages } from '../../services/teacherService';

const AveragesPage = () => {
  // Selection state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // Average data
  const [averageData, setAverageData] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  const semesters = [
    { id: 5, name: 'First Semester (2017 E.C)' },
    { id: 6, name: 'Second Semester (2017 E.C)' },
  ];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const cls = classes.find(c => c.class_id === parseInt(selectedClass));
      setAvailableSubjects(cls?.subjects || []);
      setSelectedSubject('');
      setAverageData(null);
    }
  }, [selectedClass, classes]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedSemester) {
      fetchAverages();
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await getAssignedClasses();
      if (response.success) {
        setClasses(response.data?.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAverages = async () => {
    setDataLoading(true);
    setError(null);
    try {
      const response = await getComputedAverages(
        parseInt(selectedClass),
        parseInt(selectedSubject),
        { semester_id: selectedSemester }
      );
      if (response.success) {
        setAverageData(response.data);
      }
    } catch (err) {
      console.error('Fetch averages error:', err);
      setError(err.response?.data?.error?.message || 'Failed to load averages.');
    } finally {
      setDataLoading(false);
    }
  };

  // Rank badge color
  const getRankColor = (rank) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-700';
    if (rank === 2) return 'bg-gray-100 text-gray-700';
    if (rank === 3) return 'bg-orange-100 text-orange-700';
    return 'bg-white text-gray-500';
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Computed Averages</h1>
        <p className="text-gray-500 mt-1">View class averages and student rankings for your subjects. (Read-only)</p>
      </div>

      {/* Selectors */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name} ({cls.grade?.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Semester</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Content */}
      {dataLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : averageData ? (
        <>
          {/* Class Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Class Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {averageData.class_average != null ? averageData.class_average.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Highest Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {averageData.highest_score != null ? averageData.highest_score.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lowest Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {averageData.lowest_score != null ? averageData.lowest_score.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Student Rankings Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Student Rankings</h2>
              <p className="text-sm text-gray-500">
                {averageData.class?.name} - {averageData.subject?.name} - {averageData.semester?.name || 'Semester'}
              </p>
            </div>
            {(averageData.students || []).length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>No student data available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">Rank</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-600">Student Name</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(averageData.students || [])
                      .sort((a, b) => (a.rank_in_subject || 999) - (b.rank_in_subject || 999))
                      .map((student) => (
                        <tr key={student.student_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankColor(student.rank_in_subject)}`}>
                              {student.rank_in_subject <= 3 ? (
                                <Award className="w-4 h-4" />
                              ) : (
                                student.rank_in_subject || '-'
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {student.student_name}
                            {student.rank_in_subject === 1 && (
                              <span className="ml-2 text-xs text-yellow-600 font-normal">Top Student</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-gray-900">
                              {student.score != null ? student.score.toFixed(1) : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : selectedClass && selectedSubject && selectedSemester ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3" />
          <p>No average data available for this selection.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3" />
          <p>Select a class, subject, and semester to view computed averages.</p>
        </div>
      )}
    </div>
  );
};

export default AveragesPage;
