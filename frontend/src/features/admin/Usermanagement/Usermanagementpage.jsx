// features/admin/Usermanagement/Usermanagementpage.jsx

import React, { useCallback, useEffect, useState } from "react";
import Usermanagementfilters from "./components/Usermanagementfilter";
import Usermanagementsearchinput from "./components/Usermanagementsearchinput";
import Usermanagementtable from "./components/Usermanagementtable";
import Usermanagementpagination from "./components/Usermanagementpagination";
import Createusermodal from "./components/Createusermodal";
import Editusermodal from "./components/Editusermodal";
import Viewusermodal from "./components/Viewusermodal";
// NOTE: adjust path if Toast.jsx lives elsewhere in your project
import { useToasts, ToastContainer } from "../../../components/ui/Toast";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
} from "./Usermanagementservice";

function Usermanagementpage() {
  // No mock fallback - a failed fetch shows an empty table + error (see loadUsers())
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

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [status, debouncedSearch]);

  // CONNECTED: GET /api/user/teachers - see getUsers() in Usermanagementservice.js
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

  // Re-fetches whenever status, search, or page changes
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreateSubmit(formData) {
    try {
      setErrorMessage("");
      // CONNECTED: POST /api/user/createTeacher - see createUser() in Usermanagementservice.js
      const created = await createUser(formData);
      showToast(`"${created.fullName}" was added as a teacher.`, "success");
      await loadUsers(); // re-pull from GET /api/user/teachers so the new row is real, not guessed
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
      // CONNECTED: PATCH /api/user/update/{userId} - see updateUser() in Usermanagementservice.js
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
      // CONNECTED: PATCH /api/user/disable or /api/user/restore - see toggleUserStatus() in Usermanagementservice.js
      await toggleUserStatus(user.id, nextStatus.toLowerCase());
      showToast(`${user.username} is now ${nextStatus}.`, "success");
      await loadUsers();
    } catch (error) {
      console.error("toggleUserStatus failed:", error.message);
      setErrorMessage(error.message);
      showToast(error.message, "error");
    }
  }

  // Keeps the open view modal in sync with fresher data from loadUsers()
  useEffect(() => {
    if (!viewingUser) return;
    const refreshed = users.find((u) => u.id === viewingUser.id);
    if (refreshed) setViewingUser(refreshed);
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleView(user) {
    // Show cached data immediately, then refresh in background
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