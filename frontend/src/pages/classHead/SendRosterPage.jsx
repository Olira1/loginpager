// Send Roster Page - Class Head Portal
// Allows the class head to review and send the final class roster data to the store house
// Includes a full review table showing all students with subject scores across both semesters
// API: POST /api/v1/class-head/store-house/send-roster, GET /api/v1/class-head/reports/class-snapshot

import { useState, useEffect } from 'react';
import {
  Archive,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Send,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  Database,
  RefreshCw,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  sendRosterToStoreHouse,
  getClassSnapshot,
  getStudentRankings,
} from '../../services/classHeadService';

const SendRosterPage = () => {
  // State: selections
  const [selectedSemesterId, setSelectedSemesterId] = useState('5');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('3');

  // State: data
  const [rosterData, setRosterData] = useState(null);

  // State: UI
  const [sending, setSending] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Fetch roster review data (both semesters + rankings)
  const fetchReviewData = async () => {
    try {
      setLoadingReview(true);
      setError(null);

      // Fetch class snapshot for both semesters and rankings for both
      const [snap1Res, snap2Res, rank1Res, rank2Res] = await Promise.all([
        getClassSnapshot({ semester_id: 5 }).catch(() => null),
        getClassSnapshot({ semester_id: 6 }).catch(() => null),
        getStudentRankings({ semester_id: 5 }).catch(() => null),
        getStudentRankings({ semester_id: 6 }).catch(() => null),
      ]);

      const snap1 = snap1Res?.success ? snap1Res.data : null;
      const snap2 = snap2Res?.success ? snap2Res.data : null;
      const rank1 = rank1Res?.success ? rank1Res.data : null;
      const rank2 = rank2Res?.success ? rank2Res.data : null;

      // Collect all subjects from both semesters
      const allSubjects = new Set();
      if (snap1?.subjects) snap1.subjects.forEach((s) => allSubjects.add(s));
      if (snap2?.subjects) snap2.subjects.forEach((s) => allSubjects.add(s));
      const subjectList = Array.from(allSubjects);

      // Collect all student IDs
      const studentMap = new Map();
      const addStudents = (items) => {
        if (!items) return;
        items.forEach((item) => {
          if (!studentMap.has(item.student_id)) {
            studentMap.set(item.student_id, {
              student_id: item.student_id,
              name: item.student_name,
            });
          }
        });
      };
      addStudents(snap1?.items);
      addStudents(snap2?.items);

      // Build student rows with both semesters
      const students = [];
      let totalPromoted = 0;
      let totalRetained = 0;
      let sumAverage = 0;

      for (const [studentId, info] of studentMap) {
        const sem1Item = snap1?.items?.find((i) => i.student_id === studentId);
        const sem2Item = snap2?.items?.find((i) => i.student_id === studentId);
        const rank1Item = rank1?.items?.find((i) => i.student_id === studentId);
        const rank2Item = rank2?.items?.find((i) => i.student_id === studentId);

        // Get sex/age from rankings or snapshot
        const sex = rank1Item?.sex || rank2Item?.sex || '—';
        const age = rank1Item?.age || rank2Item?.age || '—';

        // Per-subject scores
        const sem1Scores = {};
        const sem2Scores = {};
        const avgScores = {};

        subjectList.forEach((subj) => {
          const s1 = sem1Item?.subject_scores?.[subj] || 0;
          const s2 = sem2Item?.subject_scores?.[subj] || 0;
          sem1Scores[subj] = s1;
          sem2Scores[subj] = s2;
          const count = (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0);
          avgScores[subj] = count > 0 ? Math.round(((s1 + s2) / count) * 10) / 10 : 0;
        });

        const sem1Total = sem1Item?.total || 0;
        const sem2Total = sem2Item?.total || 0;
        const sem1Avg = sem1Item?.average || 0;
        const sem2Avg = sem2Item?.average || 0;
        const sem1Rank = rank1Item?.rank || sem1Item?.rank || '—';
        const sem2Rank = rank2Item?.rank || sem2Item?.rank || '—';

        const countSem = (sem1Total > 0 ? 1 : 0) + (sem2Total > 0 ? 1 : 0);
        const avgTotal = countSem > 0 ? Math.round(((sem1Total + sem2Total) / countSem) * 10) / 10 : 0;
        const avgAvg = countSem > 0 ? Math.round(((sem1Avg + sem2Avg) / countSem) * 10) / 10 : 0;

        const remark = rank1Item?.remark || rank2Item?.remark || (avgAvg >= 50 ? 'Promoted' : 'Not Promoted');
        if (remark === 'Promoted') totalPromoted++;
        else totalRetained++;

        sumAverage += avgAvg;

        students.push({
          student_id: studentId,
          name: info.name,
          sex: sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : sex,
          age: age || 16,
          sem1: { scores: sem1Scores, total: sem1Total, average: sem1Avg, rank: sem1Rank, absent: 0 },
          sem2: { scores: sem2Scores, total: sem2Total, average: sem2Avg, rank: sem2Rank, absent: 0 },
          avg: { scores: avgScores, total: avgTotal, average: avgAvg, rank: '—' },
          conduct: 'A',
          remark: remark === 'Promoted' ? '↑' : '↓',
        });
      }

      // Sort by average total descending, assign avg rank
      students.sort((a, b) => b.avg.total - a.avg.total);
      students.forEach((s, idx) => {
        s.avg.rank = idx + 1;
      });

      const classAverage = students.length > 0
        ? Math.round((sumAverage / students.length) * 10) / 10
        : 0;

      setRosterData({
        className: snap1?.class?.name || snap2?.class?.name || '',
        subjects: subjectList,
        students,
        summary: {
          totalStudents: students.length,
          classAverage,
          promoted: totalPromoted,
          retained: totalRetained,
        },
      });
    } catch (err) {
      console.error('Error fetching review data:', err);
      setError('Failed to load roster review data.');
    } finally {
      setLoadingReview(false);
    }
  };

  // Load review data on mount
  useEffect(() => {
    fetchReviewData();
  }, []);

  // Handle send roster
  const handleSendRoster = async () => {
    if (
      !window.confirm(
        'Are you sure you want to send the roster to the store house? ' +
          'This will transfer all student data including scores, totals, averages, and ranks.'
      )
    ) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      setResult(null);

      const response = await sendRosterToStoreHouse({
        semester_id: parseInt(selectedSemesterId),
        academic_year_id: parseInt(selectedAcademicYearId),
      });

      if (response.success) {
        setResult(response.data);
      }
    } catch (err) {
      console.error('Error sending roster:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to send roster');
    } finally {
      setSending(false);
    }
  };

  // Shorten subject names for column headers
  const shortenSubject = (name) => {
    if (name.length <= 8) return name;
    return name.substring(0, 7) + '..';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Roster to Store House</h1>
        <p className="text-gray-500 mt-1">
          Review the class roster data below, then send it to the store house for permanent archiving.
        </p>
      </div>

      {/* Semester & Year Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Select Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <div className="relative">
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="5">First Semester (2017 E.C)</option>
                <option value="6">Second Semester (2017 E.C)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <div className="relative">
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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

      {/* Summary Cards */}
      {rosterData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <Users className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rosterData.summary.totalStudents}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <BarChart3 className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Class Average</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{rosterData.summary.classAverage}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Promoted</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{rosterData.summary.promoted}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Retained</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{rosterData.summary.retained}</p>
          </div>
        </div>
      )}

      {/* Roster Review Table */}
      {loadingReview ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
          <span className="text-gray-500">Loading roster review data...</span>
        </div>
      ) : rosterData ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Roster Review</h2>
            <button
              onClick={fetchReviewData}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: '1200px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">N/O</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 sticky left-10 bg-gray-50 z-10" style={{ minWidth: '140px' }}>Name of student</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Sex</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Age</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Sem</th>
                  {rosterData.subjects.map((subj) => (
                    <th key={subj} className="px-2 py-3 text-center font-semibold text-gray-600" title={subj}>
                      {shortenSubject(subj)}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-bold text-gray-700">Total</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-700">Aver.</th>
                  <th className="px-2 py-3 text-center font-bold text-gray-700">Rank</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Abse.</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Cond</th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-600">Rmark</th>
                </tr>
              </thead>
              <tbody>
                {rosterData.students.map((student, studentIdx) => (
                  <>
                    {/* Semester 1 Row */}
                    <tr
                      key={`${student.student_id}-sem1`}
                      className={`border-b border-gray-50 ${studentIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className={`px-3 py-2 font-medium text-gray-700 sticky left-0 z-10 ${studentIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} rowSpan={3}>
                        {studentIdx + 1}
                      </td>
                      <td className={`px-3 py-2 font-medium text-gray-900 sticky left-10 z-10 ${studentIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} rowSpan={3}>
                        {student.name}
                      </td>
                      <td className="px-2 py-2 text-center text-gray-600" rowSpan={3}>{student.sex}</td>
                      <td className="px-2 py-2 text-center text-gray-600" rowSpan={3}>{student.age}</td>
                      <td className="px-2 py-2 text-center text-gray-500">1</td>
                      {rosterData.subjects.map((subj) => (
                        <td key={subj} className="px-2 py-2 text-center text-gray-700">
                          {student.sem1.scores[subj] || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold text-gray-800">{student.sem1.total}</td>
                      <td className="px-2 py-2 text-center font-semibold text-gray-800">{student.sem1.average}</td>
                      <td className="px-2 py-2 text-center text-gray-700">{student.sem1.rank}</td>
                      <td className="px-2 py-2 text-center text-gray-600">{student.sem1.absent}</td>
                      <td className="px-2 py-2 text-center text-gray-600" rowSpan={3}>{student.conduct}</td>
                      <td className={`px-2 py-2 text-center font-bold ${student.remark === '↑' ? 'text-green-600' : 'text-red-600'}`} rowSpan={3}>
                        {student.remark}
                      </td>
                    </tr>
                    {/* Semester 2 Row */}
                    <tr
                      key={`${student.student_id}-sem2`}
                      className={`border-b border-gray-50 ${studentIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-2 py-2 text-center text-gray-500">2</td>
                      {rosterData.subjects.map((subj) => (
                        <td key={subj} className="px-2 py-2 text-center text-gray-700">
                          {student.sem2.scores[subj] || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold text-gray-800">{student.sem2.total}</td>
                      <td className="px-2 py-2 text-center font-semibold text-gray-800">{student.sem2.average}</td>
                      <td className="px-2 py-2 text-center text-gray-700">{student.sem2.rank}</td>
                      <td className="px-2 py-2 text-center text-gray-600">{student.sem2.absent}</td>
                    </tr>
                    {/* Average Row */}
                    <tr
                      key={`${student.student_id}-avg`}
                      className={`border-b border-gray-200 ${studentIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-2 py-2 text-center font-bold text-indigo-600">Av</td>
                      {rosterData.subjects.map((subj) => (
                        <td key={subj} className="px-2 py-2 text-center font-bold text-gray-900">
                          {student.avg.scores[subj] || ''}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-bold text-gray-900">{student.avg.total}</td>
                      <td className="px-2 py-2 text-center font-bold text-gray-900">{student.avg.average}</td>
                      <td className="px-2 py-2 text-center font-bold text-gray-900">{student.avg.rank}</td>
                      <td className="px-2 py-2 text-center text-gray-600"></td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-medium">Before sending the roster</p>
          <ul className="mt-1 list-disc list-inside space-y-1">
            <li>Ensure all grades have been compiled (total, average, rank calculated)</li>
            <li>Verify that semester results have been published</li>
            <li>Double-check student data for accuracy in the review table above</li>
            <li>The store house will receive this data for permanent record keeping</li>
          </ul>
        </div>
      </div>

      {/* Success Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">Roster Sent Successfully!</h3>
              <p className="text-sm text-green-600">The store house has received the class roster data.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Class</p>
              <p className="text-sm font-medium text-gray-900">{result.class_name || '—'}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Students Transferred</p>
              <p className="text-sm font-medium text-gray-900">{result.students_count || 0}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Sent At</p>
              <p className="text-sm font-medium text-gray-900">
                {result.sent_at ? new Date(result.sent_at).toLocaleString() : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium text-green-600">Complete</p>
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSendRoster}
          disabled={sending}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 text-lg font-medium shadow-lg shadow-indigo-200"
        >
          {sending ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Send className="w-6 h-6" />
          )}
          {sending ? 'Sending Roster...' : 'Send Roster to Store House'}
        </button>
      </div>
    </div>
  );
};

export default SendRosterPage;
