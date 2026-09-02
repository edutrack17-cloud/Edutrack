import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

studentApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return fallback;
}

function mapSections(data) {
  return data
    .filter((section) => section.sectionStatus !== "archived")
    .map((section) => ({
      id: section.sectionId,
      name: section.sectionName,
      gradeLevel: section.gradeLevel,
    }));
}

export async function getPromotableStudents({ gradeLevel, section, page = 0, size = 10 } = {}) {
  const params = { studentStatus: "enrolled", page, size };
  if (gradeLevel) params.gradeLevel = gradeLevel;
  if (section) params.sectionName = section;

  try {
    const { data } = await studentApi.get("/student", { params });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load students"));
  }
}

// Sections for the page-level filter row - filters the STUDENT TABLE by
// the student's CURRENT section. Always the active school year, since
// /section/dropdown only ever returns active-school-year sections (see
// SectionSpecification.hasSchoolYearStatus() - hardcoded to `active`,
// no param exists to request anything else).
export async function getCurrentSections(gradeLevel) {
  const params = {};
  if (gradeLevel) params.gradeLevel = gradeLevel;

  try {
    const { data } = await studentApi.get("/section/dropdown", { params });
    return mapSections(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

// PLACEHOLDER - target sections for the Promote modal.
//
// The intended design was to promote a student into a section
// belonging to the school's NEXT (planning) school year, so the
// current year's roster stays untouched until that year actually
// starts. That is NOT supported by the backend today:
//   - SectionController's GET /section/dropdown only accepts
//     `gradeLevel` - there is no schoolYearStatus param to send.
//   - SectionSpecification.hasSchoolYearStatus() is hardcoded to
//     SchoolYearStatus.active, so even if a param existed, there's no
//     query path to `planning` sections through this endpoint.
//   - Even if a planning section's id reached the promote request
//     anyway, StudentService.promoteStudents() explicitly rejects any
//     target section whose school year isn't active (throws
//     InactiveSectionNotAllowed).
//
// So for now this reuses the same current-active-school-year dropdown
// as getCurrentSections() above - meaning "Promote" moves a student to
// a next-grade-level section within the SAME school year, not a future
// one. Kept as its own function (instead of just calling
// getCurrentSections directly from the modal) so that once the backend
// adds real planning-year support, only THIS function needs to change
// (add the schoolYearStatus param here) - nothing else in the modal
// or page needs to be touched.
export async function getTargetSections(gradeLevel) {
  const params = {};
  if (gradeLevel) params.gradeLevel = gradeLevel;

  try {
    const { data } = await studentApi.get("/section/dropdown", { params });
    return mapSections(data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load sections"));
  }
}

export async function promoteStudents(studentIds, targetSectionId) {
  try {
    const { data } = await studentApi.patch("/student/grade-level/promote", {
      studentIds,
      targetSectionId: Number(targetSectionId),
    });
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to promote students"));
  }
}

export async function graduateStudents(studentIds, remarks = "", leftAt = new Date().toISOString().split("T")[0]) {
  const results = { succeeded: [], failed: [] };

  for (const studentId of studentIds) {
    try {
      const { data } = await studentApi.patch(`/student/${studentId}/student-status/graduate`, { remarks, leftAt });
      results.succeeded.push(data);
    } catch (error) {
      results.failed.push({ studentId, message: getErrorMessage(error, "Failed to graduate student") });
    }
  }

  if (results.failed.length > 0) {
    const failedIds = results.failed.map((f) => f.studentId).join(", ");
    throw Object.assign(
      new Error(`Failed to graduate ${results.failed.length} student(s): ${failedIds}`),
      { partialResult: results }
    );
  }

  return results.succeeded;
}

export default studentApi;