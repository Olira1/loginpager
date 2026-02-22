// Student Records Page - Search students, view cumulative records, generate transcripts
// API: GET /store-house/students/search, GET /store-house/students/:id/cumulative-record,
//      POST /store-house/students/:id/transcript

import { useState } from 'react';
import {
  Search, Users, RefreshCw, AlertCircle, ArrowLeft, User,
  GraduationCap, Calendar, FileText, CheckCircle, BookOpen
} from 'lucide-react';
import {
  searchStudents, getCumulativeRecord, generateTranscript
} from '../../services/storeHouseService';

const StudentRecordsPage = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Detail state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [cumulativeRecord, setCumulativeRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Transcript generation
  const [transcriptPurpose, setTranscriptPurpose] = useState('');
  const [generating, setGenerating] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState(null);

  const [error, setError] = useState(null);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery && !searchCode) return;

    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const params = {};
      if (searchQuery) params.name = searchQuery;
      if (searchCode) params.student_code = searchCode;

      const res = await searchStudents(params);
      if (res.success) {
        setSearchResults(res.data.items || []);
      }
    } catch (err) {
      setError('Search failed.');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // View student cumulative record
  const handleViewStudent = async (studentId) => {
    setSelectedStudent(studentId);
    setDetailLoading(true);
    setTranscriptResult(null);
    setError(null);
    try {
      const res = await getCumulativeRecord(studentId);
      if (res.success) {
        setCumulativeRecord(res.data);
      } else {
        setError(res.error?.message || 'Failed to load student record.');
      }
    } catch (err) {
      setError('Failed to load student record.');
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Generate transcript
  const handleGenerateTranscript = async () => {
    if (!selectedStudent) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generateTranscript(selectedStudent, {
        purpose: transcriptPurpose || 'General'
      });
      if (res.success) {
        setTranscriptResult(res.data);
      } else {
        setError(res.error?.message || 'Failed to generate transcript.');
      }
    } catch (err) {
      setError('Failed to generate transcript.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setCumulativeRecord(null);
    setTranscriptResult(null);
    setError(null);
  };

  // =============================================
  // DETAIL VIEW - Cumulative Record
  // =============================================
  if (selectedStudent) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      );
    }

    const student = cumulativeRecord?.student;
    const history = cumulativeRecord?.academic_history || [];

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Student Records</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {student && (
          <>
            {/* Student Info Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm font-mono">ID</span>
                  <div>
                    <p className="text-xs text-gray-500">Student Code</p>
                    <p className="font-medium text-gray-900 text-sm">{student.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Current Class</p>
                    <p className="font-medium text-gray-900 text-sm">{student.current_grade} - {student.current_class}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Enrollment</p>
                    <p className="font-medium text-gray-900 text-sm">
                      {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
                <div className="bg-indigo-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Cumulative Average</p>
                  <p className="text-xl font-bold text-indigo-700">
                    {cumulativeRecord?.cumulative_average?.toFixed(1) || '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-green-700">
                    {cumulativeRecord?.completion_status || 'In Progress'}
                  </p>
                </div>
              </div>
            </div>

            {/* Academic History */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Academic History</h2>
              </div>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Year</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Semester</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade/Class</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Average</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Rank</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{h.academic_year}</td>
                          <td className="px-4 py-3 text-gray-600">{h.semester}</td>
                          <td className="px-4 py-3 text-gray-600">{h.grade_level} - {h.class_name}</td>
                          <td className="px-4 py-3 text-center font-medium">{h.total?.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center font-semibold text-indigo-600">{h.average?.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center">{h.rank || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              h.remark === 'Promoted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {h.remark || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-sm">No academic history found for this student.</p>
                </div>
              )}
            </div>

            {/* Generate Transcript Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Generate Transcript
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Generate an official transcript for this student.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={transcriptPurpose}
                  onChange={(e) => setTranscriptPurpose(e.target.value)}
                  placeholder="Purpose (e.g., University Application)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleGenerateTranscript}
                  disabled={generating}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {generating ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><FileText className="w-4 h-4" /> Generate Transcript</>
                  )}
                </button>
              </div>

              {transcriptResult && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-700">Transcript Generated Successfully</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Transcript ID: <span className="font-mono font-medium">{transcriptResult.transcript_id}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Includes: {transcriptResult.grades_included?.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // =============================================
  // SEARCH VIEW
  // =============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Records</h1>
        <p className="text-gray-500 mt-1">
          Search students and view their cumulative academic records.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Student ID..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:w-48"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {searching ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Searching...</>
            ) : (
              <><Search className="w-4 h-4" /> Search</>
            )}
          </button>
        </div>
      </form>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">{searchResults.length} student(s) found</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Grade / Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admission</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {searchResults.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{student.student_code}</td>
                    <td className="px-4 py-3 text-gray-600">{student.current_grade} - {student.current_class}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {student.date_of_admission
                        ? new Date(student.date_of_admission).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewStudent(student.student_id)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Students Found</p>
          <p className="text-sm mt-1">Try a different search term or student ID.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">Search for a Student</p>
          <p className="text-sm mt-1">Enter a name or student ID to find their records.</p>
        </div>
      )}
    </div>
  );
};

export default StudentRecordsPage;
