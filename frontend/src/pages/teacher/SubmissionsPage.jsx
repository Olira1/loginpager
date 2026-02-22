// Submissions Page - View submission status for all assignments
// Maps to: GET /teacher/submissions

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, AlertCircle, RefreshCw, CheckCircle2, Clock,
  FileText, Eye, Filter, XCircle
} from 'lucide-react';
import { getSubmissionStatus } from '../../services/teacherService';

// Status Badge
const StatusBadge = ({ status }) => {
  const config = {
    submitted: { bg: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Submitted' },
    approved: { bg: 'bg-blue-100 text-blue-700', icon: CheckCircle2, label: 'Approved' },
    rejected: { bg: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
    draft: { bg: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Draft' },
  };
  const c = config[status] || { bg: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Not Submitted' };
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  );
};

const SubmissionsPage = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('5');

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const semesters = [
    { id: 5, name: 'First Semester (2017 E.C)' },
    { id: 6, name: 'Second Semester (2017 E.C)' },
  ];

  useEffect(() => {
    if (selectedSemester) {
      fetchSubmissions();
    }
  }, [selectedSemester]);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSubmissionStatus({ semester_id: selectedSemester });
      if (response.success) {
        setSubmissions(response.data?.items || []);
      }
    } catch (err) {
      console.error('Fetch submissions error:', err);
      setError(err.response?.data?.error?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique class and subject names for filters
  const uniqueClasses = [...new Set(submissions.map(s => s.class?.name).filter(Boolean))];
  const uniqueSubjects = [...new Set(submissions.map(s => s.subject?.name).filter(Boolean))];

  // Filter submissions
  const filtered = submissions.filter(s => {
    if (filterClass && s.class?.name !== filterClass) return false;
    if (filterSubject && s.subject?.name !== filterSubject) return false;
    return true;
  });

  // Separate by status
  const drafts = filtered.filter(s => s.status === 'draft' || !s.status || !s.submission_id);
  const submitted = filtered.filter(s => s.status === 'submitted' || s.status === 'approved' || s.status === 'rejected');

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
        <h1 className="text-2xl font-bold text-gray-900">Submission Status</h1>
        <p className="text-gray-500 mt-1">Track your grade submission statuses across all classes and subjects.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter Submissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
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

      {/* Pending Submissions (Drafts) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pending Submissions (Drafts)</h2>
          <p className="text-sm text-gray-500">Grades saved as drafts, awaiting final submission.</p>
        </div>
        {drafts.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
            <p>No pending drafts for this semester.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Class</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Students Graded</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drafts.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.class?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.subject?.name || '-'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status="draft" /></td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.students_graded || 0} / {item.total_students || 0}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate('/teacher/grades')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <FileText className="w-3.5 h-3.5" /> Edit Draft
                        </button>
                        <button
                          onClick={() => navigate('/teacher/grades')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          <Send className="w-3.5 h-3.5" /> Submit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submitted Marks */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Submitted Marks</h2>
          <p className="text-sm text-gray-500">Grades submitted for review and approval by the Class Head.</p>
        </div>
        {submitted.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">
            <Send className="w-8 h-8 mx-auto mb-2" />
            <p>No submissions yet for this semester.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Class</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Submitted At</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Reviewed By</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submitted.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.class?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.subject?.name || '-'}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {item.reviewed_by || '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => navigate('/teacher/averages')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionsPage;
