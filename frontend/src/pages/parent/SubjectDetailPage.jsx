// Subject Detail Page - View all subjects with assessment breakdowns for a child
// API: GET /parent/children, /parent/children/:id/subjects/scores, /parent/children/:id/subjects/:sid/grades

import { useState, useEffect } from 'react';
import {
  RefreshCw, AlertCircle, BookOpen, ChevronDown, ChevronUp,
  Maximize2, Minimize2, Users
} from 'lucide-react';
import {
  listChildren, listChildSubjectScores, getChildSubjectGrades, getChildAvailablePeriods
} from '../../services/parentService';

const SubjectDetailPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [periods, setPeriods] = useState({ academic_years: [], semesters: [] });
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectDetails, setSubjectDetails] = useState({}); // keyed by subject id
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
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
    if (selectedChild && selectedSemesterId) {
      fetchSubjects();
    }
  }, [selectedChild, selectedSemesterId]);

  const loadChildPeriods = async () => {
    try {
      const res = await getChildAvailablePeriods(selectedChild.student_id);
      if (res.success) {
        const data = res.data || { academic_years: [], semesters: [] };
        setPeriods(data);
        const year = data.academic_years.find((y) => y.is_current) || data.academic_years[0];
        if (year) {
          setSelectedAcademicYearId(String(year.id));
          const sems = (data.semesters || []).filter((s) => Number(s.academic_year_id) === Number(year.id));
          if (sems[0]) setSelectedSemesterId(String(sems[0].id));
        }
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

  const fetchSubjects = async () => {
    setDataLoading(true);
    setSubjects([]);
    setSubjectDetails({});
    setExpandedSubjects(new Set());
    try {
      const res = await listChildSubjectScores(selectedChild.student_id, {
        semester_id: Number(selectedSemesterId)
      });
      if (res.success) {
        const items = res.data.items || [];
        setSubjects(items);

        // Auto-fetch details for all subjects
        const details = {};
        const expanded = new Set();
        await Promise.all(items.map(async (sub) => {
          try {
            const detailRes = await getChildSubjectGrades(
              selectedChild.student_id, sub.id, { semester_id: Number(selectedSemesterId) }
            );
            if (detailRes.success) {
              details[sub.id] = detailRes.data;
              expanded.add(sub.id);
            }
          } catch (err) {
            console.error(`Error fetching subject ${sub.id}:`, err);
          }
        }));
        setSubjectDetails(details);
        setExpandedSubjects(expanded);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedSubjects.size === subjects.length) {
      setExpandedSubjects(new Set());
    } else {
      setExpandedSubjects(new Set(subjects.map(s => s.id)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const allExpanded = expandedSubjects.size === subjects.length && subjects.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subject Marks Overview</h1>
        <p className="text-gray-500 mt-1">
          Detailed assessment breakdown for each subject.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Child + Semester Selector */}
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
            value={selectedAcademicYearId}
            onChange={(e) => {
              const nextYear = e.target.value;
              setSelectedAcademicYearId(nextYear);
              const sems = (periods.semesters || []).filter((s) => String(s.academic_year_id) === String(nextYear));
              setSelectedSemesterId(sems[0] ? String(sems[0].id) : '');
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {periods.academic_years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Semester</p>
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {(periods.semesters || [])
              .filter((s) => String(s.academic_year_id) === String(selectedAcademicYearId))
              .map(s => (
              <option key={s.id} value={s.id}>{s.academic_year_name} - {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Expand/Collapse All */}
          {subjects.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={toggleAll}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                {allExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          )}

          {/* Subject Cards with Assessment Details */}
          {subjects.length > 0 ? (
            <div className="space-y-4">
              {subjects.map(subject => {
                const detail = subjectDetails[subject.id];
                const isExpanded = expandedSubjects.has(subject.id);

                return (
                  <div key={subject.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Subject Header */}
                    <div
                      onClick={() => toggleSubject(subject.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                          {detail?.teacher && (
                            <p className="text-xs text-gray-500">Teacher: {detail.teacher}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${
                          subject.score >= 75 ? 'text-green-600'
                            : subject.score >= 50 ? 'text-blue-600'
                            : 'text-red-600'
                        }`}>
                          {subject.score.toFixed(1)}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-5 h-5 text-gray-400" />
                          : <ChevronDown className="w-5 h-5 text-gray-400" />
                        }
                      </div>
                    </div>

                    {/* Assessment Table */}
                    {isExpanded && detail && (
                      <div className="border-t border-gray-100 px-4 pb-4">
                        <table className="w-full text-sm mt-3">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                              <th className="text-left py-2 px-2">Assessment</th>
                              <th className="text-center py-2 px-2">Weight</th>
                              <th className="text-center py-2 px-2">Score</th>
                              <th className="text-center py-2 px-2">Out Of</th>
                              <th className="text-center py-2 px-2">Weighted Mark</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {detail.assessments?.map((a, idx) => (
                              <tr key={idx} className={
                                a.weighted_score >= (a.weight_percent * 0.5)
                                  ? 'bg-green-50/50' : 'bg-red-50/50'
                              }>
                                <td className="py-2 px-2 text-gray-900">{a.type}</td>
                                <td className="py-2 px-2 text-center text-gray-600">{a.weight_percent}%</td>
                                <td className="py-2 px-2 text-center font-medium text-gray-900">{a.score}</td>
                                <td className="py-2 px-2 text-center text-gray-500">{a.max_score}</td>
                                <td className="py-2 px-2 text-center font-semibold text-indigo-600">{a.weighted_score}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 font-semibold">
                              <td className="py-2 px-2 text-gray-900" colSpan={4}>Subject Total</td>
                              <td className="py-2 px-2 text-center text-indigo-700 text-lg">
                                {detail.summary?.subject_average?.toFixed(1) || subject.score.toFixed(1)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
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
              <p className="text-sm mt-1">Marks will appear here once teachers submit them.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubjectDetailPage;
