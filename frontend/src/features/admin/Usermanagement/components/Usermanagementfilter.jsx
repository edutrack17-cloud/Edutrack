import React from "react";
import { ChevronDown } from "lucide-react";

const ROLES = ["Admin", "Teacher"];
const STATUS_OPTIONS = ["Active", "Disabled"];

function Usermanagementfilters({ role, status, onRoleChange, onStatusChange }) {
  const selectClass =
    "w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-700 outline-none cursor-pointer sm:pr-10 sm:text-sm";
  const iconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  const wrapperClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-32";

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className={wrapperClass}>
        <select value={role} onChange={onRoleChange} className={selectClass}>
          <option value="">Role</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>

      <div className={wrapperClass}>
        <select value={status} onChange={onStatusChange} className={selectClass}>
          <option value="">Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={iconClass} />
      </div>
    </div>
  );
}

export default Usermanagementfilters;