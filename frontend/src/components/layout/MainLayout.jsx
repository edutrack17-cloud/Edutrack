import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

function MainLayout() {
 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
 
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
          title="Dashboard"
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