// Year Report Page - Combined both semesters view
// API: GET /student/reports/year

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet, RefreshCw, AlertCircle, User, School, Calendar,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { getYearReport } from '../../services/studentService';

const YearReportPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const academicYearId = 3; // 2017 E.C / 2024-2025

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getYearReport({ academic_year_id: academicYearId });
      if (res.success) {
        setReport(res.data);
      } else {
        setError(res.error?.message || 'Year report not available.');
      }
    } catch (err) {
      setError('Failed to load year report.');
      console.error(err);
    } finally {
      setLoading(false);
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
        <p className="text-gray-500 mt-1">Your complete academic year grade report.</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {report ? (
        <>
          {/* Student Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{report.student?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <School className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Class</p>
                  <p className="font-medium text-gray-900">{report.student?.grade_name} - {report.student?.class_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Academic Year</p>
                  <p className="font-medium text-gray-900">{report.academic_year}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Semester Summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {report.semesters?.map((sem, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{sem.name}</h3>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold text-gray-900">{sem.total?.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Average</p>
                    <p className="text-xl font-bold text-indigo-600">{sem.average?.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full Report Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Subject-Wise Year Report</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sem 1</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sem 2</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.subjects?.map((subject, idx) => (
                    <tr key={subject.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${subject.first_semester > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {subject.first_semester > 0 ? subject.first_semester?.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${subject.second_semester > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {subject.second_semester > 0 ? subject.second_semester?.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${subject.year_average >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>
                          {subject.year_average?.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr className="border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-sm" colSpan={2}>Year Total</td>
                    <td />
                    <td />
                    <td className="px-4 py-3 text-center text-sm text-indigo-700">{report.summary?.year_total?.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>Year Average</td>
                    <td />
                    <td />
                    <td className="px-4 py-3 text-center text-sm text-indigo-700">{report.summary?.year_average?.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>Total Students</td>
                    <td />
                    <td />
                    <td className="px-4 py-3 text-center text-sm">{report.summary?.total_students}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm" colSpan={2}>Remark</td>
                    <td colSpan={3} className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        report.summary?.remark === 'Promoted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {report.summary?.remark === 'Promoted'
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {report.summary?.remark || 'Pending'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : !error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Year Report Available</p>
          <p className="text-sm mt-1">Your year report will appear here once results are available for both semesters.</p>
        </div>
      ) : null}
    </div>
  );
};

export default YearReportPage;
