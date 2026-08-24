// features/admin/Usermanagement/Usermanagementpage.jsx

import React, { useCallback, useEffect, useState } from "react";
import Usermanagementfilters from "./components/Usermanagementfilter";
import Usermanagementsearchinput from "./components/Usermanagementsearchinput";
import Usermanagementtable from "./components/Usermanagementtable";
import Usermanagementpagination from "./components/Usermanagementpagination";
import Createusermodal from "./components/Createusermodal";
import Editusermodal from "./components/Editusermodal";
import Viewusermodal from "./components/Viewusermodal";
// NOTE: adjust this path if Toast.jsx actually lives somewhere else in
// your project (e.g. a shared/ folder) - it was sent alongside the
// Usermanagement components but its real location wasn't specified.
import { useToasts, ToastContainer } from "../../../components/ui/Toast";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from "./Usermanagementservice";

function Usermanagementpage() {
  // No more MOCK_USERS as a standing fallback - if the first real
  // fetch fails, we now show an empty table + error instead of fake
  // rows that look real (see loadUsers()'s catch block below).
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const { toasts, showToast, dismissToast } = useToasts();

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Debounce the search box so we're not re-fetching the entire
  // /teachers list on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Jump back to page 1 whenever the filter/search actually changes -
  // otherwise you can end up stuck on "Page 3 of 1".
  useEffect(() => {
    setCurrentPage(1);
  }, [status, debouncedSearch]);

  // GET /api/teachers - the only list endpoint that exists. It only
  // returns ACTIVE teacher accounts (no disabled accounts, no admins),
  // so getUsers() still does the status/search filtering (and
  // pagination) client-side (see Usermanagementservice.js). Role
  // filtering was dropped from the UI entirely since this endpoint
  // never returns anything but teachers.
  const loadUsers = useCallback(async () => {
    try {
      setErrorMessage("");
      const data = await getUsers({ status, search: debouncedSearch, page: currentPage });
      setUsers(data.content ?? data);
      setTotalPages(data.totalPages ?? 1);
    } catch (error) {
      console.error("getUsers failed:", error.message);
      setErrorMessage(error.message);
      setUsers([]);
      setTotalPages(1);
    }
  }, [status, debouncedSearch, currentPage]);

  // FIX: this previously ran with an empty dependency array, so it
  // only ever fired once on mount. Changing the search box, the status
  // filter, or the page number updated local state but never actually
  // re-fetched/re-sliced anything - search and status only searched
  // within whatever page 1 happened to load, and pagination did
  // nothing at all. Depending on `loadUsers` (which itself depends on
  // status/debouncedSearch/currentPage) fixes all three.
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreateSubmit(formData) {
    try {
      setErrorMessage("");
      // POST /api/createTeacher - see createUser() in Usermanagementservice.js.
      // No role is sent - createTeacher() always creates a teacher account.
      const created = await createUser(formData);
      showToast(`"${created.fullName}" was added as a teacher.`, "success");
      await loadUsers(); // re-pull from GET /api/teachers so the new row is real, not guessed
      return true;
    } catch (error) {
      console.error("createUser failed:", error.message);
      setErrorMessage(error.message);
      showToast(error.message, "error");
      return false;
    }
  }

  async function handleEditSubmit(userId, formData) {
    try {
      setErrorMessage("");
      // NOT AVAILABLE YET - updateUser() throws until the backend adds
      // an update endpoint (see Usermanagementservice.js). This will
      // surface that as a visible error/toast instead of failing silently.
      await updateUser(userId, formData);
      showToast("User updated successfully.", "success");
      await loadUsers();
      return true;
    } catch (error) {
      console.error("updateUser failed:", error.message);
      setErrorMessage(error.message);
      showToast(error.message, "error");
      return false;
    }
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "Active" ? "Disabled" : "Active";
    try {
      setErrorMessage("");
      // NOT AVAILABLE YET - toggleUserStatus() throws until the backend
      // adds a status endpoint (see Usermanagementservice.js).
      await toggleUserStatus(user.id, nextStatus.toLowerCase());
      showToast(`${user.username} is now ${nextStatus}.`, "success");
      await loadUsers();
    } catch (error) {
      console.error("toggleUserStatus failed:", error.message);
      setErrorMessage(error.message);
      showToast(error.message, "error");
    }
  }

  // FIX: viewingUser was a plain snapshot of whatever the "users" array
  // held at the moment "View" was clicked - if a section assignment (or
  // any other user field) changed elsewhere after this page's last fetch,
  // the modal kept showing that stale copy until a full page reload
  // forced a fresh loadUsers(). Re-syncing viewingUser here means any
  // loadUsers() refresh (see handleView below) also updates whatever's
  // currently open in the modal, not just the background table.
  useEffect(() => {
    if (!viewingUser) return;
    const refreshed = users.find((u) => u.id === viewingUser.id);
    if (refreshed) setViewingUser(refreshed);
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleView(user) {
    // Show what we already have immediately (no loading flicker on the
    // modal itself), then refresh in the background - see the useEffect
    // above for how the modal picks up the fresher copy once it lands.
    setViewingUser(user);
    loadUsers();
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Usermanagementfilters
          status={status}
          onStatusChange={(event) => setStatus(event.target.value)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Usermanagementsearchinput value={search} onChange={(event) => setSearch(event.target.value)} />

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-32"
          >
            Add User
          </button>
        </div>
      </div>

      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <Usermanagementtable
        users={users}
        onView={handleView}
        onEdit={setEditingUser}
        onToggleStatus={handleToggleStatus}
      />

      <Usermanagementpagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Createusermodal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <Editusermodal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSubmit={handleEditSubmit}
      />

      <Viewusermodal isOpen={viewingUser !== null} onClose={() => setViewingUser(null)} user={viewingUser} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default Usermanagementpage;