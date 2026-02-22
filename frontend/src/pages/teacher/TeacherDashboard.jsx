// Teacher Dashboard - Overview of assigned classes, subjects, and submission statuses
// Maps to: GET /teacher/classes, GET /teacher/submissions

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, School, BookOpen, FileText, Settings, Send,
  BarChart3, AlertCircle, RefreshCw, ChevronRight, CheckCircle2,
  Clock, Users
} from 'lucide-react';
import { getAssignedClasses, getSubmissionStatus } from '../../services/teacherService';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Quick Action Card
const QuickAction = ({ icon: Icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all text-left w-full"
  >
    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-indigo-600" />
    </div>
    <div className="flex-1">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </button>
);

// Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    submitted: 'bg-green-100 text-green-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    draft: 'bg-amber-100 text-amber-700',
    pending: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not Submitted'}
    </span>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch assigned classes and submission status in parallel
      const [classesRes, submissionsRes] = await Promise.all([
        getAssignedClasses(),
        getSubmissionStatus({ semester_id: '' }).catch(() => ({ success: true, data: { items: [] } }))
      ]);

      if (classesRes.success) {
        setClasses(classesRes.data?.items || []);
      }
      if (submissionsRes.success) {
        setSubmissions(submissionsRes.data?.items || []);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      const msg = err.response?.data?.error?.message || 'Failed to load dashboard data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalClasses = classes.length;
  const totalSubjects = classes.reduce((sum, c) => sum + (c.subjects?.length || 0), 0);
  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
  const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'approved').length;
  const pendingCount = submissions.filter(s => s.status === 'draft' || !s.status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <button onClick={fetchDashboardData} className="mt-4 flex items-center gap-2 text-red-700 hover:text-red-800 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of assigned classes, subjects, and submission statuses.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={School} label="Assigned Classes" value={totalClasses} color="indigo" />
        <StatCard icon={BookOpen} label="Total Subjects" value={totalSubjects} color="blue" />
        <StatCard icon={Users} label="Total Students" value={totalStudents} color="green" />
        <StatCard icon={Send} label="Submissions" value={`${submittedCount}/${submittedCount + pendingCount}`} color="amber" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <QuickAction
            icon={Settings}
            title="Assessment Setup"
            description="Configure grading breakdowns and weights for your subjects."
            onClick={() => navigate('/teacher/weights')}
          />
          <QuickAction
            icon={FileText}
            title="Student Mark Entry"
            description="Input student marks for various assessments and track progress."
            onClick={() => navigate('/teacher/grades')}
          />
          <QuickAction
            icon={Send}
            title="Submit Grades"
            description="View and manage your grade submissions for Class Head review."
            onClick={() => navigate('/teacher/submissions')}
          />
          <QuickAction
            icon={BarChart3}
            title="View Averages"
            description="See computed averages and student rankings per subject."
            onClick={() => navigate('/teacher/averages')}
          />
        </div>
      </div>

      {/* Assigned Classes & Subjects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Assigned Classes & Subjects</h2>
          <button onClick={() => navigate('/teacher/classes')} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View All →
          </button>
        </div>
        {classes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <School className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Classes Assigned</h3>
            <p className="text-gray-500 mt-1">You haven't been assigned to any classes yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls.class_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <h3 className="text-lg font-semibold text-indigo-600 mb-1">
                  {cls.class_name}
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  {cls.grade?.name || ''} · {cls.student_count || 0} Students
                </p>
                <div className="space-y-2">
                  {(cls.subjects || []).map((sub) => {
                    // Find submission status for this class+subject
                    const submission = submissions.find(
                      s => s.class?.id === cls.class_id && s.subject?.id === sub.id
                    );
                    return (
                      <div key={sub.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{sub.name}</span>
                        <StatusBadge status={submission?.status} />
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => navigate('/teacher/classes')}
                  className="mt-4 w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
