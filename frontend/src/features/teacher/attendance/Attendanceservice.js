import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

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

// Moved up here so it's declared before fetchStudentRecords / any other
// function that reads it. Previously this was declared further down the
// file, which worked only because the callers happen to run after module
// evaluation completes - fragile and easy to trip over in a refactor.
const LABEL_TO_GRADE_LEVEL = {
  "Grade 4": "Grade_4",
  "Grade 5": "Grade_5",
  "Grade 6": "Grade_6",
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

// Backend enum values look like "Grade_6" (or "Grade_6 - Sampaguita" inside
// gradeAndSection). The UI should always show "Grade 6", so normalize any
// "Grade_<n>" occurrence to "Grade <n>" before it reaches a component.
function formatGradeAndSection(value) {
  if (!value) return "";
  return String(value).replace(/grade[_\s]?(\d+)/gi, "Grade $1");
}

function formatGradeLevelLabel(gradeLevel) {
  if (!gradeLevel) return "";
  const match = /grade[_\s]?(\d+)/i.exec(String(gradeLevel));
  return match ? `Grade ${match[1]}` : String(gradeLevel);
}

function mapAttendanceRecord(record) {
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    gradeAndSection: formatGradeAndSection(record.gradeAndSection),
    rfid: record.rfid ?? "",
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
// back to this page, eats the rate limit bucket fast. In-flight
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
  size = 20,
  // FIX: previously this deliberately sent NO schoolYearStatuses at all,
  // which StudentService.getStudents treats as "no filter" - so the
  // roster included students from sections in EVERY school year
  // (planning/active/archived/closed), not just the one currently being
  // used for attendance. That's why students from unrelated school
  // years were showing up here (unlike the Student Management page,
  // which has an explicit school-year dropdown driving this same param).
  // Scoped to ["active", "planning"] rather than just ["active"] alone -
  // an earlier attempt to force "active" only emptied the roster
  // whenever the currently-used school year's sections weren't yet
  // flipped to literally `active` in the data. If that empty-roster
  // symptom comes back, it means a school year that should count as
  // "current" isn't active or planning - that's a data/admin-side fix,
  // not something to chase from here.
  schoolYearStatuses = ["active", "planning"],
} = {}) {
  const params = new URLSearchParams();
  if (level) params.set("gradeLevel", LABEL_TO_GRADE_LEVEL[level] ?? level);
  if (section) params.set("sectionName", section);
  // StudentController.getStudents has no `studentName` param - the name
  // filter is called `search` (anything else is silently ignored by
  // Spring, which is why typing a name never narrowed the roster
  // server-side before).
  if (search) params.set("search", search);
  params.set("studentStatus", "enrolled");
  schoolYearStatuses.forEach((s) => params.append("schoolYearStatuses", s));
  params.set("page", String(page - 1));
  params.set("size", String(size));

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

// Walks EVERY roster page for the given filters. The backend caps the page
// size, so asking for size=1000 only ever returned the first ~10 students -
// which is why a Status filter (On School / Present / Absent) came back empty
// unless the search narrowed the roster down to someone in that first page.
// Cached briefly so changing pages/status doesn't re-download the roster.
const rosterAllCache = new Map();
const ROSTER_ALL_CACHE_TTL_MS = 60_000;

export function invalidateStudentRosterCache() {
  rosterAllCache.clear();
}

export async function fetchAllStudentRecords({
  level = "",
  section = "",
  search = "",
  size = 1000,
  maxPages = 100,
} = {}) {
  const cacheKey = JSON.stringify([level, section, search]);
  const cached = rosterAllCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const first = await fetchStudentRecords({ page: 1, level, section, search, size });
  const records = [...first.records];
  const lastPage = Math.min(first.totalPages, maxPages);

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchStudentRecords({ page, level, section, search, size });
    records.push(...next.records);
  }

  const result = { records, totalPages: 1, currentPage: 1 };
  rosterAllCache.set(cacheKey, { data: result, expiresAt: Date.now() + ROSTER_ALL_CACHE_TTL_MS });
  return result;
}

// GET /api/attendance?gradeLevel={gradeLevel}
//
// The backend `GET /api/attendance` now accepts a `gradeLevel` query
// param (Grade_4 / Grade_5 / Grade_6) and always scopes the result to
// students whose current enrollment status is `enrolled` - that
// enrolled-only predicate is applied unconditionally in
// AttendanceSpecification and cannot be turned off from here, so callers
// only ever see currently-enrolled students.
//
// The response is a Spring `Page<AttendanceResponse>`, not a plain
// array - we unwrap `data.content`. And we send `gradeLevel`, not
// `sectionName`, since the endpoint no longer takes a section filter.
//
// NOTE: the response DTO does NOT include `rfid` - callers that need to
// correlate these rows with a roster should key on the attendance id or
// the student name + gradeAndSection, not on rfid.
function getLocalTodayString() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

// The backend caps the page size (the roster shows 10 rows/page even though
// the page asks for 20, so a requested size=1000 is silently cut down) and
// GET /api/attendance has no "today" filter. So ONE request is never enough:
// it only ever returned the first few records. This walks the pages
// newest-first (sort=attendanceId,desc) and stops as soon as it reaches a
// record from a previous day, the last page, or `maxPages`.
//
// - `status` (e.g. "On School") is sent as the server-side attendanceStatus
//   filter, so a Status-filtered view only pages through matching records.
// - `maxPages` lets the 15s background poll stay cheap (it only needs the
//   newest taps); the full load uses the larger default.
// - results are cached for `cacheMs` so paging through the roster doesn't
//   re-walk every attendance page on each click. Pass cacheMs: 0 to bypass.
const todaysAttendanceCache = new Map();

export function invalidateTodaysAttendanceCache() {
  todaysAttendanceCache.clear();
}

export async function fetchTodaysAttendance({
  gradeLevel,
  status,
  size = 1000,
  maxPages = 40,
  cacheMs = 30_000,
} = {}) {
  const cacheKey = JSON.stringify([gradeLevel || "", status || "", maxPages]);
  if (cacheMs > 0) {
    const cached = todaysAttendanceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
  }

  try {
    const all = [];
    let reachedOldDay = false;

    for (let page = 0; page < maxPages && !reachedOldDay; page += 1) {
      const params = { size, page, sort: "attendanceId,desc" };
      if (gradeLevel) {
        params.gradeLevel = LABEL_TO_GRADE_LEVEL[gradeLevel] ?? gradeLevel;
      }
      if (status) {
        params.attendanceStatus = LABEL_TO_STATUS[status] ?? status;
      }

      const { data } = await attendanceApi.get("/attendance", { params });
      const content = Array.isArray(data?.content) ? data.content : [];
      const mapped = content.map(mapAttendanceRecord);
      all.push(...mapped);

      const today = getLocalTodayString();
      if (mapped.some((r) => r.date && r.date !== today)) reachedOldDay = true;

      const isLastPage = data?.last === true || page + 1 >= (data?.totalPages ?? 1);
      if (isLastPage || content.length === 0) break;
    }

    // Records with a time-in carry their date; "absent" records have no
    // dateTimeIn, so they're kept only if newer than the newest record
    // known to be from a previous day.
    const today = getLocalTodayString();
    const maxOldId = all.reduce(
      (max, r) => (r.date && r.date !== today ? Math.max(max, r.id) : max),
      0
    );
    const result = all.filter((r) => (r.date ? r.date === today : r.id > maxOldId));

    if (cacheMs > 0) {
      todaysAttendanceCache.set(cacheKey, { data: result, expiresAt: Date.now() + cacheMs });
    }
    return result;
  } catch (error) {
    throw buildAttendanceError(error, "GET /api/attendance");
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

// GET /api/section/adviser/{userId}
//
// FIX: this used to call /api/section/{userId}, but the backend now
// routes /api/section/{sectionId} to getSectionById, and the adviser
// list lives at /api/section/adviser/{userId}. Without this change the
// call would return a single SectionResponse object instead of a list,
// and the Array.isArray guard would silently turn it into [].
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
      ({ data } = await attendanceApi.get(`/section/adviser/${userId}`));
    } catch (error) {
      throw new Error(`GET /api/section/adviser/${userId} failed (${error.response?.status})`);
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