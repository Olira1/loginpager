// Generic Dashboard Page
// Shows welcome message and basic stats based on user role
// Each role will have specific dashboard pages later

import { useAuth } from '../context/AuthContext';
import { roleDisplayNames } from '../config/navigation';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  BookOpen,
  FileText,
  BarChart3,
  Clock,
  CheckCircle2
} from 'lucide-react';

// Role-specific dashboard content
const RoleDashboardContent = ({ role }) => {
  switch (role) {
    case 'admin':
      return <AdminDashboardPreview />;
    case 'school_head':
      return <SchoolHeadDashboardPreview />;
    case 'teacher':
      return <TeacherDashboardPreview />;
    case 'class_head':
      return <ClassHeadDashboardPreview />;
    case 'student':
      return <StudentDashboardPreview />;
    case 'parent':
      return <ParentDashboardPreview />;
    case 'store_house':
      return <StoreHouseDashboardPreview />;
    default:
      return <DefaultDashboard />;
  }
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Preview
const AdminDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Building2} label="Active Schools" value="2" color="blue" />
      <StatCard icon={Users} label="Total Users" value="28" color="green" />
      <StatCard icon={GraduationCap} label="Total Students" value="10" color="orange" />
      <StatCard icon={CheckCircle2} label="Active Criteria" value="4" color="purple" />
    </div>
    <ComingSoonCard message="Full admin dashboard with school management, statistics, and more coming soon!" />
  </div>
);

// School Head Dashboard Preview
const SchoolHeadDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={GraduationCap} label="Grades" value="4" color="indigo" />
      <StatCard icon={Users} label="Classes" value="8" color="blue" />
      <StatCard icon={BookOpen} label="Subjects" value="10" color="green" />
      <StatCard icon={Users} label="Teachers" value="6" color="orange" />
    </div>
    <ComingSoonCard message="Full school management dashboard with grade setup, class assignments, and teacher management coming soon!" />
  </div>
);

// Teacher Dashboard Preview
const TeacherDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="My Classes" value="3" color="indigo" />
      <StatCard icon={BookOpen} label="Subjects" value="2" color="blue" />
      <StatCard icon={FileText} label="Pending Grades" value="45" color="orange" />
      <StatCard icon={CheckCircle2} label="Submitted" value="2" color="green" />
    </div>
    <ComingSoonCard message="Grade entry interface, assessment weights setup, and submission tracking coming soon!" />
  </div>
);

// Class Head Dashboard Preview
const ClassHeadDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Students" value="35" color="indigo" />
      <StatCard icon={Clock} label="Pending Reviews" value="4" color="orange" />
      <StatCard icon={CheckCircle2} label="Approved" value="6" color="green" />
      <StatCard icon={BarChart3} label="Class Average" value="72.5" color="blue" />
    </div>
    <ComingSoonCard message="Submission review, grade compilation, and roster management coming soon!" />
  </div>
);

// Student Dashboard Preview
const StudentDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={BookOpen} label="Subjects" value="8" color="indigo" />
      <StatCard icon={BarChart3} label="Average" value="78.5" color="blue" />
      <StatCard icon={GraduationCap} label="Rank" value="5th" color="green" />
      <StatCard icon={CheckCircle2} label="Status" value="Pass" color="purple" />
    </div>
    <ComingSoonCard message="Report cards, subject breakdown, and academic progress tracking coming soon!" />
  </div>
);

// Parent Dashboard Preview
const ParentDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Children" value="1" color="indigo" />
      <StatCard icon={BarChart3} label="Average" value="78.5" color="blue" />
      <StatCard icon={GraduationCap} label="Best Rank" value="5th" color="green" />
      <StatCard icon={FileText} label="Reports" value="2" color="orange" />
    </div>
    <ComingSoonCard message="Children's reports, grade tracking, and performance monitoring coming soon!" />
  </div>
);

// Store House Dashboard Preview
const StoreHouseDashboardPreview = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={FileText} label="Rosters Received" value="8" color="indigo" />
      <StatCard icon={Users} label="Students" value="280" color="blue" />
      <StatCard icon={GraduationCap} label="Transcripts" value="12" color="green" />
      <StatCard icon={Clock} label="Pending" value="3" color="orange" />
    </div>
    <ComingSoonCard message="Roster management, transcript generation, and cumulative records coming soon!" />
  </div>
);

// Default Dashboard
const DefaultDashboard = () => (
  <ComingSoonCard message="Your dashboard is being prepared. Check back soon!" />
);

// Coming Soon Card
const ComingSoonCard = ({ message }) => (
  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Clock className="w-5 h-5 text-indigo-600" />
      </div>
      <div>
        <h3 className="font-semibold text-indigo-900">Coming Soon</h3>
        <p className="text-indigo-700 mt-1">{message}</p>
      </div>
    </div>
  </div>
);

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useAuth();
  const roleDisplay = roleDisplayNames[user?.role] || user?.role;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening in your {roleDisplay} dashboard.
        </p>
      </div>

      {/* Role-specific content */}
      <RoleDashboardContent role={user?.role} />
    </div>
  );
};

export default Dashboard;
