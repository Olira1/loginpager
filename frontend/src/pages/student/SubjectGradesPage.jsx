// Subject Grades Page - View assessment-level breakdown per subject
// Shows each subject with its individual assessment marks (Quiz, Assignment, Mid-Exam, etc.)
// API: GET /student/subjects/scores, GET /student/subjects/:id/grades, GET /student/rank

import { useState, useEffect } from 'react';
import {
  BookOpen, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Award, User
} from 'lucide-react';
import { getAvailablePeriods, getSubjectGrades, getRank, listSubjectScores } from '../../services/studentService';

const FALLBACK_PERIODS = {
  academic_years: [{ id: 3, name: 'Current Academic Year', is_current: true }],
  semesters: [
    { id: 5, name: 'First Semester', academic_year_id: 3, academic_year_name: 'Current Academic Year' },
    { id: 6, name: 'Second Semester', academic_year_id: 3, academic_year_name: 'Current Academic Year' }
  ]
};

const SubjectGradesPage = () => {
  const [subjects, setSubjects] = useState([]);        // list of subjects with scores
  const [subjectDetails, setSubjectDetails] = useState({}); // assessment details per subject
  const [periods, setPeriods] = useState({ academic_years: [], semesters: [] });
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState(new Set()); // track which are expanded
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(true);  // loading state for all details
  const [error, setError] = useState(null);

  const semesters = periods.semesters.filter(
    (s) => String(s.academic_year_id) === String(selectedAcademicYearId)
  );

  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await getAvailablePeriods();
        if (res.success) {
          const data = res.data || { academic_years: [], semesters: [] };
          const normalized = (data.academic_years?.length && data.semesters?.length) ? data : FALLBACK_PERIODS;
          setPeriods(normalized);
          const year = normalized.academic_years.find((y) => y.is_current) || normalized.academic_years[0];
          if (year) {
            setSelectedAcademicYearId(String(year.id));
            const sems = (normalized.semesters || []).filter((s) => Number(s.academic_year_id) === Number(year.id));
            if (sems[0]) setSelectedSemester(String(sems[0].id));
          }
        } else {
          setPeriods(FALLBACK_PERIODS);
          setSelectedAcademicYearId(String(FALLBACK_PERIODS.academic_years[0].id));
          setSelectedSemester(String(FALLBACK_PERIODS.semesters[0].id));
        }
      } catch (err) {
        console.error('Failed to load student periods:', err);
        setPeriods(FALLBACK_PERIODS);
        setSelectedAcademicYearId(String(FALLBACK_PERIODS.academic_years[0].id));
        setSelectedSemester(String(FALLBACK_PERIODS.semesters[0].id));
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!selectedAcademicYearId) return;
    const sems = (periods.semesters || []).filter((s) => Number(s.academic_year_id) === Number(selectedAcademicYearId));
    if (sems.length > 0 && !sems.some((s) => String(s.id) === String(selectedSemester))) {
      setSelectedSemester(String(sems[0].id));
    }
  }, [selectedAcademicYearId, periods.semesters]);

  useEffect(() => {
    if (selectedSemester && selectedAcademicYearId) fetchData();
  }, [selectedSemester, selectedAcademicYearId]);

  const fetchData = async () => {
    setLoading(true);
    setDetailsLoading(true);
    setError(null);
    setSubjectDetails({});
    setExpandedSubjects(new Set());

    try {
      // Step 1: Get rank and subject list in parallel
      const [rankRes, subjectsRes] = await Promise.all([
        getRank({ semester_id: parseInt(selectedSemester), academic_year_id: parseInt(selectedAcademicYearId), type: 'semester' }).catch(() => null),
        listSubjectScores({ semester_id: parseInt(selectedSemester) }).catch(() => null),
      ]);

      if (rankRes?.success) setRankData(rankRes.data);

      const subjectList = subjectsRes?.success ? (subjectsRes.data?.items || []) : [];
      setSubjects(subjectList);
      setLoading(false);

      // Step 2: Auto-load assessment details for ALL subjects
      // This is key - students should see their assessment marks immediately
      if (subjectList.length > 0) {
        const allExpanded = new Set(subjectList.map(s => s.name));
        setExpandedSubjects(allExpanded);

        // Fetch all subject details in parallel
        const detailPromises = subjectList.map(async (subject) => {
          try {
            const res = await getSubjectGrades(subject.id, { semester_id: parseInt(selectedSemester) });
            if (res.success) {
              return { name: subject.name, data: res.data };
            }
          } catch (err) {
            console.error(`Error loading ${subject.name} details:`, err);
          }
          return null;
        });

        const results = await Promise.all(detailPromises);
        const detailsMap = {};
        results.forEach(r => {
          if (r) detailsMap[r.name] = r.data;
        });
        setSubjectDetails(detailsMap);
      }
    } catch (err) {
      setError('Failed to load subject data.');
      console.error(err);
    } finally {
      setLoading(false);
      setDetailsLoading(false);
    }
  };

  // Toggle expand/collapse for a single subject
  const toggleSubject = (subjectName) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectName)) next.delete(subjectName);
      else next.add(subjectName);
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => setExpandedSubjects(new Set(subjects.map(s => s.name)));
  const collapseAll = () => setExpandedSubjects(new Set());

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Marks Overview</h1>
          <p className="text-gray-500 mt-1">
            Your individual assessment marks for each subject.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedAcademicYearId}
            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {periods.academic_years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.academic_year_name} - {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Semester Summary */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-indigo-600 font-medium">Semester Summary</p>
          <p className="text-3xl font-bold text-indigo-700 mt-1">
            {rankData?.scores?.average ? rankData.scores.average.toFixed(1) : '—'}
            <span className="text-base font-normal text-indigo-400 ml-1">avg</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 flex items-center gap-1 sm:justify-end">
            <Award className="w-3 h-3" />
            {rankData?.rank?.position
              ? `Rank: ${rankData.rank.position} out of ${rankData.rank.total_students} students`
              : 'Rank not available yet'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} with marks
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Expand/Collapse controls */}
      {subjects.length > 0 && (
        <div className="flex gap-3">
          <button onClick={expandAll} className="text-xs text-indigo-600 hover:underline font-medium">
            Expand All
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={collapseAll} className="text-xs text-indigo-600 hover:underline font-medium">
            Collapse All
          </button>
        </div>
      )}

      {/* Subject List with Assessment Details */}
      {subjects.length > 0 ? (
        <div className="space-y-4">
          {subjects.map((subject) => {
            const isExpanded = expandedSubjects.has(subject.name);
            const detail = subjectDetails[subject.name];
            const isDetailLoading = detailsLoading && !detail;

            return (
              <div key={subject.name} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Subject header - clickable to toggle */}
                <button
                  onClick={() => toggleSubject(subject.name)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      {detail?.teacher && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {detail.teacher.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Score bar */}
                    <div className="hidden sm:block w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${subject.score >= 50 ? 'bg-indigo-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(subject.score || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-lg font-bold min-w-[50px] text-right ${subject.score >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {subject.score?.toFixed(1) || 0}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-5 h-5 text-gray-400" />
                      : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Assessment breakdown - shown when expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {isDetailLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mr-2" />
                        <span className="text-sm text-gray-500">Loading assessment marks...</span>
                      </div>
                    ) : detail?.assessments?.length > 0 ? (
                      <div className="p-4">
                        {/* Assessment table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <th className="text-left py-2 px-3">Assessment</th>
                                <th className="text-center py-2 px-3">Weight</th>
                                <th className="text-center py-2 px-3">Your Score</th>
                                <th className="text-center py-2 px-3">Out Of</th>
                                <th className="text-center py-2 px-3">Weighted Mark</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {detail.assessments.map((a, idx) => (
                                <tr key={idx} className="hover:bg-white transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-gray-900">{a.type}</td>
                                  <td className="py-2.5 px-3 text-center text-gray-600">{a.weight_percent}%</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`font-bold ${parseFloat(a.score) >= (parseFloat(a.max_score) * 0.5) ? 'text-green-600' : 'text-red-600'}`}>
                                      {parseFloat(a.score).toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-gray-500">
                                    {parseFloat(a.max_score).toFixed(0)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-semibold text-indigo-600">
                                    {a.weighted_score?.toFixed(1)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-300 bg-white font-semibold">
                                <td className="py-3 px-3 text-gray-900" colSpan={4}>Subject Total</td>
                                <td className="py-3 px-3 text-center text-indigo-700 text-base">
                                  {detail.summary?.subject_average?.toFixed(1) || subject.score?.toFixed(1) || 0}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-400">
                        <p className="text-sm">No assessment breakdown available for this subject yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Subject Data</p>
          <p className="text-sm mt-1">Subject grades will appear once your teachers submit marks.</p>
        </div>
      )}
    </div>
  );
};

export default SubjectGradesPage;
