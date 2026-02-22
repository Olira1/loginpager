// Compile & Publish Page - Class Head Portal
// Step 1: Compile grades (total, average, rank)
// Step 2: View student rankings
// Step 3: Publish semester or year results
// API: POST /class-head/compile-grades, GET /class-head/students/rankings,
//      POST /class-head/publish/semester, POST /class-head/publish/year

import { useState, useEffect } from 'react';
import {
  Send,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Trophy,
  BookOpen,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  compileGrades,
  getStudentRankings,
  publishSemesterResults,
  publishYearResults,
  getStudentReport,
} from '../../services/classHeadService';

const CompilePublishPage = () => {
  // State: selections
  const [selectedSemesterId, setSelectedSemesterId] = useState('5');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('3');

  // State: data
  const [rankings, setRankings] = useState(null);
  const [compileResult, setCompileResult] = useState(null);
  const [studentReport, setStudentReport] = useState(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [averageRankings, setAverageRankings] = useState({});

  // State: UI
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [publishingSemester, setPublishingSemester] = useState(false);
  const [publishingYear, setPublishingYear] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch rankings
  const fetchRankings = async () => {
    try {
      setLoading(true);
      const response = await getStudentRankings({ semester_id: parseInt(selectedSemesterId) });
      if (response.success) {
        setRankings(response.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching rankings:', err);
      // Rankings might not exist yet if grades aren't compiled - that's ok
      setRankings(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual student report for both semesters
  const fetchStudentReport = async (studentId) => {
    try {
      setLoadingReport(true);
      // Fetch reports for both semesters
      const [sem1Response, sem2Response] = await Promise.all([
        getStudentReport(studentId, {
          semester_id: 5,
          academic_year_id: parseInt(selectedAcademicYearId),
          type: 'semester',
        }).catch(() => null),
        getStudentReport(studentId, {
          semester_id: 6,
          academic_year_id: parseInt(selectedAcademicYearId),
          type: 'semester',
        }).catch(() => null),
      ]);

      const sem1Data = sem1Response?.success ? sem1Response.data : null;
      const sem2Data = sem2Response?.success ? sem2Response.data : null;

      // Merge subjects from both semesters
      const allSubjectNames = new Set();
      if (sem1Data?.subjects) sem1Data.subjects.forEach((s) => allSubjectNames.add(s.name));
      if (sem2Data?.subjects) sem2Data.subjects.forEach((s) => allSubjectNames.add(s.name));

      const mergedSubjects = Array.from(allSubjectNames).map((name) => {
        const sem1Subject = sem1Data?.subjects?.find((s) => s.name === name);
        const sem2Subject = sem2Data?.subjects?.find((s) => s.name === name);
        const sem1Score = sem1Subject?.subject_average || 0;
        const sem2Score = sem2Subject?.subject_average || 0;
        const count = (sem1Score > 0 ? 1 : 0) + (sem2Score > 0 ? 1 : 0);
        const avg = count > 0 ? (sem1Score + sem2Score) / count : 0;
        return {
          name,
          sem1: sem1Score,
          sem2: sem2Score,
          average: Math.round(avg * 100) / 100,
        };
      });

      const sem1Total = sem1Data?.summary?.total || 0;
      const sem2Total = sem2Data?.summary?.total || 0;
      const sem1Avg = sem1Data?.summary?.average || 0;
      const sem2Avg = sem2Data?.summary?.average || 0;
      const totalCount = (sem1Total > 0 ? 1 : 0) + (sem2Total > 0 ? 1 : 0);
      const avgTotal = totalCount > 0 ? (sem1Total + sem2Total) / totalCount : 0;
      const avgAvg = totalCount > 0 ? (sem1Avg + sem2Avg) / totalCount : 0;

      setStudentReport({
        student: sem1Data?.student || sem2Data?.student,
        subjects: mergedSubjects,
        summary: {
          sem1Total: Math.round(sem1Total * 100) / 100,
          sem2Total: Math.round(sem2Total * 100) / 100,
          avgTotal: Math.round(avgTotal * 100) / 100,
          sem1Avg: Math.round(sem1Avg * 100) / 100,
          sem2Avg: Math.round(sem2Avg * 100) / 100,
          avgAvg: Math.round(avgAvg * 100) / 100,
          sem1Rank: sem1Data?.summary?.rank_in_class,
          sem2Rank: sem2Data?.summary?.rank_in_class,
          avgRank: averageRankings[studentId] || null,
          conduct: 'A',
          sem1Absent: 0,
          sem2Absent: sem2Data ? 1 : 0,
        },
      });
    } catch (err) {
      console.error('Error fetching student report:', err);
      setStudentReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  // Compute average rankings across both semesters
  const computeAverageRankings = async () => {
    try {
      const [rank1Res, rank2Res] = await Promise.all([
        getStudentRankings({ semester_id: 5 }).catch(() => null),
        getStudentRankings({ semester_id: 6 }).catch(() => null),
      ]);
      const rank1Items = rank1Res?.success ? rank1Res.data.items : [];
      const rank2Items = rank2Res?.success ? rank2Res.data.items : [];

      // Merge all student IDs
      const studentMap = new Map();
      rank1Items.forEach((s) => {
        studentMap.set(s.student_id, { sem1Total: s.total });
      });
      rank2Items.forEach((s) => {
        const existing = studentMap.get(s.student_id) || {};
        studentMap.set(s.student_id, { ...existing, sem2Total: s.total });
      });

      // Compute average total and sort
      const avgList = Array.from(studentMap.entries()).map(([id, data]) => {
        const s1 = data.sem1Total || 0;
        const s2 = data.sem2Total || 0;
        const count = (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0);
        return { student_id: id, avgTotal: count > 0 ? (s1 + s2) / count : 0 };
      });
      avgList.sort((a, b) => b.avgTotal - a.avgTotal);

      const rankMap = {};
      avgList.forEach((s, idx) => { rankMap[s.student_id] = idx + 1; });
      setAverageRankings(rankMap);
    } catch (err) {
      console.error('Error computing average rankings:', err);
    }
  };

  // Load rankings on mount and selection change
  useEffect(() => {
    fetchRankings();
    computeAverageRankings();
    setCurrentStudentIndex(0);
    setStudentReport(null);
  }, [selectedSemesterId]);

  // Fetch student report when rankings load or student index changes
  useEffect(() => {
    if (rankings?.items?.length > 0 && currentStudentIndex < rankings.items.length) {
      const student = rankings.items[currentStudentIndex];
      fetchStudentReport(student.student_id);
    }
  }, [rankings, currentStudentIndex, averageRankings]);

  // Pagination handlers
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) setCurrentStudentIndex(currentStudentIndex - 1);
  };
  const handleNextStudent = () => {
    if (rankings?.items && currentStudentIndex < rankings.items.length - 1)
      setCurrentStudentIndex(currentStudentIndex + 1);
  };

  // Handle compile grades
  const handleCompile = async () => {
    if (!window.confirm('This will calculate total, average, and rank for all students. Continue?')) {
      return;
    }

    try {
      setCompiling(true);
      setError(null);
      setSuccessMessage('');

      const response = await compileGrades({
        semester_id: parseInt(selectedSemesterId),
        academic_year_id: parseInt(selectedAcademicYearId),
      });

      if (response.success) {
        setCompileResult(response.data);
        setSuccessMessage(
          `Grades compiled successfully! ${response.data.students_compiled} students processed. Class average: ${response.data.class_average}`
        );
        // Refresh rankings to show updated data
        await fetchRankings();
      }
    } catch (err) {
      console.error('Error compiling grades:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to compile grades');
    } finally {
      setCompiling(false);
    }
  };

  // Handle publish semester results
  const handlePublishSemester = async () => {
    if (!window.confirm('This will make semester results visible to students and parents. Continue?')) {
      return;
    }

    try {
      setPublishingSemester(true);
      setError(null);
      setSuccessMessage('');

      const response = await publishSemesterResults({
        semester_id: parseInt(selectedSemesterId),
        academic_year_id: parseInt(selectedAcademicYearId),
      });

      if (response.success) {
        setSuccessMessage(
          `Semester results published successfully! ${response.data.students_published} students' results are now visible.`
        );
      }
    } catch (err) {
      console.error('Error publishing semester results:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to publish results');
    } finally {
      setPublishingSemester(false);
    }
  };

  // Handle publish year results
  const handlePublishYear = async () => {
    if (!window.confirm('This will publish the full year results and can notify students, parents, and the store house. Continue?')) {
      return;
    }

    try {
      setPublishingYear(true);
      setError(null);
      setSuccessMessage('');

      const response = await publishYearResults({
        academic_year_id: parseInt(selectedAcademicYearId),
        notify_students: true,
        notify_parents: true,
        send_to_store_house: true,
      });

      if (response.success) {
        setSuccessMessage('Year results published successfully!');
      }
    } catch (err) {
      console.error('Error publishing year results:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to publish year results');
    } finally {
      setPublishingYear(false);
    }
  };

  // Get rank display string
  const getRankDisplay = (rank) => {
    if (!rank) return '—';
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    const suffix = suffixes[rank] || 'th';
    return `${rank}${suffix}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compile & Publish</h1>
        <p className="text-gray-500 mt-1">
          Compile final grades (total, average, rank) and publish results to students and parents.
        </p>
      </div>

      {/* Semester & Academic Year Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Action Cards - 3-step workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1: Compile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Compile Grades</h3>
              <p className="text-xs text-gray-500">Calculate total, average, rank</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Processes all approved subject grades and calculates each student's total score, average, rank, and promotion status.
          </p>
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {compiling ? 'Compiling...' : 'Compile Now'}
          </button>
        </div>

        {/* Step 2: Publish Semester */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Publish Semester</h3>
              <p className="text-xs text-gray-500">Make results visible</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Makes the compiled semester results visible to students and parents. Ensure grades are compiled first.
          </p>
          <button
            onClick={handlePublishSemester}
            disabled={publishingSemester}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {publishingSemester ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishingSemester ? 'Publishing...' : 'Publish Semester'}
          </button>
        </div>

        {/* Step 3: Publish Year */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Publish Year</h3>
              <p className="text-xs text-gray-500">Final year results + store house</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Publishes full year results and sends data to the store house. Both semesters must be finalized first.
          </p>
          <button
            onClick={handlePublishYear}
            disabled={publishingYear}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {publishingYear ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {publishingYear ? 'Publishing...' : 'Publish Year Results'}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-medium">Important Workflow</p>
          <p className="mt-1">
            Follow the steps in order: <strong>1.</strong> Compile grades first to calculate totals and ranks.{' '}
            <strong>2.</strong> Publish semester results. <strong>3.</strong> After both semesters are done, publish year results.
          </p>
        </div>
      </div>

      {/* Student Report Card */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
          <span className="text-gray-500">Loading rankings...</span>
        </div>
      ) : rankings?.items?.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Student Report Card
              </h2>
              <p className="text-sm text-gray-500">
                {rankings.class?.name} — {rankings.items[currentStudentIndex]?.student_name} — Student {currentStudentIndex + 1} of {rankings.items.length}
              </p>
            </div>
            <button
              onClick={fetchRankings}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Report Card Table */}
          {loadingReport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
              <span className="text-gray-500">Loading report...</span>
            </div>
          ) : studentReport ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700 text-white">
                      <th className="px-6 py-3 text-left text-sm font-semibold" style={{ width: '45%' }}>Gosa Barnootaa</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold" style={{ width: '18%' }}>Sem. 1ffaa</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold" style={{ width: '18%' }}>Sem. 2ffaa</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold" style={{ width: '19%' }}>Avreejii</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReport.subjects.map((subject, idx) => (
                      <tr
                        key={subject.name}
                        className={idx % 2 === 0 ? 'bg-red-50' : 'bg-white'}
                      >
                        <td className="px-6 py-2.5 text-sm text-gray-800">{subject.name}</td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-800 font-medium">{subject.sem1 || ''}</td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-800 font-medium">{subject.sem2 || ''}</td>
                        <td className="px-4 py-2.5 text-center text-sm text-gray-800 font-medium">{subject.average || ''}</td>
                      </tr>
                    ))}
                    {/* Summary Rows */}
                    <tr className="bg-red-100 font-semibold">
                      <td className="px-6 py-2.5 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.sem1Total}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.sem2Total}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.avgTotal}</td>
                    </tr>
                    <tr className="bg-white font-semibold">
                      <td className="px-6 py-2.5 text-sm text-gray-900">Average</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.sem1Avg}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.sem2Avg}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{studentReport.summary.avgAvg}</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="px-6 py-2.5 text-sm text-gray-800">Conduct</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800">{studentReport.summary.conduct}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800">{studentReport.summary.conduct}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800">{studentReport.summary.conduct}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-6 py-2.5 text-sm text-gray-800">Absent</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800">{studentReport.summary.sem1Absent}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800">{studentReport.summary.sem2Absent}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-800"></td>
                    </tr>
                    <tr className="bg-red-50 font-semibold">
                      <td className="px-6 py-2.5 text-sm text-gray-900">Rank</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{getRankDisplay(studentReport.summary.sem1Rank)}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">{getRankDisplay(studentReport.summary.sem2Rank)}</td>
                      <td className="px-4 py-2.5 text-center text-sm text-gray-900">
                        {studentReport.summary.sem1Rank && studentReport.summary.sem2Rank
                          ? getRankDisplay(Math.round((studentReport.summary.sem1Rank + studentReport.summary.sem2Rank) / 2))
                          : studentReport.summary.sem1Rank
                          ? getRankDisplay(studentReport.summary.sem1Rank)
                          : studentReport.summary.sem2Rank
                          ? getRankDisplay(studentReport.summary.sem2Rank)
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 py-4 border-t border-gray-100">
                <button
                  onClick={handlePrevStudent}
                  disabled={currentStudentIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                {rankings.items.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStudentIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      idx === currentStudentIndex
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                )).slice(
                  Math.max(0, currentStudentIndex - 2),
                  Math.min(rankings.items.length, currentStudentIndex + 3)
                )}
                {currentStudentIndex + 3 < rankings.items.length && (
                  <span className="text-gray-400 text-sm">...</span>
                )}
                <button
                  onClick={handleNextStudent}
                  disabled={currentStudentIndex === rankings.items.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">No report data available for this student.</div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Rankings Available</h3>
          <p className="text-gray-500 mt-1">Compile grades first to see student rankings.</p>
        </div>
      )}
    </div>
  );
};

export default CompilePublishPage;
