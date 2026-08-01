import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
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
  "/change-password": "Change Password",
};

function MainLayout() {

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "Dashboard";

  function toggleSidebarCollapse() {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }

  function openMobileSidebar() {
    setIsMobileSidebarOpen(true);
  }

  function closeMobileSidebar() {
    setIsMobileSidebarOpen(false);
  }


  const contentMarginClass = isSidebarCollapsed ? "md:ml-20" : "md:ml-72";

  return (
    <div className="min-h-screen bg-gray/40">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      <div className={`flex flex-col min-h-screen ${contentMarginClass} transition-all duration-300`}>
        <Header
          title={pageTitle}
          fullname="IORI YAGAMI"
          role="Teacher"
          onMenuClick={openMobileSidebar}
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