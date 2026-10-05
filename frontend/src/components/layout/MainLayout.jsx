import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { useAuth } from "../../Context/AuthContext";


const pageTitles = {
  "/dashboard": "Dashboard",
  "/attendance": "Attendance",
  "/sf2-attendance": "SF2 Attendance",
  "/enrollment": "Student Management",
  "/promote-student": "Promote Student",
  "/school-year": "School Year",
  "/section-level": "Section & Level",
  "/logs-reports": "Logs & Reports",
  "/user-management": "User Management",
  "/change-password": "Change Password",
  "/profile": "Profile Information",
};

function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // MainLayout only ever renders behind <ProtectedRoute>, which already
  // guarantees an AuthProvider is above it and that the user is logged
  // in, so it's safe to read real session data here now instead of
  // guessing the role from the current path.
  const { user, role, logout } = useAuth();

  const pageTitle = pageTitles[location.pathname] || "Dashboard";
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

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const contentMarginClass = isSidebarCollapsed ? "md:ml-20" : "md:ml-72";

  // Backend's LoginResponse only sends back a username (no first/last
  // name), so that's what gets shown here.
  const fullname = user?.username ?? (isAdmin ? "ADMINISTRATOR" : "TEACHER");

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