// features/teacher/sf2Attendance/Componetns/Sf2attendanceservice.js
//
// Read side of the SF2 feature:
//
//   fetchSf2Sections()  -> GET /api/section/dropdown
//                          (SectionController#sectionDropdown, ADMIN + TEACHER)
//   fetchSf2Table()     -> GET /api/schoolform/sf2/table?sectionId=&schoolYearId=&period=yyyy-MM
//                          (SF2ReportController#getSF2Table -> SF2TableService)
//
// The download side (GET /schoolform/sf2/{sectionId}) stays in
// Sf2exportexcel.js - untouched.
//
// Uses the shared apiClient (baseURL already ends in /api, Bearer header +
// 401 refresh-and-retry handled there; GETs aren't charged to the client
// rate-limit bucket).
//
// ---------------------------------------------------------------------
// SectionResponse (confirmed from SectionResponse.java):
//   { sectionId, sectionName, schoolYearId, schoolYear (the display name,
//     e.g. "2026-2027"), gradeLevel ("Grade_4"), sectionStatus, adviser }
// mapSection() below is the only place that reads these fields.
//
// Errors: the backend's ErrorResponse is { timestamp, status, error, message,
// path }, and GlobalExceptionHandler maps a failed @PreAuthorize to 403 (not
// 401), so an unauthorized section shows a message instead of triggering the
// apiClient's logout-and-redirect.
//
// The school-year list is derived from these sections instead of calling
// GET /api/school-year/dropdown, because that endpoint is ADMIN-only and
// this page is used by teachers too.
// ---------------------------------------------------------------------
//
// SF2TableResponse (already confirmed from the controller/service source):
//   { schoolYear, gradeLevel ("Grade_4"), sectionName, month,
//     schoolDays: ["2026-02-02", ...]            // Mon-Fri only
//     students: [{ studentId, studentName, lrn,
//                  attendance: { "2026-02-02": "P" | "A" } }] }  // no mark = key omitted

import createApiClient from "../../../services/apiClient";

const apiClient = createApiClient();

// Backend marks -> the status keys STATUS_STYLES (Sf2attendancetable.jsx)
// already understands. Anything else (or a missing key) renders as a blank cell.
const MARK_TO_STATUS = {
  P: "present",
  A: "absent",
};

// Index = Date#getDay(). Weekends never show up in schoolDays, but keep them
// blank rather than wrong if the backend ever starts sending them.
const WEEKDAY_LETTERS = ["", "M", "T", "W", "TH", "F", ""];

export function buildPeriod(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

export async function fetchSf2Sections() {
  let response;
  try {
    response = await apiClient.get("/section/dropdown");
  } catch (error) {
    throw new Error(
      resolveErrorMessage(error, {
        forbidden: "You're not authorized to view sections.",
        notFound: "Sections could not be found.",
        fallback: "Failed to load sections. Please try again.",
      })
    );
  }

  return (response.data ?? []).map(mapSection);
}

function mapSection(section) {
  return {
    id: section.sectionId,
    name: section.sectionName,
    gradeLevel: formatGradeLevel(section.gradeLevel),
    schoolYearId: section.schoolYearId,
    schoolYearName: section.schoolYear,
  };
}

// ---------------------------------------------------------------------
// SF2 table
// ---------------------------------------------------------------------

export async function fetchSf2Table({ sectionId, schoolYearId, year, monthIndex }) {
  if (!sectionId) {
    throw new Error("Select a section to view its attendance.");
  }
  if (!schoolYearId) {
    throw new Error("Select a school year to view attendance.");
  }

  let response;
  try {
    response = await apiClient.get("/schoolform/sf2/table", {
      params: {
        sectionId,
        schoolYearId,
        period: buildPeriod(year, monthIndex),
      },
    });
  } catch (error) {
    throw new Error(
      resolveErrorMessage(error, {
        forbidden: "You're not authorized to view this section's attendance.",
        notFound: "That section or school year could not be found.",
        fallback: "Failed to load SF2 attendance. Please try again.",
      })
    );
  }

  return normalizeSf2Table(response.data);
}

function normalizeSf2Table(data) {
  const schoolDays = (data?.schoolDays ?? []).map(toSchoolDay);

  const students = (data?.students ?? [])
    .map((row) => ({
      id: row.studentId,
      name: row.studentName,
      lrn: row.lrn ?? "",
      // { "2026-02-02": "present" | "absent" }, keyed by ISO date so it lines
      // up 1:1 with schoolDay.date in the table.
      days: Object.fromEntries(
        Object.entries(row.attendance ?? {})
          .filter(([, mark]) => MARK_TO_STATUS[mark])
          .map(([date, mark]) => [date, MARK_TO_STATUS[mark]])
      ),
    }))
    // Names arrive as "Last, First Middle", so this is alphabetical by last name.
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    schoolYear: data?.schoolYear ?? "",
    gradeLevel: formatGradeLevel(data?.gradeLevel),
    sectionName: data?.sectionName ?? "",
    month: data?.month ?? "",
    schoolDays,
    students,
  };
}

function toSchoolDay(value) {
  const date = toIsoDate(value);
  const [y, m, d] = date.split("-").map(Number);
  // Built from parts (not new Date("yyyy-mm-dd")) so the weekday can't shift
  // by a day in timezones behind UTC.
  const weekday = WEEKDAY_LETTERS[new Date(y, m - 1, d).getDay()];
  return { date, day: d, weekday };
}

// Spring serializes LocalDate as "yyyy-MM-dd" by default; accept the
// [yyyy, m, d] array form too in case timestamps-as-arrays is switched on.
function toIsoDate(value) {
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(value);
}

// Backend sends the enum name ("Grade_4"); the page's dropdown uses "Grade 4".
function formatGradeLevel(value) {
  return value ? String(value).replace(/_/g, " ") : "";
}

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

function resolveErrorMessage(error, { forbidden, notFound, fallback }) {
  const response = error.response;
  if (!response) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  // 401/403 get our own wording: the backend's 403 text is a generic
  // "You're not allowed to access this feature" that doesn't say what.
  if (response.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (response.status === 403) {
    return forbidden;
  }

  // 5xx is always the handler's generic "An unexpected error occurred".
  if (response.status >= 500) {
    return fallback;
  }

  // Everything else: ErrorResponse.message from GlobalExceptionHandler
  // (e.g. SectionNotFound's own text) is specific enough to show as-is.
  const message = response.data?.message;
  if (typeof message === "string" && message.trim()) return message;

  return response.status === 404 ? notFound : fallback;
}