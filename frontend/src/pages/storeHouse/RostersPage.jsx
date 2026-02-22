// Rosters Page - View class rosters received from class heads
// Shows list of rosters and detailed 3-row-per-student roster view (Sem 1, Sem 2, Average)
// API: GET /store-house/rosters, GET /store-house/rosters/:id

import React, { useState, useEffect } from 'react';
import {
  Archive, RefreshCw, AlertCircle,
  Users, Eye, ArrowLeft, BarChart3
} from 'lucide-react';
import { listRosters, getRoster } from '../../services/storeHouseService';

// Alternating color bands for student groups (matching school roster design)
const studentBandColors = [
  { bg: 'bg-white', border: 'border-gray-100' },
  { bg: 'bg-blue-50', border: 'border-blue-100' },
  { bg: 'bg-green-50', border: 'border-green-100' },
  { bg: 'bg-amber-50', border: 'border-amber-100' },
];

const RostersPage = () => {
  const [rosters, setRosters] = useState([]);
  const [selectedRosterId, setSelectedRosterId] = useState(null);
  const [rosterDetail, setRosterDetail] = useState(null);       // primary roster (clicked)
  const [companionDetail, setCompanionDetail] = useState(null);  // other semester for same class
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRosters();
  }, []);

  const fetchRosters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRosters();
      if (res.success) {
        setRosters(res.data.items || []);
      }
    } catch (err) {
      setError('Failed to load rosters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // When viewing a roster, also try to fetch the companion semester roster
  const handleViewRoster = async (rosterId) => {
    setSelectedRosterId(rosterId);
    setDetailLoading(true);
    setRosterDetail(null);
    setCompanionDetail(null);
    try {
      // Fetch the primary roster
      const res = await getRoster(rosterId);
      if (res.success) {
        setRosterDetail(res.data);

        // Find the companion roster (same class, different semester)
        const clickedRoster = rosters.find(r => r.roster_id === rosterId);
        if (clickedRoster) {
          const companion = rosters.find(
            r => r.roster_id !== rosterId &&
                 r.class?.id === clickedRoster.class?.id
          );
          if (companion) {
            try {
              const companionRes = await getRoster(companion.roster_id);
              if (companionRes.success) {
                setCompanionDetail(companionRes.data);
              }
            } catch { /* companion not available, that's ok */ }
          }
        }
      }
    } catch (err) {
      console.error('Error loading roster detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedRosterId(null);
    setRosterDetail(null);
    setCompanionDetail(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // =============================================
  // DETAIL VIEW - 3-row-per-student roster table
  // =============================================
  if (selectedRosterId && detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (selectedRosterId && rosterDetail) {
    // Determine which is Sem 1 and which is Sem 2
    let sem1Data = null;
    let sem2Data = null;

    const primarySemName = (rosterDetail.semester || '').toLowerCase();
    if (primarySemName.includes('first') || primarySemName.includes('1')) {
      sem1Data = rosterDetail;
      sem2Data = companionDetail;
    } else {
      sem2Data = rosterDetail;
      sem1Data = companionDetail;
    }

    // Build a merged student list with both semester data
    const sem1Students = sem1Data?.students || [];
    const sem2Students = sem2Data?.students || [];

    // Index students by student_id (or name as fallback)
    const studentMap = {};
    sem1Students.forEach(s => {
      const key = s.student_id || s.name;
      studentMap[key] = {
        student_id: s.student_id,
        name: s.name,
        sex: s.sex,
        age: s.age,
        sem1: s,
        sem2: null,
      };
    });
    sem2Students.forEach(s => {
      const key = s.student_id || s.name;
      if (studentMap[key]) {
        studentMap[key].sem2 = s;
      } else {
        studentMap[key] = {
          student_id: s.student_id,
          name: s.name,
          sex: s.sex,
          age: s.age,
          sem1: null,
          sem2: s,
        };
      }
    });

    const mergedStudents = Object.values(studentMap).sort((a, b) => {
      // Sort by sem1 rank, then sem2 rank, then name
      const aRank = a.sem1?.rank || a.sem2?.rank || 999;
      const bRank = b.sem1?.rank || b.sem2?.rank || 999;
      return aRank - bRank;
    });

    // Compute average ranks: sort all students by their average total descending
    const avgRankMap = {};
    const studentsForAvgRank = mergedStudents.map(student => {
      const s1 = student.sem1;
      const s2 = student.sem2;
      const t1 = parseFloat(s1?.total) || 0;
      const t2 = parseFloat(s2?.total) || 0;
      const count = (t1 > 0 ? 1 : 0) + (t2 > 0 ? 1 : 0);
      const avgTot = count > 0 ? (t1 + t2) / count : 0;
      return { key: student.student_id || student.name, avgTotal: avgTot };
    });
    studentsForAvgRank.sort((a, b) => b.avgTotal - a.avgTotal);
    studentsForAvgRank.forEach((s, idx) => { avgRankMap[s.key] = idx + 1; });

    // Extract all unique subject names (in order)
    const subjectNamesSet = new Set();
    sem1Students.forEach(s => {
      if (s.subject_scores) Object.keys(s.subject_scores).forEach(n => subjectNamesSet.add(n));
    });
    sem2Students.forEach(s => {
      if (s.subject_scores) Object.keys(s.subject_scores).forEach(n => subjectNamesSet.add(n));
    });
    const subjectNames = Array.from(subjectNamesSet);

    // Abbreviate long subject names for the header
    const abbreviate = (name) => {
      if (name.length <= 8) return name;
      // Take first word or abbreviate
      const words = name.split(/[\s\/]+/);
      if (words.length >= 2) {
        return words.map(w => w.charAt(0).toUpperCase()).join('/');
      }
      return name.substring(0, 6) + '..';
    };

    const stats = rosterDetail.class_statistics || {};

    // Helper: ordinal suffix
    const getOrdinal = (n) => {
      if (!n) return '';
      if (n % 100 >= 11 && n % 100 <= 13) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    // Helper: format score or show "="
    const fmtScore = (val) => {
      if (val == null || val === undefined) return '=';
      const num = parseFloat(val);
      return isNaN(num) ? '=' : Math.round(num);
    };

    return (
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <button
            onClick={handleBack}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Rosters
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Student Roster — {rosterDetail.class?.grade_name} {rosterDetail.class?.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Academic Year: {rosterDetail.academic_year} | Class Head: {rosterDetail.class_head?.name || '—'}
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-xl font-bold text-gray-900">{stats.total_students || mergedStudents.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Class Average</p>
            <p className="text-xl font-bold text-blue-700">{stats.class_average?.toFixed(1) || '—'}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Promoted</p>
            <p className="text-xl font-bold text-green-600">{stats.promoted || 0}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Retained</p>
            <p className="text-xl font-bold text-red-600">{stats.retained || 0}</p>
          </div>
        </div>

        {/* Roster Table - 3 rows per student */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              {/* Header */}
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold w-8">N/O</th>
                  <th className="border border-gray-300 px-2 py-2 text-left font-bold min-w-[140px]">Name of student</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold w-10">Sex</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold w-10">Age</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold w-10">Sem</th>
                  {subjectNames.map(name => (
                    <th key={name} className="border border-gray-300 px-1.5 py-2 text-center font-bold whitespace-nowrap" title={name}>
                      {abbreviate(name)}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Total</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Aver.</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Rank</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Abse.</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Cond</th>
                  <th className="border border-gray-300 px-2 py-2 text-center font-bold">Rmark</th>
                </tr>
              </thead>
              <tbody>
                {mergedStudents.map((student, idx) => {
                  const band = studentBandColors[idx % studentBandColors.length];
                  const s1 = student.sem1;
                  const s2 = student.sem2;

                  // Compute averages for each subject
                  const subjectAvgs = {};
                  subjectNames.forEach(name => {
                    const v1 = s1?.subject_scores?.[name];
                    const v2 = s2?.subject_scores?.[name];
                    if (v1 != null && v2 != null) {
                      subjectAvgs[name] = (parseFloat(v1) + parseFloat(v2)) / 2;
                    } else if (v1 != null) {
                      subjectAvgs[name] = parseFloat(v1);
                    } else if (v2 != null) {
                      subjectAvgs[name] = parseFloat(v2);
                    } else {
                      subjectAvgs[name] = null;
                    }
                  });

                  const avgTotal = s1 && s2
                    ? ((parseFloat(s1.total) || 0) + (parseFloat(s2.total) || 0)) / 2
                    : parseFloat(s1?.total ?? s2?.total) || null;
                  const avgAverage = s1 && s2
                    ? ((parseFloat(s1.average) || 0) + (parseFloat(s2.average) || 0)) / 2
                    : parseFloat(s1?.average ?? s2?.average) || null;

                  // Remark icon
                  const remark = s1?.remark || s2?.remark;
                  const remarkIcon = remark === 'Promoted' ? '↑' : remark === 'Not Promoted' ? '' : '';

                  return (
                    <React.Fragment key={student.student_id || idx}>
                      {/* Row 1: Semester 1 */}
                      <tr className={band.bg}>
                        <td rowSpan={3} className={`border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-700 align-middle`}>
                          {idx + 1}
                        </td>
                        <td rowSpan={3} className={`border border-gray-300 px-2 py-1.5 font-medium text-gray-900 align-middle whitespace-nowrap`}>
                          {student.name}
                        </td>
                        <td rowSpan={3} className={`border border-gray-300 px-2 py-1.5 text-center text-gray-700 align-middle`}>
                          {student.sex || '—'}
                        </td>
                        <td rowSpan={3} className={`border border-gray-300 px-2 py-1.5 text-center text-gray-700 align-middle`}>
                          {student.age || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-600">1</td>
                        {subjectNames.map(name => (
                          <td key={name} className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-700">
                            {fmtScore(s1?.subject_scores?.[name])}
                          </td>
                        ))}
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-800">
                          {s1 ? fmtScore(s1.total) : '='}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-800">
                          {s1 ? fmtScore(s1.average) : '='}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700">
                          {s1?.rank || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700">
                          {s1 ? (s1.absent_days ?? 0) : ''}
                        </td>
                        <td rowSpan={3} className="border border-gray-300 px-2 py-1.5 text-center text-gray-700 align-middle">
                          {s1?.conduct === 'Good' ? 'A' : (s1?.conduct || '')}
                        </td>
                        <td rowSpan={3} className="border border-gray-300 px-2 py-1.5 text-center align-middle">
                          {remark === 'Promoted' ? (
                            <span className="text-green-600 font-bold">↑</span>
                          ) : remark ? (
                            <span className="text-red-500 text-xs">{remark}</span>
                          ) : ''}
                        </td>
                      </tr>

                      {/* Row 2: Semester 2 */}
                      <tr className={band.bg}>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-600">2</td>
                        {subjectNames.map(name => (
                          <td key={name} className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-700">
                            {fmtScore(s2?.subject_scores?.[name])}
                          </td>
                        ))}
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-800">
                          {s2 ? fmtScore(s2.total) : ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-800">
                          {s2 ? fmtScore(s2.average) : ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700">
                          {s2?.rank || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700">
                          {s2 ? (s2.absent_days ?? 0) : ''}
                        </td>
                      </tr>

                      {/* Row 3: Average */}
                      <tr className={`${band.bg} font-bold`}>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-600">Av</td>
                        {subjectNames.map(name => (
                          <td key={name} className="border border-gray-300 px-1.5 py-1.5 text-center text-gray-900">
                            {subjectAvgs[name] != null ? Math.round(subjectAvgs[name] * 10) / 10 : ''}
                          </td>
                        ))}
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-900">
                          {avgTotal != null ? Math.round(avgTotal * 10) / 10 : ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-900">
                          {avgAverage != null ? Math.round(avgAverage * 10) / 10 : ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-900">
                          {avgRankMap[student.student_id || student.name] || ''}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700"></td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {mergedStudents.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p className="text-sm">No student data in this roster.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =============================================
  // LIST VIEW - All rosters
  // =============================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Class Rosters</h1>
        <p className="text-gray-500 mt-1">
          Organize and manage finalized semester reports by class, year, and semester.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Overview stat */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xs text-gray-500">Total Rosters</p>
            <p className="text-lg font-bold text-gray-900">{rosters.length}</p>
          </div>
        </div>
      </div>

      {/* Roster List */}
      {rosters.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Academic Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Semester</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class Head</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Received</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rosters.map((roster) => (
                  <tr key={roster.roster_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{roster.class?.name}</p>
                        <p className="text-xs text-gray-500">{roster.class?.grade_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{roster.academic_year}</td>
                    <td className="px-4 py-3 text-gray-600">{roster.semester || '—'}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900">{roster.student_count}</td>
                    <td className="px-4 py-3 text-gray-600">{roster.class_head || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {roster.received_at ? new Date(roster.received_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {roster.status || 'Complete'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewRoster(roster.roster_id)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Archive className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-900">No Rosters Received</p>
          <p className="text-sm mt-1">Rosters will appear here when class heads send them.</p>
        </div>
      )}
    </div>
  );
};

export default RostersPage;
