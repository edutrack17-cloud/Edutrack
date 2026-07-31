import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileSpreadsheet,
  UserPlus,
  GraduationCap,
  CreditCard,
  KeyRound,
  LogOut,
} from "lucide-react";
import schoolLogo from "../../assets/images/logo.jpg";

const ICON_SIZE = 18;

function Sidebar() {
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
    return isActive
      ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-white text-primary font-semibold"
      : "flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors";
  }

  function handleLogout() {
    // TODO:
    // Ilagay dito ang logout logic kapag may backend/authentication na.
    console.log("Logout");
  }

  return (
    <aside className="flex flex-col w-72 h-screen bg-primary text-white">

      <div className="flex flex-col items-center px-6 py-6 gap-4">

        <img
          src={schoolLogo}
          alt="School Logo"
          className="w-20 h-20 rounded-full object-cover border-2 border-white"
        />

        <div className="text-center">
          <h1 className="font-bold text-lg leading-tight">
            CECILIO M. SALIBA
          </h1>

          <h1 className="font-bold text-lg leading-tight">
            ELEMENTARY SCHOOL
          </h1>

          <p className="mt-2 text-sm text-white/80">
            {teacher}
          </p>
        </div>
      </div>

   
      <div className="px-4">
        <div className="bg-sky-700 rounded-xl shadow-md p-4 text-center">
          <h2 className="text-3xl font-bold">
            {time}
          </h2>
          <p className="mt-2 text-sm">
            {date}
          </p>
        </div>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={getLinkClasses}>
              <Icon size={ICON_SIZE} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="px-4 py-4 border-t border-white/20 space-y-2">
      <h1 className=" text-center font-bold ">SETTINGS</h1>
        <NavLink
          to="/change-password"
          className={getLinkClasses}>
          <KeyRound size={ICON_SIZE} />
          <span>Change Password</span>
        </NavLink>
        
        <button
         onClick={handleLogout}
         className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-white/10 transition-colors">
         <LogOut size={ICON_SIZE} />
         <span>Logout</span>
         </button>
    </div>

    </aside>
  );
}

export default Sidebar;