import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import ProtectedRoute from "./Protectedroute";
import { useAuth } from "../Context/Authcontext";
import LoginPage from "../features/auth/LoginPage";
import ForgotPasswordPage from "../features/auth/ForgotPass/ForgotPasswordPage";
import ChangePassword from "../features/auth/pages/Changepassword";
import ProfileInformation from "../features/teacher/profilemanagement/Profileinformationpage";
import EnrollmentPage from "../features/teacher/enrollment/pages/EnrollmentPage" ;
import AttendancePage from "../features/teacher/attendance/Attendancepage";
import DashboardPage from "../features/teacher/dashboard/Dashboardpage";
import SF2AttendancePage from "../features/teacher/Sf2Attendance/Sf2attendancepage";
import PromoteStudentPage from "../features/teacher/Promote-Student/Promotestudentpage";
import UserManagementPage from "../features/admin/Usermanagement/Usermanagementpage";
import SectionlevelPage from "../features/admin/SectionandLevel/Sectionlevelpage";
import SchoolyearmanagementPage from "../features/admin/SchoolYear/SchoolyearmanagementPage"
import ActivityLogsPage from "../features/admin/ActivityLogs/Activitylogspage";
import GuardAttendancePage from "../features/guard/attendance/Guardattendancepage";



function RootRedirect() {
  const { isAuthenticated, isInitializing, role } = useAuth();
 
  if (isInitializing) return null;
 
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
 
  if (role === "guard") {
    return <Navigate to="/guard-attendance" replace />;
  }
 
  return <Navigate to="/dashboard" replace />;
}
 
function AppRoutes() {
  return (
    <Routes>
 
      <Route path="/" element={<RootRedirect />} />
 
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
 
      {/* /guard-attendance connects to guard role only. */}
      <Route element={<ProtectedRoute allowedRoles={["guard"]} />}>
        <Route path="/guard-attendance" element={<GuardAttendancePage />} />
      </Route>
 
      {/* Everything below connects to a logged-in user only. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/sf2-attendance" element={<SF2AttendancePage />} />
          <Route path="/enrollment" element={<EnrollmentPage />} />
          <Route path="/promote-student" element={<PromoteStudentPage />} />
          <Route path="/change-password" element={<ChangePassword />} />
 
          {/* Everything below connects to teacher or admin - both can manage their own profile. */}
          <Route element={<ProtectedRoute allowedRoles={["teacher", "admin"]} />}>
            <Route path="/profile" element={<ProfileInformation />} />
          </Route>

          {/* Everything below connects to admin role only. */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/section-level" element={<SectionlevelPage />} />
            <Route path="/school-year" element={<SchoolyearmanagementPage />} />
            <Route path="/logs-reports" element={<ActivityLogsPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
 
export default AppRoutes;