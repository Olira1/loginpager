// Grade Entry Page - Enter, edit, and delete student grades
// Maps to: GET /teacher/classes/:id/subjects/:id/grades, POST /teacher/grades,
//          POST /teacher/grades/bulk, PUT /teacher/grades/:id, DELETE /teacher/grades/:id

import { useState, useEffect } from 'react';
import {
  FileText, AlertCircle, RefreshCw, CheckCircle2, Save,
  Send, Trash2, Users
} from 'lucide-react';
import {
  getAssignedClasses,
  listStudentGrades,
  enterBulkGrades,
  updateGrade,
  deleteGrade,
  submitGradesForApproval
} from '../../services/teacherService';

const GradeEntryPage = () => {
  // Selection state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // Grade data
  const [gradeData, setGradeData] = useState(null);
  const [editedScores, setEditedScores] = useState({});

  // UI state
  const [loading, setLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const semesters = [
    { id: 5, name: 'First Semester (2017 E.C)' },
    { id: 6, name: 'Second Semester (2017 E.C)' },
  ];

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const cls = classes.find(c => c.class_id === parseInt(selectedClass));
      setAvailableSubjects(cls?.subjects || []);
      setSelectedSubject('');
      setGradeData(null);
      setEditedScores({});
    }
  }, [selectedClass, classes]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedSemester) {
      fetchGrades();
    }
  }, [selectedClass, selectedSubject, selectedSemester]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await getAssignedClasses();
      if (response.success) {
        setClasses(response.data?.items || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    setGradesLoading(true);
    setError(null);
    setSuccess(null);
    setEditedScores({});
    try {
      const response = await listStudentGrades(
        parseInt(selectedClass),
        parseInt(selectedSubject),
        { semester_id: selectedSemester }
      );
      if (response.success) {
        setGradeData(response.data);
      }
    } catch (err) {
      console.error('Fetch grades error:', err);
      setError(err.response?.data?.error?.message || 'Failed to load grades.');
    } finally {
      setGradesLoading(false);
    }
  };

  // Get assessment types - prefer the dedicated assessment_types from the API,
  // fall back to deriving from first student's grades for backward compatibility
  const assessmentTypes = gradeData?.assessment_types?.map(at => ({
    id: at.assessment_type_id,
    name: at.assessment_type_name,
    max_score: parseFloat(at.max_score) || 0,
    weight_percent: parseFloat(at.weight_percent) || 0
  })) || gradeData?.items?.[0]?.grades?.map(g => ({
    id: g.assessment_type_id,
    name: g.assessment_type_name,
    max_score: parseFloat(g.max_score) || 0,
    weight_percent: parseFloat(g.weight_percent) || 0
  })) || [];

  // Handle score change in the grid
  const handleScoreChange = (studentId, assessmentTypeId, value) => {
    setEditedScores(prev => ({
      ...prev,
      [`${studentId}-${assessmentTypeId}`]: value
    }));
    setSuccess(null);
  };

  // Get the display value for a cell
  const getCellValue = (student, assessmentTypeId) => {
    const key = `${student.student_id}-${assessmentTypeId}`;
    if (editedScores[key] !== undefined) return editedScores[key];
    const grade = student.grades?.find(g => g.assessment_type_id === assessmentTypeId);
    // Return empty string if score is null (no mark entered yet)
    return grade?.score != null ? grade.score : '';
  };

  // Get grade ID for a cell (for updates)
  const getGradeId = (student, assessmentTypeId) => {
    const grade = student.grades?.find(g => g.assessment_type_id === assessmentTypeId);
    return grade?.id;
  };

  // Compute total weighted score for a student from visible grades
  const computeTotal = (student) => {
    let total = 0;
    let hasAnyScore = false;
    for (const at of assessmentTypes) {
      const cellVal = getCellValue(student, at.id);
      const score = parseFloat(cellVal);
      const maxScore = parseFloat(at.max_score) || 100;
      const weight = parseFloat(at.weight_percent) || 0;
      if (!isNaN(score) && score !== '' && cellVal !== '') {
        total += (score / maxScore) * weight;
        hasAnyScore = true;
      }
    }
    return hasAnyScore ? Math.round(total * 100) / 100 : null;
  };

  // Save all edited grades (bulk)
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Group edited scores by assessment type for bulk entry
      const gradesByType = {};
      for (const [key, value] of Object.entries(editedScores)) {
        if (value === '' || value === null || value === undefined) continue;
        const [studentId, assessmentTypeId] = key.split('-');
        if (!gradesByType[assessmentTypeId]) {
          gradesByType[assessmentTypeId] = [];
        }

        const student = gradeData?.items?.find(s => s.student_id === parseInt(studentId));
        const existingGradeId = getGradeId(student, parseInt(assessmentTypeId));
        const assessmentType = assessmentTypes.find(a => a.id === parseInt(assessmentTypeId));

        if (existingGradeId) {
          // Update existing grade
          await updateGrade(existingGradeId, { score: parseFloat(value) });
        } else {
          gradesByType[assessmentTypeId].push({
            student_id: parseInt(studentId),
            score: parseFloat(value)
          });
        }
      }

      // Bulk enter new grades
      for (const [assessmentTypeId, grades] of Object.entries(gradesByType)) {
        if (grades.length > 0) {
          const assessmentType = assessmentTypes.find(a => a.id === parseInt(assessmentTypeId));
          await enterBulkGrades({
            class_id: parseInt(selectedClass),
            subject_id: parseInt(selectedSubject),
            semester_id: parseInt(selectedSemester),
            assessment_type_id: parseInt(assessmentTypeId),
            max_score: assessmentType?.max_score || 100,
            grades
          });
        }
      }

      setSuccess('Grades saved successfully!');
      setEditedScores({});
      fetchGrades(); // Refresh
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save grades.');
    } finally {
      setSaving(false);
    }
  };

  // Check if any grades have been entered (either saved or edited)
  const hasAnyGrades = () => {
    if (!gradeData?.items) return false;
    // Check if any student has at least one non-null score (saved marks)
    for (const student of gradeData.items) {
      for (const grade of (student.grades || [])) {
        if (grade.score != null) return true;
      }
    }
    // Also check if any edited (unsaved) scores exist
    return Object.values(editedScores).some(v => v !== '' && v != null);
  };

  // Submit grades for approval
  const handleSubmit = async () => {
    if (!hasAnyGrades()) {
      setError('Cannot submit: no grades have been entered yet. Please enter marks first.');
      return;
    }
    if (!window.confirm('Submit all grades for Class Head approval? You cannot modify them after submission.')) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await submitGradesForApproval(
        parseInt(selectedClass),
        parseInt(selectedSubject),
        { semester_id: parseInt(selectedSemester) }
      );
      if (response.success) {
        setSuccess('Grades submitted for approval successfully!');
        fetchGrades();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit grades.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a grade
  const handleDelete = async (gradeId) => {
    if (!window.confirm('Delete this grade entry?')) return;
    try {
      await deleteGrade(gradeId);
      fetchGrades();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete grade.');
    }
  };

  const isSubmitted = gradeData?.items?.some(s => s.submission_status === 'submitted' || s.submission_status === 'approved');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Mark Entry</h1>
        <p className="text-gray-500 mt-1">Enter and manage student marks for selected class and subject. Ensure all marks are within valid ranges before submission.</p>
      </div>

      {/* Selectors */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name} ({cls.grade?.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Semester</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* Submitted Notice */}
      {isSubmitted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-700">
          <Send className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Grades have been submitted for approval. Editing is disabled.</span>
        </div>
      )}

      {/* Grade Grid */}
      {gradesLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : gradeData && gradeData.items?.length > 0 ? (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-700 sticky left-0 bg-gray-50 min-w-[180px]">
                      Student Name
                    </th>
                    {assessmentTypes.map(at => (
                      <th key={at.id} className="text-center px-3 py-3 font-medium text-gray-700 min-w-[120px]">
                        <div>{at.name}</div>
                        <div className="text-xs text-gray-400 font-normal">
                          ({at.weight_percent || 0}%) Max: {at.max_score}
                        </div>
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-700 min-w-[100px]">
                      Total (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gradeData.items.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white">
                        {student.student_name}
                      </td>
                      {assessmentTypes.map(at => {
                        const gradeId = getGradeId(student, at.id);
                        return (
                          <td key={at.id} className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={at.max_score}
                                step="0.5"
                                value={getCellValue(student, at.id)}
                                onChange={(e) => handleScoreChange(student.student_id, at.id, e.target.value)}
                                disabled={isSubmitted}
                                placeholder={`Max ${at.max_score}`}
                                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                              />
                              {gradeId && !isSubmitted && (
                                <button
                                  onClick={() => handleDelete(gradeId)}
                                  className="p-1 text-gray-300 hover:text-red-500"
                                  title="Delete grade"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-semibold text-gray-900">
                        {(() => {
                          const total = computeTotal(student);
                          return total !== null ? total.toFixed(1) : '-';
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          {!isSubmitted && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {Object.keys(editedScores).length > 0
                  ? `${Object.keys(editedScores).length} unsaved changes`
                  : 'Ready to save or submit marks.'
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || Object.keys(editedScores).length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Marks
                </button>
              </div>
            </div>
          )}
        </>
      ) : selectedClass && selectedSubject && selectedSemester ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3" />
          <p>No students or grades found for this selection.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p>Select a class, subject, and semester to start entering marks.</p>
        </div>
      )}
    </div>
  );
};

export default GradeEntryPage;
