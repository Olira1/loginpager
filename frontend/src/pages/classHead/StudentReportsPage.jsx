// Student Reports Page - Class Head Portal
// Generate individual student report cards
// Select a student, view their detailed report with all subjects and assessments
// API: GET /api/v1/class-head/students, GET /api/v1/class-head/reports/student/:student_id

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronDown,
  User,
  Search,
  X,
  FileText,
  Printer,
  Award,
  BookOpen,
} from 'lucide-react';
import { getStudents, getStudentReport } from '../../services/classHeadService';

const StudentReportsPage = () => {
  // State
  const [students, setStudents] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('5');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('3');
  const [reportType, setReportType] = useState('semester');

  // Report data
  const [report, setReport] = useState(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await getStudents();
        if (response.success) {
          setClassInfo(response.data.class);
          setStudents(response.data.items || []);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  // Fetch report when student is selected
  const fetchReport = async (studentId) => {
    try {
      setReportLoading(true);
      setError(null);
      setReport(null);

      const params = {
        semester_id: parseInt(selectedSemesterId),
        academic_year_id: parseInt(selectedAcademicYearId),
        type: reportType,
      };

      const response = await getStudentReport(studentId, params);
      if (response.success) {
        setReport(response.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  // Handle student selection
  const handleSelectStudent = (studentId) => {
    setSelectedStudentId(studentId);
    fetchReport(studentId);
  };

  // Filter students by search
  const filteredStudents = searchQuery.trim()
    ? students.filter((s) =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student_code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : students;

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Reports</h1>
        <p className="text-gray-500 mt-1">
          Generate individual student report cards with detailed subject breakdowns.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <div className="relative">
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  if (selectedStudentId) fetchReport(selectedStudentId);
                }}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
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
                onChange={(e) => {
                  setSelectedAcademicYearId(e.target.value);
                  if (selectedStudentId) fetchReport(selectedStudentId);
                }}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="3">2024/2025 (2017 E.C)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  if (selectedStudentId) fetchReport(selectedStudentId);
                }}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              >
                <option value="semester">Semester Report</option>
                <option value="year">Year Report</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
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

      {/* Main Content: Student List + Report */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List (Left sidebar) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Select Student ({filteredStudents.length})
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <button
                  key={student.student_id}
                  onClick={() => handleSelectStudent(student.student_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedStudentId === student.student_id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedStudentId === student.student_id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-500">{student.student_code || 'No code'}</p>
                  </div>
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No students found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report View (Right content) */}
        <div className="lg:col-span-2">
          {reportLoading ? (
            <div className="flex items-center justify-center py-24 bg-white rounded-xl border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
              <span className="text-gray-500">Generating report...</span>
            </div>
          ) : report ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
              {/* Report Header */}
              <div className="p-6 border-b border-gray-100 print:border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Student Report Card</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {report.report_type === 'semester' ? report.semester : 'Full Year'} &mdash; {report.academic_year}
                    </p>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {/* Student Info */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{report.student?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Student ID</p>
                    <p className="text-sm font-medium text-gray-900">{report.student?.code || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Class</p>
                    <p className="text-sm font-medium text-gray-900">{report.student?.class_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Grade</p>
                    <p className="text-sm font-medium text-gray-900">{report.student?.grade_name}</p>
                  </div>
                </div>
              </div>

              {/* Subjects Table */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Subject Scores
                </h3>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Teacher</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.subjects?.map((subject, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{subject.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{subject.teacher_name || '—'}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                              subject.subject_average >= 50
                                ? 'text-green-700 bg-green-50'
                                : 'text-red-700 bg-red-50'
                            }`}>
                              {subject.subject_average || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                {report.summary && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-indigo-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-indigo-600">Total</p>
                        <p className="text-lg font-bold text-indigo-700">{report.summary.total}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600">Average</p>
                        <p className="text-lg font-bold text-blue-700">{report.summary.average}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-purple-600">Rank</p>
                        <p className="text-lg font-bold text-purple-700">
                          {report.summary.rank_in_class || '—'}/{report.summary.total_students}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600">Subjects</p>
                        <p className="text-lg font-bold text-gray-700">{report.summary.total_subjects}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${
                        report.summary.remark === 'Promoted'
                          ? 'bg-green-50'
                          : 'bg-red-50'
                      }`}>
                        <p className={`text-xs ${report.summary.remark === 'Promoted' ? 'text-green-600' : 'text-red-600'}`}>
                          Remark
                        </p>
                        <p className={`text-lg font-bold ${report.summary.remark === 'Promoted' ? 'text-green-700' : 'text-red-700'}`}>
                          {report.summary.remark}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated timestamp */}
                {report.generated_at && (
                  <p className="mt-4 text-xs text-gray-400 text-right">
                    Generated: {new Date(report.generated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select a Student</h3>
              <p className="text-gray-500 mt-1">Choose a student from the list to generate their report card.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReportsPage;
