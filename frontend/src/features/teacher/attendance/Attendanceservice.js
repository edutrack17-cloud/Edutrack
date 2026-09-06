import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js - this file used to implement
// that logic itself (it was the one reference implementation that had
// the refresh-on-401 retry right), but was still stuck on the OLD
// capacity 10 / 6s rate-limit numbers. Switching to the shared client
// picks up the current capacity 50 / 1.2s numbers automatically, and
// means any future rate-limit or refresh-flow change only has to happen
// in one place.
const attendanceApi = createApiClient();

const STATUS_TO_LABEL = {
  present: "Present",
  on_school: "On School",
  absent: "Absent",
};

const LABEL_TO_STATUS = {
  Present: "present",
  "On School": "on_school",
  Absent: "absent",
};

function formatDate(datetime) {
  if (!datetime) return "";
  return datetime.split("T")[0];
}

function formatTime(datetime) {
  if (!datetime) return "";
  const time = datetime.split("T")[1];
  return time ? time.slice(0, 5) : "";
}

function buildTodayDateTimeISO(hhmm) {
  const [hours, minutes] = hhmm.split(":");
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hours}:${minutes}:00`;
}

function mapAttendanceRecord(record) {
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    gradeAndSection: record.gradeAndSection ?? "",
    date: formatDate(record.dateTimeIn),
    timeIn: formatTime(record.dateTimeIn),
    timeOut: formatTime(record.dateTimeOut),
    status: STATUS_TO_LABEL[record.attendanceStatus] ?? record.attendanceStatus ?? "",
    isConfirmed: record.attendanceStatus !== "on_school",
  };
}

// error is an axios error - error.response.data is already-parsed JSON
// (no response.json() dance needed like the old fetch version).
function buildAttendanceError(error, label) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = (data && typeof data === "object" && data.message) || `${label} failed (${status})`;
  const err = new Error(message);
  err.status = status;
  return err;
}

// POST /api/attendance
export async function timeInAttendance(rfid) {
  try {
    const { data } = await attendanceApi.post("/attendance", { rfid });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error, "POST /api/attendance");
  }
}

// PATCH /api/attendance/present
export async function markAttendancePresent(rfid) {
  try {
    const { data } = await attendanceApi.patch("/attendance/present", { rfid });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error, "PATCH /api/attendance/present");
  }
}

// PATCH /api/attendance/time-out
export async function timeOutAttendance(rfid) {
  try {
    const { data } = await attendanceApi.patch("/attendance/time-out", { rfid });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error, "PATCH /api/attendance/time-out");
  }
}

function formatGradeLevelLabel(gradeLevel) {
  if (!gradeLevel) return "";
  const match = /grade[_\s]?(\d+)/i.exec(String(gradeLevel));
  return match ? `Grade ${match[1]}` : String(gradeLevel);
}

// GET /api/student
//
// FIX: this had zero caching or de-dupe, unlike fetchSections/
// fetchSectionsByAdviser below - every call hit the network, no matter
// how quickly it repeated. In dev, React 18 StrictMode double-invokes
// this page's fetch effect on every mount (mount -> cleanup -> mount),
// so RFIDAttendancePage.jsx used to fire this twice with the exact
// same params on every single mount - and an AbortController only
// cancels the request on the CLIENT; it doesn't reliably stop the
// backend from having already received and counted the first one
// against the shared rate limit before the abort signal gets there,
// especially against a fast local backend. Two real GET /api/student
// calls per mount, times however many times the sidebar is clicked
// back to this page, eats the 10 req/min bucket fast. In-flight
// de-dupe (same pattern as fetchSections/fetchSectionsByAdviser) fixes
// this at the source: a second call with identical params while the
// first is still pending reuses that same pending request instead of
// calling attendanceApi again, so the duplicate never reaches the
// backend at all.
const studentRecordsInFlight = new Map();

export async function fetchStudentRecords({
  page = 1,
  level = "",
  section = "",
  search = "",
} = {}) {
  const params = new URLSearchParams();
  if (level) params.set("gradeLevel", LABEL_TO_GRADE_LEVEL[level] ?? level);
  if (section) params.set("sectionName", section);
  if (search) params.set("studentName", search);
  params.set("studentStatus", "enrolled");
  params.set("page", String(page - 1));
  params.set("size", "20");

  const queryString = params.toString();

  if (studentRecordsInFlight.has(queryString)) {
    return studentRecordsInFlight.get(queryString);
  }

  const request = (async () => {
    try {
      const { data: pageData } = await attendanceApi.get(`/student?${queryString}`);
      const content = Array.isArray(pageData.content) ? pageData.content : [];

      const records = content.map((student) => ({
        assignmentId: student.studentId,
        studentId: student.studentId,
        lrn: student.lrn ?? "",
        rfid: student.rfid ?? "",
        name: student.fullName ?? "",
        gradeLevel: formatGradeLevelLabel(student.section?.gradeLevel),
        section: student.section?.sectionName ?? "",
        todayAttendance: null,
      }));

      return {
        records,
        totalPages: pageData.totalPages ?? 1,
        currentPage: page,
      };
    } catch (error) {
      throw buildAttendanceError(error, "GET /api/student");
    }
  })();

  studentRecordsInFlight.set(queryString, request);
  try {
    return await request;
  } finally {
    studentRecordsInFlight.delete(queryString);
  }
}

export function getRowActionState(todayAttendance) {
  if (!todayAttendance) return "needs-status";
  if (todayAttendance.status === "On School") return "needs-present";
  if (todayAttendance.status === "Present" && !todayAttendance.timeOut) {
    return "needs-timeout";
  }
  return "done";
}

// POST /api/attendance/manual/{studentId}
export async function markPresentManual(studentId, timeIn) {
  const dateTimeIn = buildTodayDateTimeISO(timeIn);

  try {
    const { data } = await attendanceApi.post(`/attendance/manual/${studentId}`, { dateTimeIn });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error, `POST /api/attendance/manual/${studentId}`);
  }
}

// PATCH /api/attendance/manual-timeout/{studentId}
export async function manualTimeOut(studentId) {
  try {
    const { data } = await attendanceApi.patch(`/attendance/manual-timeout/${studentId}`);
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error, `PATCH /api/attendance/manual-timeout/${studentId}`);
  }
}

// POST /api/attendance/close-attendance?sectionName={sectionName}
export async function closeAttendanceForSection(sectionName) {
  try {
    const { data } = await attendanceApi.post("/attendance/close-attendance", null, {
      params: { sectionName },
    });
    return (Array.isArray(data) ? data : []).map(mapAttendanceRecord);
  } catch (error) {
    throw buildAttendanceError(error, "POST /api/attendance/close-attendance");
  }
}

const LABEL_TO_GRADE_LEVEL = {
  "Grade 4": "Grade_4",
  "Grade 5": "Grade_5",
  "Grade 6": "Grade_6",
};

// GET /api/section/dropdown
//
// FIX: this had no caching at all, unlike fetchSectionsByAdviser below -
// every open of the admin Grade Level/Section dropdowns cost a fresh
// request (AttendaceFilters' refreshKey refetches on every dropdown
// open), with no protection against opening it repeatedly within a few
// seconds. Same Map cache + in-flight dedupe pattern as the adviser path
// now applies here too, keyed by level since that's the only param.
const sectionsCache = new Map();
const sectionsInFlight = new Map();
const SECTIONS_CACHE_TTL_MS = 30_000;

export function invalidateSectionsCache(level) {
  if (level === undefined) {
    sectionsCache.clear();
  } else {
    sectionsCache.delete(level || "__all__");
  }
}

export async function fetchSections({ level = "" } = {}) {
  const cacheKey = level || "__all__";

  const cached = sectionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (sectionsInFlight.has(cacheKey)) {
    return sectionsInFlight.get(cacheKey);
  }

  const request = (async () => {
    const params = {};
    if (level) params.gradeLevel = LABEL_TO_GRADE_LEVEL[level] ?? level;

    let sections;
    try {
      const { data } = await attendanceApi.get("/section/dropdown", { params });
      sections = data;
    } catch (error) {
      throw new Error(`GET /api/section/dropdown failed (${error.response?.status})`);
    }

    const mapped = (Array.isArray(sections) ? sections : []).map((section) => {
      const name = section.sectionName ?? section.name ?? "";
      return { value: name, label: name };
    });

    sectionsCache.set(cacheKey, {
      data: mapped,
      expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS,
    });
    return mapped;
  })();

  sectionsInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    sectionsInFlight.delete(cacheKey);
  }
}

const sectionsByAdviserCache = new Map();
const sectionsByAdviserInFlight = new Map();
// Reuses the SECTIONS_CACHE_TTL_MS declared above (admin sections cache) -
// same 30s TTL, no need for a second constant.

export function invalidateSectionsByAdviserCache(userId) {
  if (userId === undefined) {
    sectionsByAdviserCache.clear();
  } else {
    sectionsByAdviserCache.delete(userId);
  }
}

// GET /api/section/{userId}
async function fetchRawSectionsByAdviser(userId) {
  const cached = sectionsByAdviserCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (sectionsByAdviserInFlight.has(userId)) {
    return sectionsByAdviserInFlight.get(userId);
  }

  const request = (async () => {
    let data;
    try {
      ({ data } = await attendanceApi.get(`/section/${userId}`));
    } catch (error) {
      throw new Error(`GET /api/section/${userId} failed (${error.response?.status})`);
    }

    const sections = Array.isArray(data) ? data : [];
    sectionsByAdviserCache.set(userId, {
      data: sections,
      expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS,
    });
    return sections;
  })();

  sectionsByAdviserInFlight.set(userId, request);
  try {
    return await request;
  } finally {
    sectionsByAdviserInFlight.delete(userId);
  }
}

export async function fetchSectionsByAdviser({ userId, level = "" } = {}) {
  const sections = await fetchRawSectionsByAdviser(userId);
  const targetGradeLevel = level ? (LABEL_TO_GRADE_LEVEL[level] ?? level) : "";

  return sections
    .filter((section) => section.sectionStatus !== "archived")
    .filter((section) => !targetGradeLevel || section.gradeLevel === targetGradeLevel)
    .map((section) => {
      const name = section.sectionName ?? section.name ?? "";
      return { value: name, label: name };
    });
}

export async function fetchGradeLevelsByAdviser({ userId } = {}) {
  const sections = await fetchRawSectionsByAdviser(userId);

  const seen = new Set();
  const levels = [];
  for (const section of sections) {
    if (section.sectionStatus === "archived") continue;
    const label = formatGradeLevelLabel(section.gradeLevel);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    levels.push({ value: label, label });
  }

  return levels.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
}

export default attendanceApi;