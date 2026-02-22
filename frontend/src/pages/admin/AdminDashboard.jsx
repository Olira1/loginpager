// Admin Dashboard Page
// Shows platform statistics and quick actions
// API-compliant: Only features with backend support

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen,
  Plus,
  BarChart3,
  Award,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { getStatistics } from '../../services/adminService';

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

// Quick Action Button
const QuickAction = ({ icon: Icon, label, onClick, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
    green: 'text-green-600 bg-green-50 hover:bg-green-100',
    blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all group`}
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]} transition-colors`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </button>
  );
};

// Grade Distribution Bar
const GradeBar = ({ grade, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 text-sm text-gray-600">Grade {grade}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3">
        <div 
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-16 text-sm text-gray-500 text-right">{count.toLocaleString()}</span>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch statistics
  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await getStatistics();
      
      if (response.success) {
        setStats(response.data);
        setError(null);
      } else {
        const errorData = response.error;
        setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
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
            onClick={() => fetchStats()}
            className="mt-4 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate total students from grade distribution
  const totalStudents = stats?.students_by_grade 
    ? Object.values(stats.students_by_grade).reduce((a, b) => a + b, 0)
    : stats?.total_students || 0;

  const gradeColors = ['bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage platform-wide insights and operations efficiently.</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Building2} 
          label="Active Schools" 
          value={stats?.active_schools || 0}
          sublabel={`${stats?.inactive_schools || 0} inactive`}
          color="blue"
          onClick={() => navigate('/admin/schools')}
        />
        <StatCard 
          icon={Users} 
          label="Total Teachers" 
          value={(stats?.total_teachers || 0).toLocaleString()}
          sublabel="Across all schools"
          color="green"
        />
        <StatCard 
          icon={GraduationCap} 
          label="Total Students" 
          value={totalStudents.toLocaleString()}
          sublabel="Enrolled students"
          color="orange"
        />
        <StatCard 
          icon={BookOpen} 
          label="Total Classes" 
          value={(stats?.total_classes || 0).toLocaleString()}
          sublabel="All grades"
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction 
            icon={Plus} 
            label="Create New School" 
            onClick={() => navigate('/admin/schools?action=create')}
            color="indigo"
          />
          <QuickAction 
            icon={Building2} 
            label="Manage Schools" 
            onClick={() => navigate('/admin/schools')}
            color="blue"
          />
          <QuickAction 
            icon={Award} 
            label="Promotion Criteria" 
            onClick={() => navigate('/admin/promotion-criteria')}
            color="green"
          />
          <QuickAction 
            icon={BarChart3} 
            label="View Statistics" 
            onClick={() => navigate('/admin/statistics')}
            color="orange"
          />
        </div>
      </div>

      {/* Students by Grade Distribution */}
      {stats?.students_by_grade && Object.keys(stats.students_by_grade).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Students by Grade Level</h2>
            <button
              onClick={() => navigate('/admin/statistics')}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(stats.students_by_grade)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([grade, count], index) => (
                <GradeBar 
                  key={grade}
                  grade={grade}
                  count={count}
                  total={totalStudents}
                  color={gradeColors[index % gradeColors.length]}
                />
              ))}
          </div>
        </div>
      )}

      {/* Schools Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Schools Status Overview</h2>
          <button
            onClick={() => navigate('/admin/schools')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            Manage Schools
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Active: {stats?.active_schools || 0}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600">Inactive: {stats?.inactive_schools || 0}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-gray-600">Total: {stats?.total_schools || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

