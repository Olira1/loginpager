// Statistics Page
// Platform-wide and per-school statistics
// API-compliant design

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  School
} from 'lucide-react';
import { getStatistics, getSchools, getSchoolStatistics } from '../../services/adminService';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, sublabel, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
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

// Grade Distribution Chart (Simple Bar)
const GradeDistributionChart = ({ data, total }) => {
  const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500'];
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Students by Grade Level</h3>
      <div className="space-y-4">
        {Object.entries(data)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([grade, count], index) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={grade}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Grade {grade}</span>
                  <span className="text-sm text-gray-500">{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

// Schools Status Chart
const SchoolsStatusChart = ({ active, inactive, total }) => {
  const activePercent = total > 0 ? (active / total) * 100 : 0;
  const inactivePercent = total > 0 ? (inactive / total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Schools Status</h3>
      
      {/* Progress Circle */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="12"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#22c55e"
              strokeWidth="12"
              strokeDasharray={`${activePercent * 3.52} ${100 * 3.52}`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div>
            <p className="text-lg font-bold text-green-700">{active}</p>
            <p className="text-xs text-green-600">Active</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <div>
            <p className="text-lg font-bold text-gray-700">{inactive}</p>
            <p className="text-xs text-gray-600">Inactive</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// School Statistics Card
const SchoolStatCard = ({ school, stats }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <School className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{stats?.school_name || school.name}</h4>
          <p className="text-sm text-gray-500">{school.code}</p>
        </div>
      </div>
      
      {stats ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-indigo-600">{stats.total_students || 0}</p>
            <p className="text-xs text-gray-500">Students</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">{stats.total_teachers || 0}</p>
            <p className="text-xs text-gray-500">Teachers</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-orange-600">{stats.total_classes || 0}</p>
            <p className="text-xs text-gray-500">Classes</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {stats?.teacher_student_ratio && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Teacher:Student Ratio</span>
          <span className="font-medium text-gray-700">{stats.teacher_student_ratio}</span>
        </div>
      )}
    </div>
  );
};

// Main Statistics Page
const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolStats, setSchoolStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all data
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      // Fetch platform stats and schools in parallel
      const [statsResponse, schoolsResponse] = await Promise.all([
        getStatistics(),
        getSchools({ limit: 100 })
      ]);
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
      
      if (schoolsResponse.success) {
        setSchools(schoolsResponse.data.items || []);
        
        // Fetch individual school stats
        const schoolStatsPromises = (schoolsResponse.data.items || []).slice(0, 6).map(async (school) => {
          try {
            const res = await getSchoolStatistics(school.id);
            return { id: school.id, data: res.success ? res.data : null };
          } catch (err) {
            return { id: school.id, data: null };
          }
        });
        
        const results = await Promise.all(schoolStatsPromises);
        const statsMap = {};
        results.forEach(r => {
          statsMap[r.id] = r.data;
        });
        setSchoolStats(statsMap);
      }
      
      setError(null);
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
    fetchData();
  }, []);

  // Calculate total students
  const totalStudents = stats?.students_by_grade 
    ? Object.values(stats.students_by_grade).reduce((a, b) => a + b, 0)
    : stats?.total_students || 0;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading statistics...</p>
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
          <h3 className="font-semibold text-red-800">Error Loading Statistics</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Platform Statistics</h1>
          <p className="text-gray-500 mt-1">Overview of all schools and academic data</p>
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

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Building2} 
          label="Total Schools" 
          value={stats?.total_schools || 0}
          sublabel={`${stats?.active_schools || 0} active`}
          color="blue"
        />
        <StatCard 
          icon={Users} 
          label="Total Teachers" 
          value={(stats?.total_teachers || 0).toLocaleString()}
          color="green"
        />
        <StatCard 
          icon={GraduationCap} 
          label="Total Students" 
          value={totalStudents.toLocaleString()}
          color="orange"
        />
        <StatCard 
          icon={BookOpen} 
          label="Total Classes" 
          value={(stats?.total_classes || 0).toLocaleString()}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Grade */}
        {stats?.students_by_grade && Object.keys(stats.students_by_grade).length > 0 && (
          <GradeDistributionChart 
            data={stats.students_by_grade} 
            total={totalStudents}
          />
        )}

        {/* Schools Status */}
        <SchoolsStatusChart 
          active={stats?.active_schools || 0}
          inactive={stats?.inactive_schools || 0}
          total={stats?.total_schools || 0}
        />
      </div>

      {/* Per-School Statistics */}
      {schools.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">School-by-School Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.slice(0, 6).map((school) => (
              <SchoolStatCard 
                key={school.id}
                school={school}
                stats={schoolStats[school.id]}
              />
            ))}
          </div>
          {schools.length > 6 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Showing 6 of {schools.length} schools
            </p>
          )}
        </div>
      )}

      {/* Last Updated */}
      {stats?.last_updated && (
        <p className="text-sm text-gray-400 text-center">
          Last updated: {new Date(stats.last_updated).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default StatisticsPage;

