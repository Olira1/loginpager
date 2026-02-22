// Teachers List Page
// View all teachers in the school
// API-compliant: List teachers

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getTeachers } from '../../services/schoolHeadService';

// Teacher Card
const TeacherCard = ({ teacher }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-600 font-semibold text-lg">
            {teacher.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{teacher.role?.replace('_', ' ')}</p>
          
          <div className="mt-3 space-y-1">
            {teacher.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{teacher.email}</span>
              </div>
            )}
            {teacher.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{teacher.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Role Badge */}
      {teacher.role === 'class_head' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            Class Head
          </span>
        </div>
      )}
    </div>
  );
};

// Main Page Component
const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch teachers
  const fetchTeachers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const response = await getTeachers();
      if (response.success) {
        setTeachers(response.data.items || []);
        setError(null);
      } else {
        const errorData = response.error;
        setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load teachers');
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : errorData || 'Failed to load teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Filter teachers
  const filteredTeachers = teachers.filter(t => 
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-500 mt-1">View all teachers in your school.</p>
        </div>
        <button
          onClick={() => fetchTeachers(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search teachers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Teachers Grid */}
      {teachers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Teachers Found</h3>
          <p className="text-gray-500 mt-1">Teachers will appear here once they are added to the system.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing {filteredTeachers.length} of {teachers.length} teachers
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} />
            ))}
          </div>
          
          {filteredTeachers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No teachers match your search
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeachersPage;

