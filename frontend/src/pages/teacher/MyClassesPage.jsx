// My Classes Page - View assigned classes and subjects
// Maps to: GET /teacher/classes, GET /teacher/subjects

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School, BookOpen, Users, AlertCircle, RefreshCw,
  Settings, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { getAssignedClasses } from '../../services/teacherService';

const MyClassesPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAssignedClasses();
      if (response.success) {
        const items = response.data?.items || [];
        setClasses(items);
        // Auto-expand first class
        if (items.length > 0) {
          setExpandedClass(items[0].class_id);
        }
      }
    } catch (err) {
      console.error('Fetch classes error:', err);
      setError(err.response?.data?.error?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (classId) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

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
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
        <button onClick={fetchClasses} className="mt-4 flex items-center gap-2 text-red-700 hover:text-red-800 text-sm font-medium">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes & Subjects</h1>
        <p className="text-gray-500 mt-1">View your assigned classes and the subjects you teach in each.</p>
      </div>

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Classes Assigned</h3>
          <p className="text-gray-500 mt-1">Contact your School Head to get assigned to classes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <div key={cls.class_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Class Header */}
              <button
                onClick={() => toggleExpand(cls.class_id)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <School className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-indigo-600">{cls.class_name}</h3>
                    <p className="text-sm text-gray-500">
                      {cls.grade?.name || ''} · {cls.subjects?.length || 0} Subjects · {cls.student_count || 0} Students
                    </p>
                  </div>
                </div>
                {expandedClass === cls.class_id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded Subjects */}
              {expandedClass === cls.class_id && (
                <div className="border-t border-gray-100 p-5">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Subjects for {cls.class_name}
                  </h4>
                  {(cls.subjects || []).length === 0 ? (
                    <p className="text-gray-400 text-sm">No subjects assigned in this class.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(cls.subjects || []).map((sub) => (
                        <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <BookOpen className="w-5 h-5 text-indigo-500 mt-0.5" />
                            <div>
                              <h5 className="font-semibold text-gray-900">{sub.name}</h5>
                              {sub.code && (
                                <span className="text-xs text-gray-400">{sub.code}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                            <Users className="w-4 h-4" />
                            <span>{cls.student_count || 0} Students</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate('/teacher/weights')}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              Manage Weights
                            </button>
                            <button
                              onClick={() => navigate('/teacher/grades')}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Enter Marks
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClassesPage;
