// Store House Controller
// Handles rosters, cumulative records, and transcripts

const { pool } = require('../config/db');

// ==========================================
// ROSTERS
// ==========================================

/**
 * GET /api/v1/store-house/rosters
 * List all rosters received from class heads
 */
const listRosters = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id, grade_id, class_id } = req.query;

    let query = `
      SELECT r.id as roster_id, r.class_id, c.name as class_name, g.name as grade_name,
             ay.name as academic_year, sem.name as semester_name,
             u.name as class_head_name, r.submitted_at as received_at,
             JSON_LENGTH(JSON_EXTRACT(r.roster_data, '$.students')) as student_count
      FROM rosters r
      JOIN classes c ON r.class_id = c.id
      JOIN grades g ON c.grade_id = g.id
      JOIN semesters sem ON r.semester_id = sem.id
      JOIN academic_years ay ON sem.academic_year_id = ay.id
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE g.school_id = ?
    `;
    const params = [schoolId];

    if (academic_year_id) {
      query += ' AND sem.academic_year_id = ?';
      params.push(academic_year_id);
    }
    if (grade_id) {
      query += ' AND g.id = ?';
      params.push(grade_id);
    }
    if (class_id) {
      query += ' AND r.class_id = ?';
      params.push(class_id);
    }

    query += ' ORDER BY r.submitted_at DESC';

    const [rosters] = await pool.query(query, params);

    const items = rosters.map(r => ({
      roster_id: r.roster_id,
      class: { id: r.class_id, name: r.class_name, grade_name: r.grade_name },
      academic_year: r.academic_year,
      semester: r.semester_name,
      student_count: r.student_count || 0,
      class_head: r.class_head_name,
      received_at: r.received_at,
      status: 'complete'
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List rosters error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rosters.' }
    });
  }
};

/**
 * GET /api/v1/store-house/rosters/:roster_id
 * Get roster details
 */
const getRoster = async (req, res) => {
  try {
    const { roster_id } = req.params;
    const schoolId = req.user.school_id;

    const [rosters] = await pool.query(
      `SELECT r.*, c.name as class_name, g.name as grade_name,
              ay.name as academic_year, sem.name as semester_name,
              u.id as class_head_id, u.name as class_head_name, u.phone as class_head_phone
       FROM rosters r
       JOIN classes c ON r.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       JOIN semesters sem ON r.semester_id = sem.id
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       LEFT JOIN users u ON r.submitted_by = u.id
       WHERE r.id = ? AND g.school_id = ?`,
      [roster_id, schoolId]
    );

    if (rosters.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Roster not found.' }
      });
    }

    const roster = rosters[0];
    const rosterData = typeof roster.roster_data === 'string'
      ? JSON.parse(roster.roster_data || '{}')
      : (roster.roster_data || {});
    const students = rosterData.students || [];

    // Calculate statistics
    const promoted = students.filter(s => s.remark === 'Promoted').length;
    const retained = students.filter(s => s.remark === 'Not Promoted').length;
    const avgScore = students.length > 0 
      ? students.reduce((sum, s) => sum + (s.average || 0), 0) / students.length 
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        roster_id: roster.id,
        class: { id: roster.class_id, name: roster.class_name, grade_name: roster.grade_name },
        academic_year: roster.academic_year,
        semester: roster.semester_name,
        class_head: roster.class_head_id ? {
          id: roster.class_head_id,
          name: roster.class_head_name,
          phone: roster.class_head_phone
        } : null,
        students: students,
        class_statistics: {
          total_students: students.length,
          class_average: Math.round(avgScore * 100) / 100,
          promoted: promoted,
          retained: retained
        },
        received_at: roster.submitted_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get roster error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch roster.' }
    });
  }
};

// ==========================================
// STUDENT SEARCH
// ==========================================

/**
 * GET /api/v1/store-house/students/search
 * Search student records
 */
const searchStudents = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { student_code, name, grade_id } = req.query;

    let query = `
      SELECT s.id as student_id, s.student_id_number as student_code,
             u.name, c.name as current_class, g.name as current_grade,
             s.date_of_admission
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      JOIN grades g ON c.grade_id = g.id
      WHERE g.school_id = ?
    `;
    const params = [schoolId];

    if (student_code) {
      query += ' AND s.student_id_number LIKE ?';
      params.push(`%${student_code}%`);
    }
    if (name) {
      query += ' AND u.name LIKE ?';
      params.push(`%${name}%`);
    }
    if (grade_id) {
      query += ' AND g.id = ?';
      params.push(grade_id);
    }

    query += ' ORDER BY u.name LIMIT 50';

    const [students] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { items: students },
      error: null
    });
  } catch (error) {
    console.error('Search students error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search students.' }
    });
  }
};

// ==========================================
// CUMULATIVE RECORDS
// ==========================================

/**
 * GET /api/v1/store-house/students/:student_id/cumulative-record
 * Get student's cumulative academic record
 */
const getCumulativeRecord = async (req, res) => {
  try {
    const { student_id } = req.params;
    const schoolId = req.user.school_id;

    // Get student info
    const [students] = await pool.query(
      `SELECT s.id, s.student_id_number as code, u.name, s.sex as gender,
              s.date_of_birth, s.date_of_admission,
              c.name as current_class, g.name as current_grade
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const student = students[0];

    // Get academic history from semester results
    const [history] = await pool.query(
      `SELECT ssr.*, ay.name as academic_year, sem.name as semester_name,
              c.name as class_name, g.name as grade_name
       FROM student_semester_results ssr
       JOIN semesters sem ON ssr.semester_id = sem.id
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       JOIN students s ON ssr.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ssr.student_id = ?
       ORDER BY ay.start_date, sem.semester_number`,
      [student_id]
    );

    const academicHistory = history.map(h => ({
      academic_year: h.academic_year,
      semester: h.semester_name,
      grade_level: h.grade_name,
      class_name: h.class_name,
      total: parseFloat(h.total_score) || 0,
      average: parseFloat(h.average_score) || 0,
      rank: h.rank_in_class,
      remark: h.remark
    }));

    // Calculate cumulative average
    const cumulativeAvg = academicHistory.length > 0
      ? academicHistory.reduce((sum, h) => sum + h.average, 0) / academicHistory.length
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          code: student.code,
          name: student.name,
          gender: student.gender,
          date_of_birth: student.date_of_birth,
          enrollment_date: student.date_of_admission,
          current_grade: student.current_grade,
          current_class: student.current_class
        },
        academic_history: academicHistory,
        cumulative_average: Math.round(cumulativeAvg * 100) / 100,
        completion_status: 'In Progress'
      },
      error: null
    });
  } catch (error) {
    console.error('Get cumulative record error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cumulative record.' }
    });
  }
};

// ==========================================
// TRANSCRIPTS
// ==========================================

/**
 * POST /api/v1/store-house/students/:student_id/transcript
 * Generate transcript
 */
const generateTranscript = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { purpose } = req.body;
    const schoolId = req.user.school_id;

    // Get student info
    const [students] = await pool.query(
      `SELECT s.id, s.student_id_number as code, u.name, s.sex,
              s.date_of_birth, s.date_of_admission,
              c.name as current_class, g.name as current_grade, g.level as grade_level
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const student = students[0];

    // Get all semester results with subjects
    const [results] = await pool.query(
      `SELECT ssr.*, ay.name as academic_year, sem.name as semester_name,
              c.name as class_name, g.name as grade_name,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = s.class_id) as class_size
       FROM student_semester_results ssr
       JOIN semesters sem ON ssr.semester_id = sem.id
       JOIN academic_years ay ON sem.academic_year_id = ay.id
       JOIN students s ON ssr.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ssr.student_id = ?
       ORDER BY ay.start_date, sem.semester_number`,
      [student_id]
    );

    // Build transcript data
    const academicRecords = [];
    for (const result of results) {
      // Get subjects for this semester (from marks)
      const [subjects] = await pool.query(
        `SELECT sub.name,
                SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
         FROM marks m
         JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
         JOIN subjects sub ON ta.subject_id = sub.id
         JOIN assessment_types at ON m.assessment_type_id = at.id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                         AND aw.assessment_type_id = m.assessment_type_id 
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.semester_id = ?
         GROUP BY sub.id, sub.name
         ORDER BY sub.name`,
        [student_id, result.semester_id]
      );

      academicRecords.push({
        year: result.academic_year,
        grade_level: result.grade_name,
        semester: result.semester_name,
        subjects: subjects.map(s => ({
          name: s.name,
          score: Math.round((s.score || 0) * 100) / 100
        })),
        total: parseFloat(result.total_score) || 0,
        average: parseFloat(result.average_score) || 0,
        rank_in_class: `${result.rank_in_class} of ${result.class_size || 0}`,
        conduct: result.conduct || 'Good',
        number_of_students: result.class_size || 0,
        promotion_status: result.remark
      });
    }

    // Generate transcript ID
    const transcriptId = `TR-${new Date().getFullYear()}-${String(student_id).padStart(5, '0')}`;

    // Calculate age
    const birthDate = new Date(student.date_of_birth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    // Store transcript (purpose and transcript_number stored in JSON)
    await pool.query(
      `INSERT INTO transcripts (student_id, transcript_data, generated_by)
       VALUES (?, ?, ?)`,
      [student_id, JSON.stringify({
        transcript_number: transcriptId,
        purpose: purpose || 'General',
        student: { ...student, age },
        academic_records: academicRecords
      }), req.user.id]
    );

    return res.status(201).json({
      success: true,
      data: {
        transcript_id: transcriptId,
        student: {
          id: student.id,
          name: student.name,
          age: age,
          sex: student.sex,
          date_of_admission: student.date_of_admission,
          last_grade_attended: student.current_grade
        },
        grades_included: [...new Set(academicRecords.map(r => r.grade_level))],
        academic_records: academicRecords,
        generated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Generate transcript error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate transcript.' }
    });
  }
};

/**
 * GET /api/v1/store-house/transcripts
 * List all generated transcripts
 */
const listTranscripts = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [transcripts] = await pool.query(
      `SELECT t.id, t.student_id, t.transcript_data, t.generated_at,
              u.name as student_name, s.student_id_number as student_code,
              gen.name as generated_by_name
       FROM transcripts t
       JOIN students s ON t.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       LEFT JOIN users gen ON t.generated_by = gen.id
       WHERE g.school_id = ?
       ORDER BY t.generated_at DESC`,
      [schoolId]
    );

    // Extract transcript_number and purpose from JSON
    // MySQL JSON columns may return parsed objects or strings depending on driver
    const items = transcripts.map(t => {
      const data = typeof t.transcript_data === 'string'
        ? JSON.parse(t.transcript_data || '{}')
        : (t.transcript_data || {});
      return {
        id: t.id,
        transcript_number: data.transcript_number,
        student_id: t.student_id,
        student_name: t.student_name,
        student_code: t.student_code,
        purpose: data.purpose,
        generated_at: t.generated_at,
        generated_by_name: t.generated_by_name
      };
    });

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List transcripts error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list transcripts.' }
    });
  }
};

/**
 * GET /api/v1/store-house/transcripts/:transcript_id
 * Get transcript details
 */
const getTranscript = async (req, res) => {
  try {
    const { transcript_id } = req.params;
    const schoolId = req.user.school_id;

    const [transcripts] = await pool.query(
      `SELECT t.*, u.name as student_name, s.student_id_number as student_code
       FROM transcripts t
       JOIN students s ON t.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE t.id = ? AND g.school_id = ?`,
      [transcript_id, schoolId]
    );

    if (transcripts.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Transcript not found.' }
      });
    }

    const transcript = transcripts[0];
    const transcriptData = typeof transcript.transcript_data === 'string'
      ? JSON.parse(transcript.transcript_data || '{}')
      : (transcript.transcript_data || {});

    return res.status(200).json({
      success: true,
      data: {
        id: transcript.id,
        transcript_number: transcriptData.transcript_number,
        student: {
          id: transcript.student_id,
          name: transcript.student_name,
          code: transcript.student_code,
          ...transcriptData.student
        },
        academic_records: transcriptData.academic_records || [],
        purpose: transcriptData.purpose,
        generated_at: transcript.generated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get transcript error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transcript.' }
    });
  }
};

module.exports = {
  listRosters,
  getRoster,
  searchStudents,
  getCumulativeRecord,
  generateTranscript,
  listTranscripts,
  getTranscript
};


