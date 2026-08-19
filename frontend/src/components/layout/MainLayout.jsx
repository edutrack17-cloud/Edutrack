import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";


const pageTitles = {
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/sf2-attendance": "SF2 Attendance",
  "/enrollment": "Enrollment",
  "/promote-student": "Promote Student",
  "/rfid-attendance": "RFID Attendance",
  "/school-year": "School Year",
  "/section-level": "Section & Level",
  "/logs-reports": "Logs & Reports",
  "/user-management": "User Management",
  "/change-password": "Change Password",
};

// Only used as a FALLBACK for as long as there's no auth backend to
// log in against (see the TODO in AppRoutes.jsx). Once real login
// works, useAuth().role takes over and this is never consulted.
const ADMIN_ONLY_PATHS = ["/user-management", "/section-level", "/logs-reports", "/school-year"];

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = pageTitles[location.pathname] || "Dashboard";

  // TEMP: AuthContext exists (src/Context/AuthContext.jsx) but no
  // <AuthProvider> wraps the app yet, so useAuth() throws. Reverted to
  // URL-only guessing for now since only User Management is in scope -
  // swap back to useAuth() once AuthProvider is wired up in
  // App.jsx/main.jsx.
  const role = ADMIN_ONLY_PATHS.includes(location.pathname) ? "admin" : "teacher";
  const isAdmin = role === "admin";

  function toggleSidebarCollapse() {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }

  function openMobileSidebar() {
    setIsMobileSidebarOpen(true);
  }

  function closeMobileSidebar() {
    setIsMobileSidebarOpen(false);
  }

  function handleLogout() {
    // TEMP: real session clearing (logout() from useAuth) comes back
    // once AuthProvider wraps the app - for now this just navigates away.
    navigate("/login", { replace: true });
  }

  const contentMarginClass = isSidebarCollapsed ? "md:ml-20" : "md:ml-72";

  // TEMP: placeholder only - will read the real logged-in user's name
  // once useAuth() is back.
  const fullname = isAdmin ? "ADMINISTRATOR" : "IORI YAGAMI";

  return (
    <div className="min-h-screen bg-gray/40">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
        role={role}
        personName={fullname}
      />

      <div className={`flex flex-col min-h-screen ${contentMarginClass} transition-all duration-300`}>
        <Header
          title={pageTitle}
          fullname={fullname}
          role={isAdmin ? "Administrator" : "Teacher"}
          onMenuClick={openMobileSidebar}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-6 bg-gray/40">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default MainLayout;