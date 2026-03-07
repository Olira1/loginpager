// Parent Semester Report Page - Formal report card matching school transcript design
// API: GET /parent/children, /parent/children/:id/reports/semester, /parent/children/:id/rank

import { useState, useEffect } from 'react';
import {
  RefreshCw, AlertCircle, FileText, MessageSquare
} from 'lucide-react';
import {
  listChildren, getChildSemesterReport, getChildRank,
  listChildSubjectScores, getChildAvailablePeriods
} from '../../services/parentService';

const SemesterReportPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [periods, setPeriods] = useState({ academic_years: [], semesters: [] });
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [sem1Report, setSem1Report] = useState(null);
  const [sem2Report, setSem2Report] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildPeriods();
    }
  }, [selectedChild]);

  useEffect(() => {
    if (selectedChild && selectedAcademicYearId) {
      fetchReports();
    }
  }, [selectedChild, selectedAcademicYearId]);

  const loadChildPeriods = async () => {
    try {
      const res = await getChildAvailablePeriods(selectedChild.student_id);
      if (res.success) {
        const data = res.data || { academic_years: [], semesters: [] };
        setPeriods(data);
        const year = data.academic_years.find((y) => y.is_current) || data.academic_years[0];
        if (year) setSelectedAcademicYearId(String(year.id));
      }
    } catch (err) {
      console.error('Failed to load child periods:', err);
    }
  };

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

  const fetchReports = async () => {
    setReportLoading(true);
    setSem1Report(null);
    setSem2Report(null);
    setRankData(null);
    setError(null);
    try {
      const yearSemesters = (periods.semesters || [])
        .filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId))
        .sort((a, b) => (a.semester_number || 0) - (b.semester_number || 0));
      const sem1Id = yearSemesters[0]?.id;
      const sem2Id = yearSemesters[1]?.id;
      if (!sem1Id && !sem2Id) {
        setError('No semesters found for selected academic year.');
        return;
      }

      const [sem1Res, sem2Res, rankRes] = await Promise.all([
        sem1Id ? getChildSemesterReport(selectedChild.student_id, {
          semester_id: sem1Id, academic_year_id: Number(selectedAcademicYearId)
        }).catch(() => null) : Promise.resolve(null),
        sem2Id ? getChildSemesterReport(selectedChild.student_id, {
          semester_id: sem2Id, academic_year_id: Number(selectedAcademicYearId)
        }).catch(() => null) : Promise.resolve(null),
        getChildRank(selectedChild.student_id, {
          semester_id: sem1Id || sem2Id, academic_year_id: Number(selectedAcademicYearId), type: 'semester'
        }).catch(() => null),
      ]);

      if (sem1Res?.success) setSem1Report(sem1Res.data);
      if (sem2Res?.success) setSem2Report(sem2Res.data);
      if (rankRes?.success) setRankData(rankRes.data);

      // Fallback: if no published reports, fetch live subject scores
      if (!sem1Res?.success && !sem2Res?.success) {
        try {
          const scoresRes = await listChildSubjectScores(selectedChild.student_id, { semester_id: sem1Id || sem2Id });
          if (scoresRes?.success && scoresRes.data.items?.length > 0) {
            setSem1Report({
              student: null,
              subjects: scoresRes.data.items.map(s => ({ name: s.name, score: s.score })),
              summary: null,
            });
          } else {
            setError('Report not yet published. Subject scores will appear once teachers submit marks.');
          }
        } catch {
          setError('Report not yet published.');
        }
      }
    } catch (err) {
      setError('Failed to load report.');
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

  const student = sem1Report?.student || sem2Report?.student || selectedChild;
  const sem1Summary = sem1Report?.summary;
  const sem2Summary = sem2Report?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Semester Report</h1>
        <p className="text-gray-500 mt-1">
          View your child's complete semester report card.
        </p>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
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

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Academic Year</p>
        <select
          value={selectedAcademicYearId}
          onChange={(e) => setSelectedAcademicYearId(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {periods.academic_years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </select>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : error && !report ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-amber-700">{error}</p>
        </div>
      ) : report ? (
        <>
          {/* Student Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">Student Information</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-semibold text-gray-900">{student?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {student?.grade_name} - {student?.class_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Academic Year:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {sem1Report?.academic_year || sem2Report?.academic_year || ''}
                </span>
              </div>
            </div>
          </div>

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

                  {/* Summary Rows */}
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
                    <td className="py-2.5 px-4 text-gray-900 font-semibold">Rank</td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900">
                      {sem1Summary?.rank_in_class
                        ? `${sem1Summary.rank_in_class}${getOrdinal(sem1Summary.rank_in_class)}`
                        : ''}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900">
                      {sem2Summary?.rank_in_class
                        ? `${sem2Summary.rank_in_class}${getOrdinal(sem2Summary.rank_in_class)}`
                        : ''}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-gray-900">
                      {sem1Summary?.rank_in_class && sem2Summary?.rank_in_class
                        ? (() => {
                            const avgRank = Math.round((sem1Summary.rank_in_class + sem2Summary.rank_in_class) / 2);
                            return `${avgRank}${getOrdinal(avgRank)}`;
                          })()
                        : sem1Summary?.rank_in_class
                        ? `${sem1Summary.rank_in_class}${getOrdinal(sem1Summary.rank_in_class)}`
                        : sem2Summary?.rank_in_class
                        ? `${sem2Summary.rank_in_class}${getOrdinal(sem2Summary.rank_in_class)}`
                        : ''}
                    </td>
                  </tr>
                  {/* Rmark - Promotion status (Promoted / Not Promoted) */}
                  <tr className="bg-red-50">
                    <td className="py-2.5 px-4 text-gray-900 font-semibold border-t border-red-100">Rmark</td>
                    <td className="py-2.5 px-4 text-center border-t border-red-100">
                      <span className={getRmarkText(sem1Summary?.remark) === 'Promoted' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {getRmarkText(sem1Summary?.remark) || ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center border-t border-red-100">
                      <span className={getRmarkText(sem2Summary?.remark) === 'Promoted' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {getRmarkText(sem2Summary?.remark) || ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center border-t border-red-100">
                      <span className={getRmarkText(getOverallRmark(sem1Summary, sem2Summary, sem1Report?.passing_threshold ?? sem2Report?.passing_threshold)) === 'Promoted' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {getRmarkText(getOverallRmark(sem1Summary, sem2Summary, sem1Report?.passing_threshold ?? sem2Report?.passing_threshold)) || ''}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Report Available</p>
          <p className="text-sm mt-1">The semester report will appear here once results are published.</p>
        </div>
      )}
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

// Helper: normalize remark to full text (handles 'P'/'R' or 'Promoted'/'Not Promoted')
const getRmarkText = (r) => {
  if (!r) return null;
  if (r === 'Promoted' || r === 'P') return 'Promoted';
  if (r === 'Not Promoted' || r === 'R') return 'Not Promoted';
  return r;
};

// Helper: compute overall Rmark from both semesters (uses school's passing threshold when available)
const getOverallRmark = (sem1Summary, sem2Summary, passingThreshold = 50) => {
  const avg1 = sem1Summary?.average;
  const avg2 = sem2Summary?.average;
  const threshold = passingThreshold != null && !isNaN(Number(passingThreshold)) ? Number(passingThreshold) : 50;
  if (avg1 != null && avg2 != null) {
    const combinedAvg = (avg1 + avg2) / 2;
    return combinedAvg >= threshold ? 'Promoted' : 'Not Promoted';
  }
  if (avg1 != null) return getRmarkText(sem1Summary?.remark) || (avg1 >= threshold ? 'Promoted' : 'Not Promoted');
  if (avg2 != null) return getRmarkText(sem2Summary?.remark) || (avg2 >= threshold ? 'Promoted' : 'Not Promoted');
  return getRmarkText(sem1Summary?.remark) || getRmarkText(sem2Summary?.remark);
};

export default SemesterReportPage;
