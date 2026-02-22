// School Head Dashboard Page
// Shows school statistics and quick access to configuration
// API-compliant: Only features with backend support

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  School,
  BookOpen,
  UserCheck,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getGrades, getTeachers, getAllClasses } from '../../services/schoolHeadService';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, sublabel, color = 'indigo', onClick }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
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
          {sublabel && (
            <p className="text-sm text-gray-400 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Quick Action Card
const QuickAction = ({ icon: Icon, title, description, onClick, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-100',
    green: 'text-green-600 bg-green-50 group-hover:bg-green-100',
    blue: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
    orange: 'text-orange-600 bg-orange-50 group-hover:bg-orange-100',
  };

  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all text-left w-full"
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]} transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </button>
  );
};

// Class Overview Table Row
const ClassRow = ({ classItem }) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{classItem.name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{classItem.grade_name}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{classItem.student_count || 0}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {classItem.class_head?.name || <span className="text-gray-400 italic">Not assigned</span>}
      </td>
    </tr>
  );
};

const SchoolHeadDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalGrades: 0,
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch grades, teachers, and classes in parallel
      const [gradesRes, teachersRes, classesRes] = await Promise.all([
        getGrades(),
        getTeachers(),
        getAllClasses()
      ]);

      // Calculate stats
      let totalStudents = 0;
      let totalClasses = 0;
      
      if (gradesRes.success && gradesRes.data.items) {
        gradesRes.data.items.forEach(grade => {
          totalStudents += grade.total_students || 0;
          totalClasses += grade.total_classes || 0;
        });
      }

      setStats({
        totalGrades: gradesRes.success ? gradesRes.data.items?.length || 0 : 0,
        totalClasses: classesRes.success ? classesRes.data.items?.length || totalClasses : totalClasses,
        totalTeachers: teachersRes.success ? teachersRes.data.items?.length || 0 : 0,
        totalStudents
      });

      // Set classes for the overview table
      if (classesRes.success && classesRes.data.items) {
        setClasses(classesRes.data.items.slice(0, 5));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Head Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Overview of {user?.school_name || 'your school'}'s academic configuration.
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
          icon={GraduationCap} 
          label="Grade Levels" 
          value={stats.totalGrades}
          sublabel="Active grades"
          color="indigo"
          onClick={() => navigate('/school/grades')}
        />
        <StatCard 
          icon={School} 
          label="Total Classes" 
          value={stats.totalClasses}
          sublabel="Across all grades"
          color="blue"
          onClick={() => navigate('/school/classes')}
        />
        <StatCard 
          icon={Users} 
          label="Teachers" 
          value={stats.totalTeachers}
          sublabel="Teaching staff"
          color="green"
          onClick={() => navigate('/school/teachers')}
        />
        <StatCard 
          icon={GraduationCap} 
          label="Total Students" 
          value={stats.totalStudents.toLocaleString()}
          sublabel="Enrolled this year"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Configuration Shortcuts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction 
            icon={GraduationCap}
            title="Grade & Class Management"
            description="Define grades, classes, and manage enrollments."
            onClick={() => navigate('/school/grades')}
            color="indigo"
          />
          <QuickAction 
            icon={BookOpen}
            title="Subject Configuration"
            description="Set up subjects and assessment types."
            onClick={() => navigate('/school/subjects')}
            color="blue"
          />
          <QuickAction 
            icon={UserCheck}
            title="Teacher Assignments"
            description="Assign teachers to classes and subjects."
            onClick={() => navigate('/school/assignments')}
            color="green"
          />
        </div>
      </div>

      {/* Class Overview */}
      {classes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Class Overview</h2>
            <button
              onClick={() => navigate('/school/classes')}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Head</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map((classItem) => (
                  <ClassRow key={classItem.id} classItem={classItem} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {classes.length === 0 && stats.totalClasses === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Classes Configured</h3>
          <p className="text-gray-500 mt-1">Start by creating grade levels and classes for your school.</p>
          <button
            onClick={() => navigate('/school/grades')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <GraduationCap className="w-5 h-5" />
            Configure Grades
          </button>
        </div>
      )}
    </div>
  );
};

export default SchoolHeadDashboard;

