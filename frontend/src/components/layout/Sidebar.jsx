import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileSpreadsheet,
  UserPlus,
  GraduationCap,
  KeyRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import schoolLogo from "../../assets/images/logo.jpg";

const ICON_SIZE = 18;


function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  const teacher = "IORI YAGAMI";

  const now = new Date();

  const date = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
    { name: "SF2 Attendance", path: "/sf2-attendance", icon: FileSpreadsheet },
    { name: "Enrollment", path: "/enrollment", icon: UserPlus },
    { name: "Promote Student", path: "/promote-student", icon: GraduationCap },
  ];

  function getLinkClasses({ isActive }) {
    let baseClasses = "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors";
    if (isCollapsed) {
      baseClasses = "flex items-center justify-center gap-3 rounded-lg px-4 py-2 transition-colors";
    }

    if (isActive) {
      return `${baseClasses} bg-white text-primary font-semibold`;
    }
    return `${baseClasses} hover:bg-white/10`;
  }

  function handleLogout() {
    // TODO:
    // Ilagay dito ang logout logic kapag may backend/authentication na.
    console.log("Logout");
  }


  const widthClass = isCollapsed ? "w-20" : "w-72";
  const mobileTranslateClass = isMobileOpen ? "translate-x-0" : "-translate-x-full";
  const logoSizeClass = isCollapsed ? "w-10 h-10" : "w-16 h-16";


  const sidebarClasses = `flex flex-col fixed gap-5 top-0 left-0 z-30 h-screen ${widthClass} bg-primary text-white transition-all duration-300 ${mobileTranslateClass} md:translate-x-0`;

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
        ></div>
      )}

      <aside className={sidebarClasses}>

        <div className="flex items-center justify-between px-4 py-4">

          <button
            onClick={onToggleCollapse}
            className="hidden items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 md:flex"
          >
            <Menu size={ICON_SIZE} />
          </button>

          <button
            onClick={onCloseMobile}
            className="ml-auto flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
          >
            <X size={ICON_SIZE} />
          </button>
        </div>

  
        <div className="flex flex-col items-center gap-2 px-6 py-1">
          <img
            src={schoolLogo}
            alt="School Logo"
            className={`${logoSizeClass} rounded-full border-2 border-white object-cover transition-all duration-300`}
          />

     
          {!isCollapsed && (
            <div className="text-center">
              <h1 className="text-base font-bold leading-tight">CECILIO M. SALIBA</h1>
              <h1 className="text-base font-bold leading-tight">ELEMENTARY SCHOOL</h1>
              <p className="mt-1 text-sm text-white/80">{teacher}</p>
            </div>
          )}
        </div>


        {!isCollapsed && (
          <div className="px-4">
            <div className="rounded-xl bg-sky-700 p-2 text-center shadow-md">
              <h2 className="text-xl font-bold">{time}</h2>
              <p className="mt-0.5 text-xs">{date}</p>
            </div>
          </div>
        )}

        <nav className="mt-3 flex-1 flex flex-col  gap-3  px-4 ">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.name} to={item.path} className={getLinkClasses}>
                <Icon size={ICON_SIZE} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-white/20 px-4 py-3">
          {!isCollapsed && <h1 className="text-center font-bold">SETTINGS</h1>}

          <NavLink to="/change-password" className={getLinkClasses}>
            <KeyRound size={ICON_SIZE} />
            {!isCollapsed && <span>Change Password</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2 hover:bg-white/10 transition-colors"
          >
            <LogOut size={ICON_SIZE} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;