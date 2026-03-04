// Semester Report Page - Formal report card matching school transcript design
// API: GET /student/reports/semester, GET /student/remarks, GET /student/periods

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText, RefreshCw, AlertCircle, MessageSquare
} from 'lucide-react';
import api from '../../services/api';
import { getSemesterReport, getRemarks, getAvailablePeriods } from '../../services/studentService';

const SemesterReportPage = () => {
  const [searchParams] = useSearchParams();
  const [sem1Report, setSem1Report] = useState(null);
  const [sem2Report, setSem2Report] = useState(null);
  const [remarks, setRemarks] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load available periods on mount
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await getAvailablePeriods();
        if (res.success && res.data?.semesters) {
          const sems = res.data.semesters || [];
          setSemesters(sems);
          const urlYearId = searchParams.get('academic_year_id');
          const urlMatch = urlYearId && sems.some((s) => String(s.academic_year_id) === String(urlYearId));
          const yearId = urlMatch ? urlYearId : (sems[0]?.academic_year_id ? String(sems[0].academic_year_id) : '');
          setSelectedAcademicYearId(yearId);
        }
      } catch (err) {
        console.error('Error loading periods:', err);
      }
    };
    loadPeriods();
  }, [searchParams]);

  useEffect(() => {
    if (selectedAcademicYearId && semesters.length > 0) {
      fetchReports();
    } else if (semesters.length === 0) {
      setLoading(false);
    }
  }, [selectedAcademicYearId]);

  const semestersForYear = semesters.filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId));
  const sem1 = semestersForYear.find((s) => s.semester_number === 1 || (s.name || '').toLowerCase().includes('first'));
  const sem2 = semestersForYear.find((s) => s.semester_number === 2 || (s.name || '').toLowerCase().includes('second'));
  const sem1Id = sem1?.id;
  const sem2Id = sem2?.id;

  const fetchReports = async () => {
    if (!selectedAcademicYearId) return;
    setLoading(true);
    setError(null);
    try {
      const [sem1Res, sem2Res, remarksRes] = await Promise.all([
        sem1Id ? getSemesterReport({ semester_id: sem1Id, academic_year_id: selectedAcademicYearId }).catch(() => null) : null,
        sem2Id ? getSemesterReport({ semester_id: sem2Id, academic_year_id: selectedAcademicYearId }).catch(() => null) : null,
        sem1Id ? getRemarks({ semester_id: sem1Id, academic_year_id: selectedAcademicYearId }).catch(() => null) : null,
      ]);

      if (sem1Res?.success) setSem1Report(sem1Res.data);
      else setSem1Report(null);
      if (sem2Res?.success) setSem2Report(sem2Res.data);
      else setSem2Report(null);
      if (remarksRes?.success) setRemarks(remarksRes.data);
      else setRemarks(null);

      if (!sem1Res?.success && !sem2Res?.success) {
        try {
          const scoresRes = await api.get('/student/subjects/scores', { params: { semester_id: sem1Id || sem2Id } });
          if (scoresRes.data?.success && scoresRes.data.data?.items?.length > 0) {
            setSem1Report({
              student: null,
              subjects: scoresRes.data.data.items.map(s => ({ name: s.name, score: s.score })),
              summary: null,
            });
          } else {
            setError('Semester report not yet published. Subject scores will appear once teachers submit marks.');
          }
        } catch {
          setError('Semester report not yet published.');
        }
      }
    } catch (err) {
      setError('Failed to load semester report.');
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

  // Merge subjects from both semesters
  const report = sem1Report || sem2Report;
  const subjectMap = {};

  if (sem1Report?.subjects) {
    sem1Report.subjects.forEach(s => {
      subjectMap[s.name] = { name: s.name, sem1: s.score };
    });
  }
  if (sem2Report?.subjects) {
    sem2Report.subjects.forEach(s => {
      if (!subjectMap[s.name]) subjectMap[s.name] = { name: s.name };
      subjectMap[s.name].sem2 = s.score;
    });
  }

  const subjectRows = Object.values(subjectMap).map(s => ({
    ...s,
    avg: s.sem1 != null && s.sem2 != null
      ? (s.sem1 + s.sem2) / 2
      : s.sem1 ?? s.sem2 ?? 0,
  }));

  const student = sem1Report?.student || sem2Report?.student;
  const sem1Summary = sem1Report?.summary;
  const sem2Summary = sem2Report?.summary;

  const yearsFromSemesters = semesters.reduce((acc, s) => {
    if (!acc.some((y) => String(y.id) === String(s.academic_year_id))) {
      acc.push({ id: s.academic_year_id, name: s.academic_year_name });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with year filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Semester Report</h1>
          <p className="text-gray-500 mt-1">Your official semester report card.</p>
        </div>
        {yearsFromSemesters.length > 0 && (
          <select
            value={selectedAcademicYearId}
            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
          >
            {yearsFromSemesters.map((y) => (
              <option key={y.id} value={y.id}>{y.name || `Year ${y.id}`}</option>
            ))}
          </select>
        )}
      </div>

      {error && !report && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {report ? (
        <>
          {/* Student Info */}
          {student && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-900 mb-3">Student Information</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2 font-semibold text-gray-900">{student.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Class:</span>
                  <span className="ml-2 font-semibold text-gray-900">{student.grade_name} - {student.class_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Academic Year:</span>
                  <span className="ml-2 font-semibold text-gray-900">{sem1Report?.academic_year || sem2Report?.academic_year}</span>
                </div>
              </div>
            </div>
          )}

          {/* Report Card Table - Matching the design image */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {/* Header Row - Salmon/Pink colored */}
                <thead>
                  <tr>
                    <th className="bg-red-200 text-gray-800 font-bold text-left py-3 px-4 border-b border-red-300">
                      Name of Subject
                    </th>
                    <th className="bg-red-200 text-gray-800 font-bold text-center py-3 px-4 border-b border-red-300">
                      Sem. 1
                    </th>
                    <th className="bg-red-200 text-gray-800 font-bold text-center py-3 px-4 border-b border-red-300">
                      Sem. 2
                    </th>
                    <th className="bg-red-200 text-gray-800 font-bold text-center py-3 px-4 border-b border-red-300">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Subject Rows - Alternating background */}
                  {subjectRows.map((subject, idx) => (
                    <tr key={subject.name} className={idx % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                      <td className="py-2.5 px-4 text-gray-900 border-b border-red-100">{subject.name}</td>
                      <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">
                        {subject.sem1 != null ? subject.sem1.toFixed(1) : ''}
                      </td>
                      <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">
                        {subject.sem2 != null ? subject.sem2.toFixed(1) : ''}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-gray-900 border-b border-red-100">
                        {subject.avg.toFixed(1)}
                      </td>
                    </tr>
                  ))}

                  {/* Summary Rows - Bolder styling */}
                  <tr className="bg-red-100 font-bold">
                    <td className="py-2.5 px-4 text-gray-900 border-b border-red-200">Total</td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem1Summary?.total?.toFixed(1) || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem2Summary?.total?.toFixed(1) || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem1Summary || sem2Summary
                        ? (((sem1Summary?.total || 0) + (sem2Summary?.total || 0)) / (sem1Summary && sem2Summary ? 2 : 1)).toFixed(1)
                        : ''}
                    </td>
                  </tr>
                  <tr className="bg-red-100 font-bold">
                    <td className="py-2.5 px-4 text-gray-900 border-b border-red-200">Average</td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem1Summary?.average?.toFixed(1) || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem2Summary?.average?.toFixed(1) || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900 border-b border-red-200">
                      {sem1Summary || sem2Summary
                        ? (((sem1Summary?.average || 0) + (sem2Summary?.average || 0)) / (sem1Summary && sem2Summary ? 2 : 1)).toFixed(1)
                        : ''}
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 text-gray-900 font-semibold border-b border-red-100">Conduct</td>
                    <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">A</td>
                    <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">A</td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900 border-b border-red-100">A</td>
                  </tr>
                  <tr className="bg-red-50">
                    <td className="py-2.5 px-4 text-gray-900 font-semibold border-b border-red-100">Absent</td>
                    <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">0</td>
                    <td className="py-2.5 px-4 text-center font-medium text-gray-800 border-b border-red-100">
                      {sem2Summary ? '0' : ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-800 border-b border-red-100"></td>
                  </tr>
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 text-gray-900 font-semibold border-b border-red-100">Rank</td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900 border-b border-red-100">
                      {sem1Summary?.rank_in_class != null
                        ? `${sem1Summary.rank_in_class}${getOrdinal(sem1Summary.rank_in_class)}`
                        : ''}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900 border-b border-red-100">
                      {sem2Summary?.rank_in_class != null
                        ? `${sem2Summary.rank_in_class}${getOrdinal(sem2Summary.rank_in_class)}`
                        : ''}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900 border-b border-red-100">
                      {sem1Summary?.rank_in_class != null && sem2Summary?.rank_in_class != null
                        ? (() => {
                            const avgRank = Math.round((sem1Summary.rank_in_class + sem2Summary.rank_in_class) / 2);
                            return `${avgRank}${getOrdinal(avgRank)}`;
                          })()
                        : sem1Summary?.rank_in_class != null
                        ? `${sem1Summary.rank_in_class}${getOrdinal(sem1Summary.rank_in_class)}`
                        : sem2Summary?.rank_in_class != null
                        ? `${sem2Summary.rank_in_class}${getOrdinal(sem2Summary.rank_in_class)}`
                        : ''}
                    </td>
                  </tr>
                  <tr className="bg-red-100 font-bold">
                    <td className="py-2.5 px-4 text-gray-900">Rmark</td>
                    <td className="py-2.5 px-4 text-center text-gray-900">
                      {sem1Summary?.remark || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900">
                      {sem2Summary?.remark || ''}
                    </td>
                    <td className="py-2.5 px-4 text-center text-gray-900">
                      {sem1Summary?.remark && sem2Summary?.remark
                        ? (sem1Summary.remark === sem2Summary.remark ? sem1Summary.remark : `${sem1Summary.remark} / ${sem2Summary.remark}`)
                        : sem1Summary?.remark || sem2Summary?.remark || ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher Remarks */}
          {remarks && (remarks.class_head_remark || remarks.subject_remarks?.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                Teacher's Remarks
              </h2>

              {remarks.class_head_remark && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-indigo-700 mb-1">
                    Class Head: {remarks.class_head_remark.teacher_name}
                  </p>
                  <p className="text-sm text-gray-700">{remarks.class_head_remark.remark}</p>
                </div>
              )}

              {remarks.subject_remarks?.map((r, idx) => (
                <div key={idx} className="border-b border-gray-100 last:border-0 py-3">
                  <p className="text-sm font-medium text-gray-900">{r.subject_name}</p>
                  <p className="text-xs text-gray-500">{r.teacher_name}</p>
                  <p className="text-sm text-gray-700 mt-1">{r.remark}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : !error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Report Available</p>
          <p className="text-sm mt-1">Your semester report will appear here once results are published.</p>
        </div>
      ) : null}
    </div>
  );
};

// Helper: get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinal = (n) => {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export default SemesterReportPage;
