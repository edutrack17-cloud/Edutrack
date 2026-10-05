import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Eye } from "lucide-react";

const thClass =
  "truncate px-3 py-2 text-center text-base font-semibold text-white sm:px-4 sm:py-2";
const tdClass =
  "truncate px-3 py-2 text-center text-base font-normal text-gray-700 sm:px-4 sm:py-2";

export function getSectionStatusColorClass(status) {
  return status === "archived" ? "text-secondary" : "text-success";
}

function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "";
  return gradeLevel
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const MENU_WIDTH = 208; // px, matches the menu's w-52
const MENU_GAP = 4; // px between the kebab button and the menu
const VIEWPORT_PADDING = 8; // px, keeps the menu off the screen edges

// Same menu item class as StudentTable.jsx's menuButtonClass.
const menuButtonClass =
  "flex w-full items-center gap-3 px-4 py-2.5 text-base font-medium transition";

// Same menu shell as StudentTable.jsx's ActionMenu (w-52, rounded-md, py-1,
// shadow-lg). Rendered through a portal into document.body, positioned by
// Sectiontable's useLayoutEffect below.
function ActionMenu({ menuRef, top, left, section, canModify, onView, onEdit, onToggleStatus }) {
  const isArchived = section.sectionStatus === "archived";

  return (
    <div
      ref={menuRef}
      style={{ top, left }}
      className="fixed z-50 w-52 rounded-md border border-gray-200 bg-white py-1 text-left shadow-lg"
    >
      <button onClick={onView} className={`${menuButtonClass} text-gray-700 hover:bg-gray/10`}>
        <Eye size={16} />
        View
      </button>

      {/* Past school year: View is the only action - Edit and Archive/Unarchive are hidden. */}
      {canModify && (
        <>
          {!isArchived && (
            <button onClick={onEdit} className={`${menuButtonClass} text-gray-700 hover:bg-gray/10`}>
              <Pencil size={16} />
              Edit
            </button>
          )}

          <button
            onClick={onToggleStatus}
            className={`${menuButtonClass} ${
              isArchived ? "text-success hover:bg-success/10" : "text-secondary hover:bg-secondary/10"
            }`}
          >
            {isArchived ? (
              <>
                <ArchiveRestore size={16} />
                Unarchive
              </>
            ) : (
              <>
                <Archive size={16} />
                Archive
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

function Sectiontable({ sections, onEdit, onView, onToggleStatus, isSectionReadOnly }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [anchor, setAnchor] = useState(null); // viewport rect (top/bottom/right) of the clicked kebab button
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);

  // Optional, same opt-in pattern as the filters - a caller that doesn't pass isSectionReadOnly gets the table exactly as it worked before.
  const isReadOnly = (section) => Boolean(isSectionReadOnly?.(section));

  function toggleMenu(sectionId, event) {
    if (openMenuId === sectionId) {
      setOpenMenuId(null);
      return;
    }
    const { top, bottom, right } = event.currentTarget.getBoundingClientRect();
    setAnchor({ top, bottom, right });
    setOpenMenuId(sectionId);
  }

  // Runs after the menu renders but before the browser paints, so the real
  // menu height is known and there's no flicker. position: fixed -> viewport
  // coordinates. Opens below the kebab; flips above it when there's no room
  // left at the bottom (same as StudentTable.jsx).
  useLayoutEffect(() => {
    if (openMenuId === null || !anchor || !menuRef.current) return;

    const menuHeight = menuRef.current.offsetHeight;
    const fitsBelow =
      anchor.bottom + MENU_GAP + menuHeight + VIEWPORT_PADDING <= window.innerHeight;
    const top = fitsBelow
      ? anchor.bottom + MENU_GAP
      : Math.max(VIEWPORT_PADDING, anchor.top - MENU_GAP - menuHeight);
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, anchor.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING
    );

    setMenuPosition({ top, left });
  }, [openMenuId, anchor]);

  // The menu is position: fixed, so it would stay behind while the page
  // moves. Close it on scroll/resize (same as StudentTable.jsx).
  useEffect(() => {
    if (openMenuId === null) return;

    function closeMenu() {
      setOpenMenuId(null);
    }

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (openMenuId === null) return;

    function handleClickOutside(event) {
      if (event.target.closest("[data-kebab-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpenMenuId(null);
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [openMenuId]);

  return (
    <>
      <div className="w-full overflow-x-auto rounded-xl bg-white shadow-md">
        <table className="w-full min-w-160 table-fixed border-collapse">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="bg-primary">
            <tr>
              <th className={thClass}>Section</th>
              <th className={thClass}>Grade Level</th>
              <th className={thClass}>School Year</th>
              <th className={thClass}>Adviser</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>

          <tbody>
            {sections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray">
                  No sections found.
                </td>
              </tr>
            )}

            {sections.map((section) => (
              <tr key={section.sectionId} className="odd:bg-white even:bg-primary/10">
                <td className={tdClass} title={section.sectionName}>
                  {section.sectionName}
                </td>
                <td className={tdClass}>{formatGradeLevel(section.gradeLevel)}</td>
                <td className={tdClass} title={section.schoolYear || undefined}>
                  {section.schoolYear || ""}
                </td>
                <td className={tdClass} title={section.adviser || undefined}>
                  {section.adviser || ""}
                </td>
                <td className={tdClass}>
                  <span className={`text-base font-semibold ${getSectionStatusColorClass(section.sectionStatus)}`}>
                    {section.sectionStatus === "archived" ? "Archived" : "Active"}
                  </span>
                </td>

                <td className="relative px-3 py-2 text-center sm:px-4 sm:py-2">
                  <button
                    type="button"
                    data-kebab-trigger
                    onClick={(event) => toggleMenu(section.sectionId, event)}
                    className="rounded-lg p-1 transition hover:bg-gray-100"
                  >
                    <MoreHorizontal size={20} />
                  </button>

                  {openMenuId === section.sectionId &&
                    createPortal(
                      <ActionMenu
                        menuRef={menuRef}
                        top={menuPosition.top}
                        left={menuPosition.left}
                        section={section}
                        canModify={!isReadOnly(section)}
                        onView={() => {
                          setOpenMenuId(null);
                          onView?.(section);
                        }}
                        onEdit={() => {
                          setOpenMenuId(null);
                          onEdit?.(section);
                        }}
                        onToggleStatus={() => {
                          setOpenMenuId(null);
                          onToggleStatus?.(section);
                        }}
                      />,
                      document.body
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sections.length > 0 && (
        <p className="text-center text-sm text-gray sm:hidden">
          Swipe the table sideways to see more columns
        </p>
      )}
    </>
  );
}

export default Sectiontable;