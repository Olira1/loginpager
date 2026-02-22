// Parent Year Report Page - Combined year report showing both semesters
// API: GET /parent/children, /parent/children/:id/reports/year

import { useState, useEffect } from 'react';
import {
  RefreshCw, AlertCircle
} from 'lucide-react';
import { listChildren, getChildYearReport } from '../../services/parentService';

// Available academic years (matching seed data)
const academicYears = [
  { id: 3, name: '2024/2025 (2017 E.C)' },
];

const YearReportPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedYear, setSelectedYear] = useState(academicYears[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchReport();
    }
  }, [selectedChild, selectedYear]);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await listChildren();
      const items = res?.data?.items || [];
      setChildren(items);
      if (items.length > 0) setSelectedChild(items[0]);
    } catch (err) {
      setError('Failed to load data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setReportLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await getChildYearReport(selectedChild.student_id, {
        academic_year_id: selectedYear.id
      });
      if (res.success) {
        setReport(res.data);
      } else {
        setError(res.error?.message || 'Year report not available.');
      }
    } catch (err) {
      setError('Year report not available yet.');
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Year Report</h1>
        <p className="text-gray-500 mt-1">
          Combined annual performance across both semesters.
        </p>
      </div>

      {/* Child + Year Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        {children.length > 1 && (
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 mb-1">Select Child</p>
            <div className="flex gap-2 flex-wrap">
              {children.map(child => (
                <button
                  key={child.student_id}
                  onClick={() => setSelectedChild(child)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedChild?.student_id === child.student_id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Academic Year</p>
          <select
            value={selectedYear.id}
            onChange={(e) => setSelectedYear(academicYears.find(y => y.id === parseInt(e.target.value)))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700">{error}</p>
        </div>
      ) : report ? (
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-4">Year Report Card</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-semibold text-gray-900">{report.student?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Class</p>
              <p className="font-medium text-gray-900">{report.student?.grade_name} - {report.student?.class_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Academic Year</p>
              <p className="font-medium text-gray-900">{report.academic_year}</p>
            </div>
          </div>

          {/* Semester Summaries */}
          {report.semesters?.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {report.semesters.map((sem, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{sem.name}</p>
                  <p className="text-sm">
                    Total: <strong>{sem.total?.toFixed(1)}</strong> |
                    Average: <strong className="text-indigo-600">{sem.average?.toFixed(1)}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Subjects Table */}
          {report.subjects?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Subject</th>
                    <th className="text-center py-2 px-3">Sem 1</th>
                    <th className="text-center py-2 px-3">Sem 2</th>
                    <th className="text-center py-2 px-3">Year Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.subjects.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{s.name}</td>
                      <td className="py-2 px-3 text-center text-gray-600">{s.first_semester?.toFixed(1) || '—'}</td>
                      <td className="py-2 px-3 text-center text-gray-600">{s.second_semester?.toFixed(1) || '—'}</td>
                      <td className={`py-2 px-3 text-center font-semibold ${
                        s.year_average >= 75 ? 'text-green-600'
                          : s.year_average >= 50 ? 'text-indigo-600'
                          : 'text-red-600'
                      }`}>
                        {s.year_average?.toFixed(1) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Year Summary */}
          <div className="border-t-2 border-gray-300 pt-4 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Year Total</p>
              <p className="text-xl font-bold text-gray-900">{report.summary?.year_total?.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Year Average</p>
              <p className="text-xl font-bold text-indigo-600">{report.summary?.year_average?.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Students</p>
              <p className="text-xl font-bold text-gray-700">{report.summary?.total_students || '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Remark</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${
                report.summary?.remark === 'Promoted'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {report.summary?.remark || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default YearReportPage;
