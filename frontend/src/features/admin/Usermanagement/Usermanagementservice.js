const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
   
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function splitFullName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(" "),
  };
}


function mapTeacherResponse(teacher) {
  const { firstName, middleName, lastName } = splitFullName(teacher.fullName);
  return {
    id: teacher.userId,
    username: teacher.username,
    fullName: teacher.fullName,
    firstName,
    middleName,
    lastName,

    role: teacher.userRole === "admin" ? "Admin" : "Teacher",
    status: teacher.accountStatus === "active" ? "Active" : "Disabled",

    assignedGradeLevel: undefined,
    assignedSectionName: undefined,
  };
}

export async function getUsers({ status, search, page = 1, size = 10 } = {}) {
  const data = await request("/teachers");
  let mapped = data.map(mapTeacherResponse);

  if (search) {
    const term = search.toLowerCase();
    mapped = mapped.filter(
      (u) =>
        `${u.firstName} ${u.middleName} ${u.lastName}`.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term)
    );
  }
  if (status) {
    mapped = mapped.filter((u) => u.status.toLowerCase() === status.toLowerCase());
  }

  const totalPages = Math.max(1, Math.ceil(mapped.length / size));
  const start = (page - 1) * size;
  const content = mapped.slice(start, start + size);

  return { content, totalPages };
}

export async function createUser(formData) {
  const created = await request("/createTeacher", {
    method: "POST",
    body: JSON.stringify({
      username: formData.username,
      password: formData.password,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
    }),
  });
  return mapTeacherResponse(created);
}

export async function updateUser(userId, formData) {
  throw new Error("Editing users isn't available yet - the backend has no update endpoint.");
}


export async function toggleUserStatus(userId, status) {
  throw new Error("Activating/deactivating users isn't available yet - the backend has no status endpoint.");
}