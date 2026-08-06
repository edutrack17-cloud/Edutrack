import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  IdCard,
  ClipboardCheck,
  FileSpreadsheet,
  UserPlus,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import schoolLogo from "../../assets/images/logo.jpg";

const ICON_SIZE = 18;

function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const teacher = "IORI YAGAMI";

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "RFID Attendance", path: "/rfid-attendance", icon: IdCard },
    { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
    { name: "SF2 Attendance", path: "/sf2-attendance", icon: FileSpreadsheet },
    { name: "Enrollment", path: "/enrollment", icon: UserPlus },
    { name: "Promote Student", path: "/promote-student", icon: GraduationCap },
  ];

  function getLinkClasses({ isActive }) {
    let baseClasses =
      "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors";

    if (isCollapsed) {
      baseClasses =
        "flex items-center justify-center gap-3 rounded-lg px-4 py-2.5 transition-colors";
    }

    return isActive
      ? `${baseClasses} bg-white font-semibold text-primary`
      : `${baseClasses} hover:bg-white/10`;
  }

  const widthClass = isCollapsed ? "w-20" : "w-72";
  const logoSizeClass = isCollapsed ? "h-10 w-10" : "h-16 w-16";
  const mobileTranslateClass = isMobileOpen
    ? "translate-x-0"
    : "-translate-x-full";

  const sidebarClasses = `
    sidebar-nav-scroll
    fixed top-0 left-0 z-30
    flex h-screen flex-col
    overflow-y-auto
    ${widthClass}
    bg-primary text-white
    transition-all duration-300
    ${mobileTranslateClass}
    md:translate-x-0
  `;

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
        />
      )}

      <aside className={sidebarClasses}>
   
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-2 transition-colors hover:bg-white/10 md:flex md:items-center md:justify-center">
            <Menu size={ICON_SIZE} />
          </button>

          <button
            onClick={onCloseMobile}
            className="ml-auto flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/10 md:hidden" >
            <X size={ICON_SIZE} />
          </button>
        </div>

  
        <div className="flex flex-col items-center gap-2 px-6 py-2">
          <img
            src={schoolLogo}
            alt="School Logo"
            className={`${logoSizeClass} rounded-full border-2 border-white object-cover transition-all duration-300`}
          />

          {!isCollapsed && (
            <div className="text-center">
              <h1 className="text-base font-bold leading-tight">
                CECILIO M. SALIBA
              </h1>
              <h1 className="text-base font-bold leading-tight">
                ELEMENTARY SCHOOL
              </h1>
              <p className="mt-1 text-sm text-white/80">{teacher}</p>
            </div>
          )}
        </div>

        <nav className="mt-6 flex flex-col gap-1.5 px-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={getLinkClasses}>
                <Icon size={ICON_SIZE} />
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;