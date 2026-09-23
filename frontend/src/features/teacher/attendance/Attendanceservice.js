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

// Same yyyy-mm-dd construction as buildTodayDateTimeISO above, but with no
// time part - used by fetchTodaysAttendanceForSection to filter records
// client-side. Built from LOCAL getFullYear/getMonth/getDate (not
// toISOString, which is UTC and would roll over to the wrong day for a
// few hours around PH midnight), so it lines up with the backend's
// LocalDate.now() as long as the server also runs in PH time.
function getTodayDateStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Backend enum values look like "Grade_6" (or "Grade_6 - Sampaguita" inside
// gradeAndSection). The UI should always show "Grade 6", so normalize any
// "Grade_<n>" occurrence to "Grade <n>" before it reaches a component.
function formatGradeAndSection(value) {
  if (!value) return "";
  return String(value).replace(/grade[_\s]?(\d+)/gi, "Grade $1");
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
  // StudentController.getStudents has no `studentName` param - the name
  // filter is called `search` (anything else is silently ignored by
  // Spring, which is why typing a name never narrowed the roster
  // server-side before).
  if (search) params.set("search", search);
  params.set("studentStatus", "enrolled");
  // UPDATED: now scoping to the active school year so a student who's
  // still "enrolled" but hasn't been promoted into a section under this
  // year yet (previous year now closed/archived) no longer shows up as a
  // stale row. This used to be left off because forcing "active" emptied
  // the roster - but that was from before schoolYearStatuses became a
  // real optional List on the backend; StudentService now treats it as
  // "no filter" only when omitted entirely, so a single value here is
  // safe. If some currently-in-use school year turns out to still be
  // sitting in "planning" status admin-side, add it here too:
  // params.append("schoolYearStatuses", "planning")
  params.set("schoolYearStatuses", "active");
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

// GET /api/attendance?sectionName={sectionName}
//
// UPDATED: the backend now has a GET /api/attendance mapping (it used to
// have none at all, which is why RFIDAttendancePage's polling effect
// still has 404/405 handling that stops itself - that's kept as a
// defensive fallback in case the mapping ever disappears again, but it
// shouldn't fire anymore). What's live right now
// (AttendanceController.getAttendance -> AttendanceService.getAttendance)
// is a plain paginated "every attendance record ever" endpoint: it has no
// `sectionName` binding (the param is still sent below, harmlessly - a
// Spring @RequestParam-less query param is just ignored - in case the
// backend adds real support later) and no date filtering, and it returns
// a Spring Page envelope ({content, totalPages, ...}), not a bare array,
// so the old `Array.isArray(data) ? data : []` check used to always fall
// through to [] here. This now:
//   1. reads `data.content` instead of `data`
//   2. asks for a big `size` so today's records - which sit at the front,
//      since the backend sorts unsorted requests by attendanceId DESC -
//      are guaranteed to be inside the one page fetched
//   3. filters to today client-side by each record's dateTimeIn date
// Records from OTHER sections coming back in that page are harmless -
// RFIDAttendancePage's mergeTodaysAttendance only pulls matches for
// names that exist in the (already section-filtered) roster, so any
// extra rows are just never matched to anything.
const TODAYS_ATTENDANCE_PAGE_SIZE = 1000;

export async function fetchTodaysAttendanceForSection(sectionName) {
  try {
    const { data } = await attendanceApi.get("/attendance", {
      params: { sectionName, size: TODAYS_ATTENDANCE_PAGE_SIZE },
    });
    const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    const todayStr = getTodayDateStr();
    const todaysRecords = content.filter((record) => formatDate(record.dateTimeIn) === todayStr);
    return todaysRecords.map(mapAttendanceRecord);
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

// GET /api/section/adviser/{userId} (SectionController.readSectionByAdviser)
//
// FIX: this used to call GET /api/section/{userId}. The backend later
// split that path - it now means GET /api/section/{sectionId} (fetch
// ONE section by its own id), and the adviser lookup moved to
// /section/adviser/{userId} (see enrollmentService.js's
// getSectionsByAdviser(), which already made this switch). This file
// was never updated, so a teacher's request here was silently
// resolving to an unrelated single SectionResponse object (whatever
// section happened to have that sectionId) instead of their real
// section list - which Array.isArray(data) below then reduced to [],
// with no error, no catch-fallback, just an empty Grade Level/Section
// dropdown for a teacher who genuinely has a section assigned.
//
// Also: an empty [] is a normal, successful "no assigned sections yet"
// result on this endpoint (it used to 404), not an error - so it's
// deliberately NOT cached, same as getSectionsByAdviser() in
// enrollmentService.js. Otherwise a teacher who just got a section
// assigned by an admin could still see "none" here for up to 30s.
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
    if (sections.length > 0) {
      sectionsByAdviserCache.set(userId, {
        data: sections,
        expiresAt: Date.now() + SECTIONS_CACHE_TTL_MS,
      });
    }
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