// features/admin/LevelandSection/Sectionlevelservice.js
//
// All Section-Level API calls in one place. Real endpoints match
// SectionController.java (com.edutrack.section.controller) exactly:
//
//   POST   /api/section                                 -> SectionResponse
//   GET    /api/section?fullName=&gradeLevel=&sectionStatus=&page=&size=
//                                                          -> Page<SectionResponse>
//   PATCH  /api/section/{sectionId}                      -> SectionResponse
//   PATCH  /api/section/{sectionId}/section-status/archive -> SectionResponse
//   PATCH  /api/section/{sectionId}/section-status/active  -> SectionResponse
//   GET    /api/school-year?schoolYearName=&schoolYearStatus=&page=&size=
//
// Confirmed against the real backend:
//   - GradeLevel enum values: Grade_4 / Grade_5 / Grade_6
//   - SectionStatus enum values: active / archived (lowercase)
//   - `fullName` filters by ADVISER name only (SectionSpecification.hasName
//     matches user.firstName/middleName/lastName) - NOT section name.
//   - Teachers list endpoint doesn't exist yet on UserController - still
//     blocked, see getTeachers() at the bottom.

// ============================================================================
// 🔧 MOCK MODE - flip this to false once the backend is running and reachable
// ============================================================================
// While true, every function below returns fake in-memory data instead of
// hitting the network, so the UI is fully clickable (create, edit, archive,
// restore, search, filter, paginate) without the Spring Boot app running.
const USE_MOCK_API = true;

// Adjust this to wherever your project keeps its base API URL / auth headers.
// If you already have an axios instance or fetch wrapper elsewhere in the
// app (for auth token, interceptors, etc.), tell me its path and I'll swap
// this out for that instead of a bare fetch.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

// Single source of truth for the GradeLevel enum mapping (UI label <-> backend value).
export const GRADE_LEVEL_OPTIONS = [
  { value: "Grade_4", label: "Grade 4" },
  { value: "Grade_5", label: "Grade 5" },
  { value: "Grade_6", label: "Grade 6" },
];

// Single source of truth for the SectionStatus enum mapping.
// Backend enum values are lowercase (SectionStatus.java: active, archived) -
// only the display label is capitalized.
export const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

// ============================================================================
// MOCK DATA STORE (in-memory, resets on page refresh)
// ============================================================================
let mockSections = [
  { sectionId: 1, sectionName: "Apple", schoolYear: "2024-2025", gradeLevel: "Grade_4", sectionStatus: "active", adviser: "Dela Cruz, Maria" },
  { sectionId: 2, sectionName: "Rose", schoolYear: "2024-2025", gradeLevel: "Grade_4", sectionStatus: "active", adviser: "Santos, Rowena" },
  { sectionId: 3, sectionName: "Jade", schoolYear: "2024-2025", gradeLevel: "Grade_5", sectionStatus: "active", adviser: "Rey, Jhomell" },
  { sectionId: 4, sectionName: "Banana", schoolYear: "2024-2025", gradeLevel: "Grade_6", sectionStatus: "archived", adviser: "Reyes, Antonio" },
];
let mockNextId = 5;

const mockSchoolYears = [
  { schoolYearId: 1, schoolYearName: "2024-2025" },
  { schoolYearId: 2, schoolYearName: "2025-2026" },
];

// Placeholder only - real teacher list isn't available from the backend yet
// (see getTeachers() below). Shape matches what a future real endpoint
// would likely return so swapping to real data later is a one-line change.
const mockTeachers = [
  { id: 101, name: "Dela Cruz, Maria" },
  { id: 102, name: "Santos, Rowena" },
  { id: 103, name: "Rey, Jhomell" },
  { id: 104, name: "Reyes, Antonio" },
];

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// REAL fetch helper (used when USE_MOCK_API is false)
// ============================================================================
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include", // remove if auth is via Bearer token instead of cookies
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null;
  return response.json();
}

// Backend errors (SectionAlreadyExists, UserNotFoundException, etc.) are
// assumed to come back as { message: "..." } - standard Spring
// @ExceptionHandler shape. Adjust here if it turns out to be different.
export async function parseErrorMessage(response) {
  try {
    const body = await response.json();
    return body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

// ============================================================================
// GET /api/section
// ============================================================================
export async function getSections({ fullName, gradeLevel, sectionStatus, page = 0, size = 9 } = {}) {
  if (USE_MOCK_API) {
    await delay();
    // Mirrors the real backend: fullName matches the ADVISER name, not the
    // section name (SectionSpecification.hasName only checks user fields).
    let filtered = mockSections.filter((s) => {
      const matchesName = !fullName || s.adviser.toLowerCase().includes(fullName.toLowerCase());
      const matchesGrade = !gradeLevel || s.gradeLevel === gradeLevel;
      const matchesStatus = !sectionStatus || s.sectionStatus === sectionStatus;
      return matchesName && matchesGrade && matchesStatus;
    });

    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const content = filtered.slice(page * size, page * size + size);

    return { content, totalPages, totalElements, number: page, size };
  }

  const params = new URLSearchParams();
  if (fullName) params.set("fullName", fullName);
  if (gradeLevel) params.set("gradeLevel", gradeLevel);
  if (sectionStatus) params.set("sectionStatus", sectionStatus);
  params.set("page", page);
  params.set("size", size);

  // Returns a Spring Page object: { content, totalPages, totalElements, number, size, ... }
  return request(`/section?${params.toString()}`);
}

// ============================================================================
// POST /api/section
// payload: { sectionName, schoolYear (Long id), gradeLevel, userId (Long, adviser) }
// ============================================================================
export async function createSection(payload) {
  if (USE_MOCK_API) {
    await delay();
    const schoolYear = mockSchoolYears.find((sy) => sy.schoolYearId === payload.schoolYear);
    const adviser = mockTeachers.find((t) => t.id === payload.userId);

    const duplicate = mockSections.some(
      (s) => s.sectionName.toLowerCase() === payload.sectionName.toLowerCase() && s.schoolYear === schoolYear?.schoolYearName
    );
    if (duplicate) throw new Error(`Section ${payload.sectionName} already exists.`);

    const newSection = {
      sectionId: mockNextId++,
      sectionName: payload.sectionName,
      schoolYear: schoolYear?.schoolYearName ?? "Unknown",
      gradeLevel: payload.gradeLevel,
      sectionStatus: "active",
      adviser: adviser?.name ?? "Unassigned",
    };
    mockSections = [...mockSections, newSection];
    return newSection;
  }

  return request("/section", { method: "POST", body: JSON.stringify(payload) });
}

// ============================================================================
// PATCH /api/section/{sectionId}
// payload: partial - only send fields that changed
// ============================================================================
export async function updateSection(sectionId, payload) {
  if (USE_MOCK_API) {
    await delay();
    const index = mockSections.findIndex((s) => s.sectionId === sectionId);
    if (index === -1) throw new Error(`Section with ${sectionId} doesn't exists`);

    const hasChanges =
      payload.sectionName !== undefined ||
      payload.gradeLevel !== undefined ||
      payload.schoolYear !== undefined ||
      payload.userId !== undefined;
    if (!hasChanges) throw new Error("No changes detected.");

    const current = mockSections[index];
    const schoolYear = payload.schoolYear
      ? mockSchoolYears.find((sy) => sy.schoolYearId === payload.schoolYear)
      : null;
    const adviser = payload.userId ? mockTeachers.find((t) => t.id === payload.userId) : null;

    const updated = {
      ...current,
      sectionName: payload.sectionName ?? current.sectionName,
      gradeLevel: payload.gradeLevel ?? current.gradeLevel,
      schoolYear: schoolYear?.schoolYearName ?? current.schoolYear,
      adviser: adviser?.name ?? current.adviser,
    };
    mockSections = mockSections.map((s) => (s.sectionId === sectionId ? updated : s));
    return updated;
  }

  return request(`/section/${sectionId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

// ============================================================================
// PATCH /api/section/{sectionId}/section-status/archive
// ============================================================================
export async function archiveSection(sectionId) {
  if (USE_MOCK_API) {
    await delay();
    const section = mockSections.find((s) => s.sectionId === sectionId);
    if (!section) throw new Error(`Section with ${sectionId} doesn't exists`);
    if (section.sectionStatus === "archived") {
      throw new Error(`Section ${section.sectionName} with SectionID: ${sectionId} is already archived`);
    }
    section.sectionStatus = "archived";
    mockSections = [...mockSections];
    return section;
  }

  return request(`/section/${sectionId}/section-status/archive`, { method: "PATCH" });
}

// ============================================================================
// PATCH /api/section/{sectionId}/section-status/active
// ============================================================================
export async function restoreSection(sectionId) {
  if (USE_MOCK_API) {
    await delay();
    const section = mockSections.find((s) => s.sectionId === sectionId);
    if (!section) throw new Error(`Section with ${sectionId} doesn't exists`);
    if (section.sectionStatus === "active") {
      throw new Error(`Section ${section.sectionName} with SectionID: ${sectionId} is already active`);
    }
    section.sectionStatus = "active";
    mockSections = [...mockSections];
    return section;
  }

  return request(`/section/${sectionId}/section-status/active`, { method: "PATCH" });
}

// ============================================================================
// GET /api/school-year
// ⚠️ I don't have SchoolYearResponse.java, so field names (schoolYearId,
// schoolYearName) are guessed from the ERD - verify once USE_MOCK_API is off.
// ============================================================================
export async function getSchoolYears() {
  if (USE_MOCK_API) {
    await delay(150);
    return mockSchoolYears.map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
  }

  const page = await request("/school-year?size=50");
  return page.content.map((sy) => ({ id: sy.schoolYearId, label: sy.schoolYearName }));
}

// ============================================================================
// Teachers - BLOCKED on the real backend (no GET endpoint yet on
// UserController). Mock mode fakes a list so the dropdown/UI can still be
// exercised. Once the backend adds a list endpoint, replace the request()
// call below and this keeps working the same way for the rest of the app.
// ============================================================================
export async function getTeachers() {
  if (USE_MOCK_API) {
    await delay(150);
    return mockTeachers;
  }

  // Not implemented yet - no backend endpoint exists.
  // Example once confirmed:
  // const page = await request("/user?role=teacher&size=100");
  // return page.content.map((u) => ({ id: u.userId, name: `${u.firstName} ${u.lastName}` }));
  return [];
}