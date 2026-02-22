// App.jsx - Main application component with routing
// Sets up AuthProvider, React Router, and DashboardLayout

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Admin Pages
import { 
  AdminDashboard, 
  SchoolsPage, 
  PromotionCriteriaPage, 
  StatisticsPage 
} from './pages/admin';

// School Head Pages
import {
  SchoolHeadDashboard,
  GradesClassesPage,
  SubjectsPage,
  AssessmentTypesPage,
  TeachersPage,
  TeacherAssignmentsPage
} from './pages/schoolHead';

// Teacher Pages
import {
  TeacherDashboard,
  MyClassesPage,
  TeacherGradeEntryPage,
  AssessmentWeightsPage,
  TeacherSubmissionsPage,
  AveragesPage
} from './pages/teacher';

// Class Head Pages
import {
  ClassHeadDashboard,
  StudentsPage as ClassHeadStudentsPage,
  GradeEntryPage,
  SubmissionsPage,
  CompilePublishPage,
  ClassSnapshotPage,
  StudentReportsPage,
  SendRosterPage
} from './pages/classHead';

// Student Pages
import {
  StudentDashboard,
  SubjectGradesPage,
  SemesterReportPage,
  YearReportPage,
  RankPage
} from './pages/student';

// Store House Pages
import {
  StoreHouseDashboard,
  RostersPage as StoreHouseRostersPage,
  StudentRecordsPage as StoreHouseStudentRecordsPage,
  TranscriptsPage as StoreHouseTranscriptsPage
} from './pages/storeHouse';

// Parent Pages
import {
  ParentDashboard,
  SubjectDetailPage as ParentSubjectDetailPage,
  SemesterReportPage as ParentSemesterReportPage,
  YearReportPage as ParentYearReportPage
} from './pages/parent';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="schools" element={<SchoolsPage />} />
            <Route path="schools/:id" element={<SchoolsPage />} />
            <Route path="promotion-criteria" element={<PromotionCriteriaPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="profile" element={<Dashboard />} />
          </Route>

          {/* School Head Routes */}
          <Route
            path="/school"
            element={
              <ProtectedRoute allowedRoles="school_head">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SchoolHeadDashboard />} />
            <Route path="grades" element={<GradesClassesPage />} />
            <Route path="classes" element={<GradesClassesPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="assessment-types" element={<AssessmentTypesPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="assignments" element={<TeacherAssignmentsPage />} />
            <Route path="profile" element={<Dashboard />} />
          </Route>

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles="teacher">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="classes" element={<MyClassesPage />} />
            <Route path="grades" element={<TeacherGradeEntryPage />} />
            <Route path="weights" element={<AssessmentWeightsPage />} />
            <Route path="submissions" element={<TeacherSubmissionsPage />} />
            <Route path="averages" element={<AveragesPage />} />
            <Route path="profile" element={<Dashboard />} />
          </Route>

          {/* Class Head Routes */}
          <Route
            path="/class-head"
            element={
              <ProtectedRoute allowedRoles="class_head">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClassHeadDashboard />} />
            <Route path="students" element={<ClassHeadStudentsPage />} />
            <Route path="grades" element={<GradeEntryPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="compile" element={<CompilePublishPage />} />
            <Route path="snapshot" element={<ClassSnapshotPage />} />
            <Route path="reports" element={<StudentReportsPage />} />
            <Route path="roster" element={<SendRosterPage />} />
            <Route path="profile" element={<Dashboard />} />
          </Route>

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles="student">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="subjects" element={<SubjectGradesPage />} />
            <Route path="semester-report" element={<SemesterReportPage />} />
            <Route path="year-report" element={<YearReportPage />} />
            <Route path="rank" element={<RankPage />} />
          </Route>

          {/* Parent Routes */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles="parent">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="subjects" element={<ParentSubjectDetailPage />} />
            <Route path="semester-report" element={<ParentSemesterReportPage />} />
            <Route path="year-report" element={<ParentYearReportPage />} />
          </Route>

          {/* Store House Routes */}
          <Route
            path="/store-house"
            element={
              <ProtectedRoute allowedRoles="store_house">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StoreHouseDashboard />} />
            <Route path="rosters" element={<StoreHouseRostersPage />} />
            <Route path="students" element={<StoreHouseStudentRecordsPage />} />
            <Route path="transcripts" element={<StoreHouseTranscriptsPage />} />
          </Route>

          {/* Legacy dashboard route - redirect based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          {/* Default Route - Redirect to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 - Redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Helper component to redirect to role-specific dashboard
function RoleRedirect() {
  // This is handled by ProtectedRoute already
  return <Navigate to="/login" replace />;
}

export default App;
