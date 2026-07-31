import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LoginPage from "../features/auth/LoginPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
        <Route path="/attendance" element={<div>Attendance page</div>} />
        <Route path="/sf2-attendance" element={<div>SF2 Attendance page</div>} />
        <Route path="/enrollment" element={<div>Enrollment page</div>} />
        <Route path="/promote-student" element={<div>Promote Student page</div>} />
        <Route path="/rfid" element={<div>RFID page</div>} />
        <Route path="/change-password" element={<div>Change Password page</div>} />

      </Route>
    </Routes>
  );
}

export default AppRoutes;