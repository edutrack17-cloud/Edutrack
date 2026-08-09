import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Eye, Pencil, UserCog, UserCheck, UserX } from "lucide-react";

const thClass =
  "whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-white sm:px-6 sm:py-4 sm:text-sm";
const tdClass =
  "whitespace-nowrap px-3 py-3 text-center text-xs text-gray-700 sm:px-6 sm:py-4 sm:text-sm";

const MENU_WIDTH = 192; // px, matches w-48

function getStatusClass(status) {
  return status === "Active" ? "text-success" : "text-danger";
}

// The table wrapper below has overflow-x-auto (for horizontal
// scrolling on mobile). Positioning the kebab dropdown with plain
// "absolute" inside that wrapper gets it CLIPPED the same way
// StudentTable.jsx's action menu was before - setting overflow-x on an
// element makes the browser clip overflow-y too, even though nothing
// asked for that. Rendering the menu through a Portal (straight into
// document.body) sidesteps this entirely, same fix as StudentTable.jsx.
function Usermanagementtable({ users, onView, onEdit, onAssignSection, onToggleStatus }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest("[data-kebab-trigger]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function closeMenu() {
      setOpenMenuId(null);
    }
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, []);

  function toggleMenu(userId, event) {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - MENU_WIDTH,
    });
    setOpenMenuId(userId);
  }

  const openUser = users.find((u) => u.id === openMenuId) || null;

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="min-w-full border-collapse">
        <thead className="bg-primary">
          <tr>
            <th className={thClass}>Full Name</th>
            <th className={thClass}>Username</th>
            <th className={thClass}>Role</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray">
                No users found.
              </td>
            </tr>
          )}

          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-200 transition hover:bg-gray-50">
              <td className={tdClass}>
                {user.firstName} {user.middleName ? `${user.middleName} ` : ""}
                {user.lastName}
              </td>
              <td className={tdClass}>{user.username}</td>
              <td className={tdClass}>{user.role}</td>
              <td className={tdClass}>
                <span className={`text-sm font-semibold ${getStatusClass(user.status)}`}>
                  {user.status}
                </span>
              </td>

              <td className={tdClass}>
                <button
                  type="button"
                  data-kebab-trigger
                  onClick={(event) => toggleMenu(user.id, event)}
                  className="rounded-lg p-2 transition hover:bg-gray-100"
                >
                  <MoreHorizontal size={20} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {openUser &&
        createPortal(
          <div
            data-kebab-trigger
            style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-xl border border-gray-200 bg-white py-2 text-left shadow-xl"
          >
            <button
              onClick={() => {
                setOpenMenuId(null);
                onView?.(openUser);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray/10"
            >
              <Eye size={16} />
              View
            </button>

            <button
              onClick={() => {
                setOpenMenuId(null);
                onEdit?.(openUser);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray/10"
            >
              <Pencil size={16} />
              Edit
            </button>

            {openUser.role === "Teacher" && (
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  onAssignSection?.(openUser);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
              >
                <UserCog size={16} />
                Assign Section
              </button>
            )}

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => {
                setOpenMenuId(null);
                onToggleStatus?.(openUser);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2 text-sm font-medium transition ${
                openUser.status === "Active"
                  ? "text-danger hover:bg-danger/10"
                  : "text-success hover:bg-success/10"
              }`}
            >
              {openUser.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
              {openUser.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default Usermanagementtable;