import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Eye, Pencil, KeyRound, UserCheck, UserX } from "lucide-react";

// Same compact cell chrome as Sectiontable.jsx: table-fixed + colgroup, truncated cells, xs/sm text scale
const thClass =
  "truncate px-3 py-2.5 text-center text-base font-semibold text-white sm:px-4";
const tdClass =
  "truncate px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4";

const MENU_WIDTH = 208; // px, matches StudentTable.jsx's w-52 menu
const MENU_GAP = 4; // px between the kebab button and the menu
const VIEWPORT_PADDING = 8; // px, keeps the menu off the screen edges

function getStatusClass(status) {
  return status === "Active" ? "text-success" : "text-danger";
}

// Portal renders the kebab menu into document.body to avoid clipping from the table's overflow-x-auto wrapper
function Usermanagementtable({ users, onView, onEdit, onResetPassword, onToggleStatus }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [anchor, setAnchor] = useState(null); // viewport rect (top/bottom/right) of the clicked kebab button
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

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

  // Runs after the menu renders but before the browser paints, so the real menu height is known
  // and there's no flicker. position: fixed -> viewport coordinates (no scrollX/scrollY).
  // Standard dropdown behavior: open below the kebab, flip above it when there's no room left.
  useLayoutEffect(() => {
    if (openMenuId === null || !anchor || !menuRef.current) return;

    const menuHeight = menuRef.current.offsetHeight;
    const fitsBelow = anchor.bottom + MENU_GAP + menuHeight + VIEWPORT_PADDING <= window.innerHeight;
    const top = fitsBelow
      ? anchor.bottom + MENU_GAP
      : Math.max(VIEWPORT_PADDING, anchor.top - MENU_GAP - menuHeight);
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, anchor.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING
    );

    setMenuPosition({ top, left });
  }, [openMenuId, anchor]);

  function toggleMenu(userId, event) {
    if (openMenuId === userId) {
      setOpenMenuId(null);
      return;
    }
    const { top, bottom, right } = event.currentTarget.getBoundingClientRect();
    setAnchor({ top, bottom, right });
    setOpenMenuId(userId);
  }

  const openUser = users.find((u) => u.id === openMenuId) || null;

  return (
    <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
      <table className="w-full min-w-175 table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[22%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
        </colgroup>
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
              <td colSpan={5} className="px-6 py-6 text-center text-base text-gray">
                No users found.
              </td>
            </tr>
          )}

          {users.map((user) => {
            // Prefer backend's fullName over reconstructing from split parts (can scramble multi-word names)
            const fullName =
              user.fullName ??
              `${user.firstName} ${user.middleName ? `${user.middleName} ` : ""}${user.lastName}`;
            return (
              <tr key={user.id} className="odd:bg-white even:bg-primary/10">
                <td className={tdClass} title={fullName}>
                  {fullName}
                </td>
                <td className={tdClass} title={user.username}>
                  {user.username}
                </td>
                <td className={tdClass}>{user.role}</td>
                <td className={tdClass}>
                  <span className={`font-semibold ${getStatusClass(user.status)}`}>
                    {user.status}
                  </span>
                </td>

                <td className="truncate px-3 py-2 text-center sm:px-4 sm:py-2">
                  <button
                    type="button"
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(user.id, event)}
                    className="rounded-lg p-1 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {openUser &&
        createPortal(
          <div
            ref={menuRef}
            data-kebab-trigger
            style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
          >
            <button
              onClick={() => {
                setOpenMenuId(null);
                onView?.(openUser);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium text-gray-700 transition hover:bg-gray/10"
            >
              <Eye size={16} />
              View
            </button>

            {/* Edit only for Active accounts - a Disabled account has to be enabled first */}
            {openUser.status === "Active" && (
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  onEdit?.(openUser);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium text-gray-700 transition hover:bg-gray/10"
              >
                <Pencil size={16} />
                Edit
              </button>
            )}

            <button
              onClick={() => {
                setOpenMenuId(null);
                onResetPassword?.(openUser);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium text-gray-700 transition hover:bg-gray/10"
            >
              <KeyRound size={16} />
              Reset Password
            </button>

            <button
              onClick={() => {
                setOpenMenuId(null);
                onToggleStatus?.(openUser);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium transition ${
                openUser.status === "Active"
                  ? "text-danger hover:bg-danger/10"
                  : "text-success hover:bg-success/10"
              }`}
            >
              {openUser.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
              {openUser.status === "Active" ? "Disable" : "Enable"}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default Usermanagementtable;