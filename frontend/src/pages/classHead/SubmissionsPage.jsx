// Submissions Page - Class Head Portal
// Shows subject submission checklist and allows review/approve/reject of teacher submissions
// API: GET /class-head/submissions/checklist, GET /class-head/submissions/:id/review,
//      POST /class-head/submissions/:id/approve, POST /class-head/submissions/:id/reject

import { useState, useEffect } from 'react';
import {
  CheckSquare,
  RefreshCw,
  AlertCircle,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  X,
  AlertTriangle,
  User,
} from 'lucide-react';
import {
  getSubmissionChecklist,
  reviewSubmission,
  approveSubmission,
  rejectSubmission,
} from '../../services/classHeadService';

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    submitted: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Submitted' },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Approved' },
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Revision Requested' },
    draft: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
  };
  const { color, icon: StatusIcon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <StatusIcon className="w-3 h-3" />
      {label}
    </span>
  );
};

const SubmissionsPage = () => {
  // State
  const [checklist, setChecklist] = useState(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('5');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Review modal state
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Approve/Reject modal state
  const [actionModal, setActionModal] = useState({ show: false, type: '', submissionId: null });
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch checklist
  const fetchChecklist = async () => {
    try {
      setLoading(true);
      setSuccessMessage('');
      const response = await getSubmissionChecklist({ semester_id: parseInt(selectedSemesterId) });
      if (response.success) {
        setChecklist(response.data);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching checklist:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  // Load on mount and semester change
  useEffect(() => {
    fetchChecklist();
  }, [selectedSemesterId]);

  // Open review modal for a submission
  const handleReview = async (subject) => {
    // Find the submission ID from the checklist - we need a submitted submission
    // The submission_id may not be directly on the subject object, so we use the subject_id
    // The API expects a submission ID, but our checklist data may have a submission object
    // For now, we'll look for the submission through the status
    if (subject.status === 'pending' || subject.status === 'draft') {
      setError('This subject has not been submitted yet. Only submitted grades can be reviewed.');
      return;
    }

    try {
      setReviewLoading(true);
      setShowReviewModal(true);

      // We need the submission_id. If the checklist includes it, use it.
      // Otherwise, we'll need to fetch it. For now, assume subject has submission_id.
      const submissionId = subject.submission_id || subject.subject_id;
      const response = await reviewSubmission(submissionId);

      if (response.success) {
        setReviewData(response.data);
      }
    } catch (err) {
      console.error('Error loading review data:', err);
      setError('Failed to load submission details for review.');
      setShowReviewModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle approve/reject action
  const handleAction = async () => {
    try {
      setActionLoading(true);

      if (actionModal.type === 'approve') {
        await approveSubmission(actionModal.submissionId, {
          remarks: actionReason || 'Grades verified and approved',
        });
        setSuccessMessage('Submission approved successfully!');
      } else {
        if (!actionReason.trim()) {
          setError('Please provide a reason for rejection.');
          setActionLoading(false);
          return;
        }
        await rejectSubmission(actionModal.submissionId, {
          reason: actionReason,
        });
        setSuccessMessage('Submission rejected. Teacher has been notified to revise.');
      }

      // Close modals and refresh
      setActionModal({ show: false, type: '', submissionId: null });
      setActionReason('');
      setShowReviewModal(false);
      setReviewData(null);
      await fetchChecklist();
    } catch (err) {
      console.error('Error processing action:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Submissions</h1>
          <p className="text-gray-500 mt-1">
            {checklist?.class ? (
              <>Review and manage grade submissions for {checklist.class.name}</>
            ) : (
              'Review teacher grade submissions for your class'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Semester Selector */}
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
          <button
            onClick={fetchChecklist}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Summary Cards */}
      {checklist && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-sm text-gray-500">Total Subjects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{checklist.total_subjects}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-green-100">
            <p className="text-sm text-green-600">Submitted</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{checklist.submitted_count}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-orange-100">
            <p className="text-sm text-orange-600">Pending</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{checklist.pending_count}</p>
          </div>
        </div>
      )}

      {/* Submission Checklist Table */}
      {checklist?.subjects && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Subject Submission Checklist — {checklist.semester || 'Semester'}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Students Graded</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted At</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checklist.subjects.map((subject) => (
                  <tr key={subject.subject_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.subject_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-indigo-600" />
                        </div>
                        {subject.teacher?.name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      <span className={`font-medium ${
                        subject.students_graded === subject.total_students
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {subject.students_graded}/{subject.total_students}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subject.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {subject.submitted_at
                        ? new Date(subject.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(subject.status === 'submitted' || subject.status === 'approved') && (
                        <button
                          onClick={() => handleReview(subject)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      )}
                      {subject.status === 'pending' && (
                        <span className="text-sm text-gray-400 italic">Awaiting submission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No data */}
      {!checklist?.subjects?.length && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Submissions Found</h3>
          <p className="text-gray-500 mt-1">No subject submissions found for this semester.</p>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review Submission</h3>
                {reviewData && (
                  <p className="text-sm text-gray-500 mt-1">
                    {reviewData.subject?.name} — submitted by {reviewData.teacher?.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {reviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                  <span className="text-gray-500">Loading review data...</span>
                </div>
              ) : reviewData ? (
                <div className="space-y-6">
                  {/* Class Statistics */}
                  {reviewData.class_statistics && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Average</p>
                        <p className="text-lg font-bold text-gray-900">{reviewData.class_statistics.average}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Highest</p>
                        <p className="text-lg font-bold text-green-600">{reviewData.class_statistics.highest}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Lowest</p>
                        <p className="text-lg font-bold text-red-600">{reviewData.class_statistics.lowest}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Pass</p>
                        <p className="text-lg font-bold text-green-600">{reviewData.class_statistics.pass_count}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500">Fail</p>
                        <p className="text-lg font-bold text-red-600">{reviewData.class_statistics.fail_count}</p>
                      </div>
                    </div>
                  )}

                  {/* Student Scores Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Subject Score</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reviewData.students?.map((student, idx) => (
                          <tr key={student.student_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{student.student_name}</td>
                            <td className="px-4 py-2 text-center text-sm font-medium">
                              <span className={student.subject_score >= 50 ? 'text-green-600' : 'text-red-600'}>
                                {student.subject_score}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                student.subject_score >= 50
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {student.subject_score >= 50 ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No review data available.</p>
              )}
            </div>

            {/* Modal Footer - Approve/Reject buttons */}
            {reviewData && reviewData.status === 'submitted' && (
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() =>
                    setActionModal({
                      show: true,
                      type: 'reject',
                      submissionId: reviewData.submission_id,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Request Revision
                </button>
                <button
                  onClick={() =>
                    setActionModal({
                      show: true,
                      type: 'approve',
                      submissionId: reviewData.submission_id,
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirmation Modal (Approve/Reject) */}
      {actionModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {actionModal.type === 'approve' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionModal.type === 'approve' ? 'Approve Submission' : 'Request Revision'}
                </h3>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {actionModal.type === 'approve'
                  ? 'Are you sure you want to approve this grade submission? The grades will be finalized.'
                  : 'Please provide a reason for requesting revision. The teacher will be notified.'}
              </p>

              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'Optional remarks (e.g., "Grades verified and approved")'
                    : 'Reason for rejection (required)...'
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setActionModal({ show: false, type: '', submissionId: null });
                  setActionReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                  actionModal.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionModal.type === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionsPage;
