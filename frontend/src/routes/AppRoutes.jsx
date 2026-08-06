import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LoginPage from "../features/auth/LoginPage";
import EnrollmentPage from "../features/teacher/enrollment/pages/EnrollmentPage" ;
import AttendancePage from "../features/teacher/attendance/Attendancepage";
import RFIDAttendancePage from "../features/teacher/rfid-attendance/Rfidattendancepage";
import DashboardPage from "../features/teacher/dashboard/Dashboardpage";
import SF2AttendancePage from "../features/teacher/Sf2Attendance/Sf2attendancepage";

function AppRoutes() {
  return (
    <Routes>
 
      <Route path="/" element={<Navigate to="/attendance" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/sf2-attendance" element={<SF2AttendancePage />} />
        <Route path="/enrollment" element={<EnrollmentPage />} />
        <Route path="/promote-student" element={<div>Promote Student page</div>} />
        <Route path="/rfid-attendance" element={<RFIDAttendancePage />} />
        <Route path="/change-password" element={<div>Change Password page</div>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;