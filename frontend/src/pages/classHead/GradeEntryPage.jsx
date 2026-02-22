// Grade Entry Page - Class Head Portal (Teacher-Inherited)
// Allows the class head to enter/edit grades for subjects they teach
// Uses teacher endpoints: assigned classes, student list, grades, bulk entry, submit
// API: GET /teacher/classes, GET /teacher/classes/:id/subjects/:id/grades, POST /teacher/grades/bulk, etc.

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  Loader2,
  Save,
  Send,
  CheckCircle2,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  getAssignedClasses,
  listStudentGrades,
  enterBulkGrades,
  submitGradesForApproval,
} from '../../services/classHeadService';

const GradeEntryPage = () => {
  // State: class/subject selection
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('5'); // Default semester

  // State: grade data
  const [gradeData, setGradeData] = useState(null);
  const [editedGrades, setEditedGrades] = useState({}); // { studentId: { assessmentTypeId: score } }

  // State: UI
  const [loading, setLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await getAssignedClasses();
        if (response.success && response.data.items) {
          setAssignedClasses(response.data.items);
          // Auto-select first class if available
          if (response.data.items.length > 0) {
            setSelectedClassId(String(response.data.items[0].class_id));
          }
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching assigned classes:', err);
        setError('Failed to load your teaching assignments. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Get available subjects for selected class
  const getSubjectsForClass = useCallback(() => {
    if (!selectedClassId) return [];
    const classData = assignedClasses.find((c) => String(c.class_id) === selectedClassId);
    return classData?.subjects || [];
  }, [selectedClassId, assignedClasses]);

  // Auto-select first subject when class changes
  useEffect(() => {
    const subjects = getSubjectsForClass();
    if (subjects.length > 0) {
      setSelectedSubjectId(String(subjects[0].id));
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, getSubjectsForClass]);

  // Fetch grades when selection changes
  useEffect(() => {
    if (selectedClassId && selectedSubjectId && selectedSemesterId) {
      fetchGrades();
    }
  }, [selectedClassId, selectedSubjectId, selectedSemesterId]);

  // Fetch grade data from API
  const fetchGrades = async () => {
    try {
      setGradesLoading(true);
      setSuccessMessage('');
      const response = await listStudentGrades(
        parseInt(selectedClassId),
        parseInt(selectedSubjectId),
        { semester_id: parseInt(selectedSemesterId) }
      );

      if (response.success) {
        setGradeData(response.data);
        // Initialize edited grades from existing data
        const initial = {};
        response.data.items?.forEach((student) => {
          initial[student.student_id] = {};
          student.grades?.forEach((grade) => {
            initial[student.student_id][grade.assessment_type_id] = {
              score: grade.score,
              max_score: grade.max_score,
              grade_id: grade.id,
            };
          });
        });
        setEditedGrades(initial);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching grades:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : 'Failed to load grades');
    } finally {
      setGradesLoading(false);
    }
  };

  // Handle score change in the table
  const handleScoreChange = (studentId, assessmentTypeId, value, maxScore) => {
    const numValue = value === '' ? '' : parseFloat(value);

    // Validate: score can't exceed max
    if (numValue !== '' && numValue > maxScore) return;
    if (numValue !== '' && numValue < 0) return;

    setEditedGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assessmentTypeId]: {
          ...(prev[studentId]?.[assessmentTypeId] || {}),
          score: numValue,
          max_score: maxScore,
        },
      },
    }));
  };

  // Compute total weighted score for a student from current grades
  const computeStudentTotal = (student) => {
    const types = getAssessmentTypes();
    let total = 0;
    let hasAnyScore = false;
    for (const at of types) {
      // Check edited grades first, then original grade data
      const edited = editedGrades[student.student_id]?.[at.id];
      const score = edited?.score !== undefined && edited?.score !== '' ? parseFloat(edited.score) : null;
      if (score === null) {
        // fallback to original grade
        const origGrade = student.grades?.find(g => g.assessment_type_id === at.id);
        if (origGrade && origGrade.score != null) {
          const origScore = parseFloat(origGrade.score);
          const maxScore = parseFloat(at.max_score) || 100;
          const weight = parseFloat(at.weight_percent) || 0;
          total += (origScore / maxScore) * weight;
          hasAnyScore = true;
        }
      } else {
        const maxScore = parseFloat(at.max_score) || 100;
        const weight = parseFloat(at.weight_percent) || 0;
        total += (score / maxScore) * weight;
        hasAnyScore = true;
      }
    }
    return hasAnyScore ? Math.round(total * 100) / 100 : null;
  };

  // Get unique assessment types from grade data
  const getAssessmentTypes = () => {
    if (!gradeData?.items?.length) return [];
    // Collect from all students' grades
    const typesMap = {};
    gradeData.items.forEach((student) => {
      student.grades?.forEach((grade) => {
        if (!typesMap[grade.assessment_type_id]) {
          typesMap[grade.assessment_type_id] = {
            id: grade.assessment_type_id,
            name: grade.assessment_type_name,
            max_score: parseFloat(grade.max_score) || 0,
            weight_percent: parseFloat(grade.weight_percent) || 0,
          };
        }
      });
    });
    return Object.values(typesMap);
  };

  // Save all edited grades (bulk entry)
  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      setSuccessMessage('');

      const assessmentTypes = getAssessmentTypes();

      // Save grades for each assessment type
      for (const assessType of assessmentTypes) {
        const grades = [];

        Object.entries(editedGrades).forEach(([studentId, assessments]) => {
          const assessment = assessments[assessType.id];
          if (assessment && assessment.score !== '' && assessment.score !== undefined) {
            grades.push({
              student_id: parseInt(studentId),
              score: assessment.score,
            });
          }
        });

        if (grades.length > 0) {
          await enterBulkGrades({
            class_id: parseInt(selectedClassId),
            subject_id: parseInt(selectedSubjectId),
            semester_id: parseInt(selectedSemesterId),
            assessment_type_id: assessType.id,
            max_score: assessType.max_score,
            grades,
          });
        }
      }

      setSuccessMessage('Grades saved successfully!');
      // Refresh grades after save
      await fetchGrades();
    } catch (err) {
      console.error('Error saving grades:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Submit grades for approval
  const handleSubmitForApproval = async () => {
    if (!window.confirm('Are you sure you want to submit these grades for approval? You cannot edit them after submission.')) {
      return;
    }

    try {
      setSubmitting(true);
      setSuccessMessage('');

      await submitGradesForApproval(
        parseInt(selectedClassId),
        parseInt(selectedSubjectId),
        {
          semester_id: parseInt(selectedSemesterId),
          remarks: 'Grades submitted for approval',
        }
      );

      setSuccessMessage('Grades submitted for approval successfully!');
      await fetchGrades();
    } catch (err) {
      console.error('Error submitting grades:', err);
      const errorData = err.response?.data?.error;
      setError(typeof errorData === 'object' ? errorData.message : 'Failed to submit grades');
    } finally {
      setSubmitting(false);
    }
  };

  const assessmentTypes = getAssessmentTypes();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading teaching assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grade Entry</h1>
        <p className="text-gray-500 mt-1">
          Enter and manage grades for subjects you teach. As a class head, you can also review other teachers' submissions.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Teacher-Inherited Feature</p>
          <p className="mt-1">This page uses your teacher permissions to enter grades for subjects assigned to you. Select a class and subject below to start entering grades.</p>
        </div>
      </div>

      {/* Class & Subject Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">Select class</option>
                {assignedClasses.map((cls) => (
                  <option key={cls.class_id} value={String(cls.class_id)}>
                    {cls.class_name} ({cls.grade?.name || 'Grade'})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100"
              >
                <option value="">Select subject</option>
                {getSubjectsForClass().map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <div className="relative">
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="5">First Semester (2017 E.C)</option>
                <option value="6">Second Semester (2017 E.C)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* No Classes Assigned */}
      {assignedClasses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Teaching Assignments</h3>
          <p className="text-gray-500 mt-1">You don't have any classes or subjects assigned to you yet.</p>
        </div>
      )}

      {/* Grades Loading */}
      {gradesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
          <span className="text-gray-500">Loading grades...</span>
        </div>
      )}

      {/* Grade Entry Table */}
      {gradeData && !gradesLoading && selectedClassId && selectedSubjectId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header Info */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {gradeData.subject?.name} &mdash; {gradeData.class?.name}
              </h2>
              <p className="text-sm text-gray-500">
                {gradeData.semester?.name} &middot; {gradeData.items?.length || 0} students
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveGrades}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Grades'}
              </button>
              <button
                onClick={handleSubmitForApproval}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>

          {/* Grade Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 min-w-[180px]">
                    Student Name
                  </th>
                  {assessmentTypes.map((at) => (
                    <th key={at.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                      <div>{at.name}</div>
                      <div className="text-gray-400 font-normal">Max: {at.max_score} ({at.weight_percent}%)</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Weighted Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gradeData.items?.map((student, idx) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 sticky left-0 bg-white">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-10 bg-white">
                      {student.student_name}
                    </td>
                    {assessmentTypes.map((at) => {
                      const currentScore = editedGrades[student.student_id]?.[at.id]?.score;
                      return (
                        <td key={at.id} className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={at.max_score}
                            step="0.5"
                            value={currentScore === undefined || currentScore === null ? '' : currentScore}
                            onChange={(e) =>
                              handleScoreChange(student.student_id, at.id, e.target.value, at.max_score)
                            }
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="—"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                      {(() => {
                        const total = computeStudentTotal(student);
                        return total !== null ? total.toFixed(1) : '—';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.submission_status === 'submitted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {student.submission_status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No students */}
          {(!gradeData.items || gradeData.items.length === 0) && (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No student data found for this selection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GradeEntryPage;
