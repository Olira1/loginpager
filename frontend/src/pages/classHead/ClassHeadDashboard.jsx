// Class Head Dashboard Page
// Shows class info, summary stats (students, submissions, grades), and quick actions
// API endpoints used: GET /class-head/students, GET /class-head/submissions/checklist

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileText,
  BarChart3,
  Send,
  Archive,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudents, getSubmissionChecklist } from '../../services/classHeadService';

// ============ Reusable Components ============

// Stat Card - displays a single statistic
const StatCard = ({ icon: Icon, label, value, sublabel, color = 'indigo', onClick }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {sublabel && <p className="text-sm text-gray-400 mt-1">{sublabel}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Quick Action Card - navigates to a feature page
const QuickAction = ({ icon: Icon, title, description, onClick, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100',
    green: 'text-green-600 bg-green-50 group-hover:bg-green-100',
    blue: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
    orange: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100',
    purple: 'text-purple-600 bg-purple-50 group-hover:bg-purple-100',
  };

  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all text-left w-full"
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]} transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 mt-1 transition-colors" />
    </button>
  );
};

// Submission status badge
const StatusBadge = ({ status }) => {
  const config = {
    submitted: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Submitted' },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Approved' },
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
    revision_requested: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Revision' },
  };

  const { color, icon: StatusIcon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <StatusIcon className="w-3 h-3" />
      {label}
    </span>
  );
};

// ============ Main Dashboard Component ============

const ClassHeadDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data from API
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch students and submission checklist in parallel
      const [studentsRes, checklistRes] = await Promise.all([
        getStudents(),
        getSubmissionChecklist({ semester_id: 1 }).catch(() => null), // semester_id placeholder
      ]);

      // Set class info from students response
      if (studentsRes.success) {
        setClassInfo(studentsRes.data.class);
        setStudents(studentsRes.data.items || []);
      }

      // Set submission data
      if (checklistRes?.success) {
        setSubmissions(checklistRes.data);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with class info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Head Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {classInfo ? (
              <>Managing <span className="font-medium text-indigo-600">{classInfo.name}</span> &mdash; {classInfo.grade_name}</>
            ) : (
              <>Welcome back, {user?.name || 'Class Head'}!</>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={students.length}
          sublabel={classInfo ? `In ${classInfo.name}` : 'In your class'}
          color="indigo"
          onClick={() => navigate('/class-head/students')}
        />
        <StatCard
          icon={CheckSquare}
          label="Subjects Submitted"
          value={submissions ? `${submissions.submitted_count}/${submissions.total_subjects}` : '—'}
          sublabel="Grades submitted"
          color="green"
          onClick={() => navigate('/class-head/submissions')}
        />
        <StatCard
          icon={Clock}
          label="Pending Submissions"
          value={submissions?.pending_count ?? '—'}
          sublabel="Awaiting teacher submissions"
          color="orange"
          onClick={() => navigate('/class-head/submissions')}
        />
        <StatCard
          icon={BarChart3}
          label="Total Subjects"
          value={submissions?.total_subjects ?? '—'}
          sublabel="Assigned to class"
          color="blue"
          onClick={() => navigate('/class-head/snapshot')}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            icon={FileText}
            title="Enter Grades"
            description="Enter or edit grades for subjects you teach."
            onClick={() => navigate('/class-head/grades')}
            color="indigo"
          />
          <QuickAction
            icon={CheckSquare}
            title="Review Submissions"
            description="Review, approve, or reject teacher grade submissions."
            onClick={() => navigate('/class-head/submissions')}
            color="green"
          />
          <QuickAction
            icon={Send}
            title="Compile & Publish"
            description="Compile final grades and publish results."
            onClick={() => navigate('/class-head/compile')}
            color="blue"
          />
          <QuickAction
            icon={BarChart3}
            title="Class Snapshot"
            description="View class performance overview with all subject scores."
            onClick={() => navigate('/class-head/snapshot')}
            color="orange"
          />
          <QuickAction
            icon={FileSpreadsheet}
            title="Student Reports"
            description="Generate individual student report cards."
            onClick={() => navigate('/class-head/reports')}
            color="purple"
          />
          <QuickAction
            icon={Archive}
            title="Send Roster"
            description="Send final roster data to the store house."
            onClick={() => navigate('/class-head/roster')}
            color="purple"
          />
        </div>
      </div>

      {/* Submission Checklist Preview */}
      {submissions && submissions.subjects && submissions.subjects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Subject Submission Status</h2>
            <button
              onClick={() => navigate('/class-head/submissions')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Graded</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.subjects.slice(0, 6).map((subject) => (
                  <tr key={subject.subject_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.subject_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{subject.teacher?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.students_graded}/{subject.total_students}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={subject.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!classInfo && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Class Assigned</h3>
          <p className="text-gray-500 mt-1">You are not currently assigned as a class head. Contact your school head.</p>
        </div>
      )}
    </div>
  );
};

export default ClassHeadDashboard;
