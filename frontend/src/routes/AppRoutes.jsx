import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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



// /change-password renders the Change Password modal on top of an empty
// page, so the header title ("Change Password") stays visible behind it.
// Closing it goes back to where the user came from, or /dashboard if the
// URL was opened directly (no history to go back to).
function ChangePasswordRoute() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleClose() {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/dashboard", { replace: true });
    }
  }

  return (
    <>
      {/* White panel behind the modal, same look as the enrollment page's
          table container. */}
      <div className="min-h-[calc(100vh-13rem)] rounded-lg bg-white shadow-md" />
      <ChangePassword isOpen onClose={handleClose} />
    </>
  );
}

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
          <Route path="/change-password" element={<ChangePasswordRoute />} />
 
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

      {/* Unknown URLs go back to "/", where RootRedirect sends the user
          to the right landing page. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
 
export default AppRoutes;