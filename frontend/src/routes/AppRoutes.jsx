import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../features/auth/LoginPage";
import ChangePassword from "../features/auth/pages/Changepassword";
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


function AppRoutes() {
  return (
    <Routes>

      <Route path="/" element={<Navigate to="/attendance" replace />} />

      <Route path="/login" element={<LoginPage />} />

      {/* Guard-only: was previously unguarded (sitting next to /login),
          so anyone could open it without logging in. Now requires a
          logged-in user with role === "guard", same pattern as the
          admin-only block below. Unauthenticated -> /login;
          logged in but wrong role (e.g. admin/teacher) -> /dashboard. */}
      <Route element={<ProtectedRoute allowedRoles={["guard"]} />}>
        <Route path="/guard-attendance" element={<GuardAttendancePage />} />
      </Route>

      {/* Everything below requires a logged-in user. ProtectedRoute
          reads useAuth() and bounces to /login if there's no session -
          this was already built but never actually used in this file,
          so routes weren't being guarded at all. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/sf2-attendance" element={<SF2AttendancePage />} />
          <Route path="/enrollment" element={<EnrollmentPage />} />
          <Route path="/promote-student" element={<PromoteStudentPage />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Admin-only - ProtectedRoute redirects a logged-in
              non-admin (e.g. a teacher) to /dashboard instead of
              rendering these. */}
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