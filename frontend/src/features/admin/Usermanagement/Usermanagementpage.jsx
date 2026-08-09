// features/admin/Usermanagement/Usermanagementpage.jsx

import React, { useCallback, useEffect, useState } from "react";
import Usermanagementfilters from "./components/Usermanagementfilter";
import Usermanagementsearchinput from "./components/Usermanagementsearchinput";
import Usermanagementtable from "./components/Usermanagementtable";
import Usermanagementpagination from "./components/Usermanagementpagination";
import Createusermodal from "./components/Createusermodal";
import Editusermodal from "./components/Editusermodal";
import Viewusermodal from "./components/Viewusermodal";
import Assignsectionmodal from "./components/Assignsectionmodal";
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  assignTeacherToSection,
} from "./Usermanagementservice";

// Fallback only - shown until getUsers() below is actually reachable
// (see Usermanagementservice.js, ready for tomorrow's integration).
const MOCK_USERS = [
  { id: 1, username: "iori.yagami", firstName: "Iori", middleName: "", lastName: "Yagami", role: "Teacher", status: "Active", assignedGradeLevel: "Grade 6", assignedSectionName: "Jade" },
  { id: 2, username: "kyo.kusanagi", firstName: "Kyo", middleName: "", lastName: "Kusanagi", role: "Teacher", status: "Active", assignedGradeLevel: null, assignedSectionName: null },
  { id: 3, username: "yuri.sakazaki", firstName: "Yuri", middleName: "", lastName: "Sakazaki", role: "Teacher", status: "Disabled", assignedGradeLevel: "Grade 4", assignedSectionName: "Apple" },
  { id: 4, username: "cecilio.saliba", firstName: "Cecilio", middleName: "M.", lastName: "Saliba", role: "Admin", status: "Active", assignedGradeLevel: null, assignedSectionName: null },
];

function Usermanagementpage() {
  const [users, setUsers] = useState(MOCK_USERS);

  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [assigningUser, setAssigningUser] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // GET /api/users?role=&status=&search=&page=
  // Falls back to the mock list above so the UI still works today -
  // once the backend's actually up, this quietly starts returning
  // real data instead.
  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers({ role, status, search, page: currentPage });
      setUsers(data);
    } catch (error) {
      console.warn("getUsers() not reachable yet, using mock data:", error.message);
    }
  }, [role, status, search, currentPage]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side filtering of whatever's currently in `users` - keeps
  // the page responsive even before/without a live backend. Once
  // getUsers() is doing real server-side filtering, this can be
  // trimmed down to just the search box (or dropped entirely).
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchesSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !role || u.role === role;
    const matchesStatus = !status || u.status === status;
    return matchesSearch && matchesRole && matchesStatus;
  });

  async function handleCreateSubmit(formData) {
    try {
      // TODO: BACKEND CONNECTION - see createUser() in Usermanagementservice.js
      // users.role is ENUM(admin, teacher) in the DB - lowercase only in
      // the request payload, same pattern as handleToggleStatus below.
      // Local state stays capitalized ("Admin"/"Teacher") to match how
      // it's displayed and filtered everywhere else in this page.
      const created = await createUser({ ...formData, role: formData.role.toLowerCase() });
      setUsers((prev) => [...prev, { ...created, role: formData.role }]);
    } catch (error) {
      console.error("createUser failed:", error.message);
    }
  }

  async function handleEditSubmit(userId, formData) {
    try {
      // TODO: BACKEND CONNECTION - see updateUser() in Usermanagementservice.js
      await updateUser(userId, { ...formData, role: formData.role.toLowerCase() });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...formData } : u)));
    } catch (error) {
      console.error("updateUser failed:", error.message);
    }
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === "Active" ? "Disabled" : "Active";
    try {
      // TODO: BACKEND CONNECTION - see toggleUserStatus() in Usermanagementservice.js
      await toggleUserStatus(user.id, nextStatus.toLowerCase());
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    } catch (error) {
      console.error("toggleUserStatus failed:", error.message);
    }
  }

  async function handleAssignConfirm(userId, sectionId) {
    try {
      // TODO: BACKEND CONNECTION - see assignTeacherToSection() in Usermanagementservice.js
      await assignTeacherToSection(userId, sectionId);
      setAssigningUser(null);
      loadUsers(); // re-pull so the row picks up its new grade level/section
    } catch (error) {
      console.error("assignTeacherToSection failed:", error.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Usermanagementfilters
          role={role}
          status={status}
          onRoleChange={(event) => setRole(event.target.value)}
          onStatusChange={(event) => setStatus(event.target.value)}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Usermanagementsearchinput value={search} onChange={(event) => setSearch(event.target.value)} />

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
          >
            Add User
          </button>
        </div>
      </div>

      <Usermanagementtable
        users={filteredUsers}
        onView={setViewingUser}
        onEdit={setEditingUser}
        onAssignSection={setAssigningUser}
        onToggleStatus={handleToggleStatus}
      />

      <Usermanagementpagination currentPage={currentPage} totalPages={1} onPageChange={setCurrentPage} />

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

      <Assignsectionmodal
        isOpen={assigningUser !== null}
        onClose={() => setAssigningUser(null)}
        user={assigningUser}
        onConfirm={handleAssignConfirm}
      />
    </div>
  );
}

export default Usermanagementpage;