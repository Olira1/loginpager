// Transcripts Page - List generated transcripts and view detailed transcript
// API: GET /store-house/transcripts, GET /store-house/transcripts/:id

import { useState, useEffect } from 'react';
import {
  FileText, RefreshCw, AlertCircle, ArrowLeft, Eye,
  User, Calendar, GraduationCap, School, CheckCircle
} from 'lucide-react';
import { listTranscripts, getTranscript } from '../../services/storeHouseService';

const TranscriptsPage = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptDetail, setTranscriptDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listTranscripts();
      if (res.success) {
        setTranscripts(res.data.items || []);
      }
    } catch (err) {
      setError('Failed to load transcripts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTranscript = async (transcriptId) => {
    setSelectedTranscript(transcriptId);
    setDetailLoading(true);
    try {
      const res = await getTranscript(transcriptId);
      if (res.success) {
        setTranscriptDetail(res.data);
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedTranscript(null);
    setTranscriptDetail(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // =============================================
  // DETAIL VIEW - Full Transcript
  // =============================================
  if (selectedTranscript && transcriptDetail) {
    const student = transcriptDetail.student || {};
    const records = transcriptDetail.academic_records || [];

    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transcripts
        </button>

        {/* Transcript Header */}
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 uppercase">Student Transcript</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">
              {transcriptDetail.transcript_number || `#${transcriptDetail.id}`}
            </p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Name of Student</p>
              <p className="font-semibold text-gray-900">{student.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sex</p>
              <p className="font-medium text-gray-900">{student.sex || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Age</p>
              <p className="font-medium text-gray-900">{student.age || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date of Admission</p>
              <p className="font-medium text-gray-900">
                {student.date_of_admission ? new Date(student.date_of_admission).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Grade Attended</p>
              <p className="font-medium text-gray-900">{student.last_grade_attended || student.current_grade || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Purpose</p>
              <p className="font-medium text-gray-900">{transcriptDetail.purpose || 'General'}</p>
            </div>
          </div>

          {/* Academic Records */}
          {records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {record.year || record.academic_year} | {record.grade_level} | {record.semester}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      record.promotion_status === 'Promoted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {record.promotion_status || record.remark || '—'}
                    </span>
                  </div>
                  <div className="p-4">
                    {/* Subjects table */}
                    {record.subjects?.length > 0 && (
                      <table className="w-full text-sm mb-3">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                            <th className="text-left py-1 px-2">Subject</th>
                            <th className="text-center py-1 px-2">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {record.subjects.map((s, i) => (
                            <tr key={i}>
                              <td className="py-1.5 px-2 text-gray-900">{s.name}</td>
                              <td className="py-1.5 px-2 text-center font-medium text-gray-700">
                                {parseFloat(s.score)?.toFixed(1) || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {/* Summary row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span>Total: <strong className="text-gray-900">{record.total?.toFixed?.(1) || record.total}</strong></span>
                      <span>Average: <strong className="text-indigo-600">{record.average?.toFixed?.(1) || record.average}</strong></span>
                      <span>Rank: <strong className="text-gray-900">{record.rank_in_class || record.rank || '—'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400 text-sm">
              No academic records in this transcript.
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
            Generated on {transcriptDetail.generated_at ? new Date(transcriptDetail.generated_at).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>
    );
  }

  if (selectedTranscript && detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // =============================================
  // LIST VIEW - All transcripts
  // =============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transcripts</h1>
        <p className="text-gray-500 mt-1">
          View and manage generated student transcripts.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Transcript count */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
        <FileText className="w-5 h-5 text-indigo-500" />
        <p className="text-sm text-gray-700">
          <strong>{transcripts.length}</strong> transcript(s) generated
        </p>
      </div>

      {/* Transcripts List */}
      {transcripts.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Transcript #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Generated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Generated By</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transcripts.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-medium">
                      {t.transcript_number || `#${t.id}`}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.student_name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.student_code}</td>
                    <td className="px-4 py-3 text-gray-600">{t.purpose || 'General'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {t.generated_at ? new Date(t.generated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.generated_by_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewTranscript(t.id)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Transcripts Yet</p>
          <p className="text-sm mt-1">
            Generate transcripts from the Student Records page.
          </p>
        </div>
      )}
    </div>
  );
};

export default TranscriptsPage;
