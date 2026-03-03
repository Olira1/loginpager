import { useEffect, useState } from 'react';
import { Users, UserCheck, UserRound, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getRegistrarStatistics, getRegistrationMetadata } from '../../services/registrarService';

const StatCard = ({ title, value, subtitle, icon: CardIcon, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? 0}</p>
        {subtitle ? <p className="text-xs text-gray-500 mt-2">{subtitle}</p> : null}
      </div>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <CardIcon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const RegistrarDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const params = {};
      if (selectedYear) params.academic_year_id = selectedYear;
      const response = await getRegistrarStatistics(params);
      if (response.success) {
        setStats(response.data);
        setError('');
      } else {
        setError(response.error?.message || 'Failed to load statistics.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedYear]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await getRegistrationMetadata();
        if (response.success) {
          setAcademicYears(response.data?.academic_years || []);
        }
      } catch (err) {
        // silent — metadata is supplementary
      }
    };
    loadMetadata();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registrar Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of student, teacher, and parent records.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700"
          >
            <option value="">All Years</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>{ay.name}</option>
            ))}
          </select>
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Students"
          value={stats?.students?.total}
          subtitle={`Active: ${stats?.students?.active ?? 0} / Inactive: ${stats?.students?.inactive ?? 0}`}
          icon={Users}
          color="bg-indigo-600"
        />
        <StatCard
          title="Teachers"
          value={stats?.teachers?.total}
          subtitle={`Active: ${stats?.teachers?.active ?? 0} / Inactive: ${stats?.teachers?.inactive ?? 0}`}
          icon={UserCheck}
          color="bg-emerald-600"
        />
        <StatCard
          title="Parents"
          value={stats?.parents?.total}
          subtitle={`Active: ${stats?.parents?.active ?? 0} / Inactive: ${stats?.parents?.inactive ?? 0}`}
          icon={UserRound}
          color="bg-amber-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900">School</h2>
        <p className="text-gray-600 mt-1">{stats?.school?.name || 'N/A'}</p>
        <p className="text-xs text-gray-500 mt-3">
          Last updated: {stats?.last_updated ? new Date(stats.last_updated).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default RegistrarDashboard;
