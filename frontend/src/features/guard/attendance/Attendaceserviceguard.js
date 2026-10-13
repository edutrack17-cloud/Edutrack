import { createApiClient } from "../../../services/apiClient"; // TODO: adjust to wherever apiClient.js actually lives relative to this file

// GUARD ATTENDANCE SERVICE
// Separate from the teacher account's Attendanceservice.js on purpose
// - guard and teacher are different accounts/features, and this file
// only needs the ONE call the gate kiosk makes. If the guard account
// ever needs more attendance calls later, add them here rather than
// reaching into features/teacher/.

// Rate-limit throttle, Authorization header, 401-refresh-retry, and
// 429-retry all now live in apiClient.js - this file used to hand-roll
// all of that itself (stuck on the OLD capacity 10 / 6s numbers, and
// with no refresh-on-401 retry - a stale/expired access token sent the
// guard kiosk straight to logout instead of quietly refreshing).
const guardAttendanceApi = createApiClient();

// CONFIRMED via AttendanceResponse.java / AttendanceMapper.java - flat
// record: attendanceId, studentName, gradeAndSection, dateTimeIn,
// dateTimeOut, attendanceStatus, confirmed. No "rfid" field, and
// gradeAndSection is one pre-combined string, not separate
// gradeLevel/section.
const STATUS_TO_LABEL = {
  on_school: "On School",
  present: "Present",
  absent: "Absent",
};

// "2026-10-13T07:00:00" -> "07:00" (empty string when there's no value,
// e.g. dateTimeOut is null until the student times out).
function extractHHmm(datetime) {
  const time = datetime ? datetime.split("T")[1] : "";
  return time ? time.slice(0, 5) : "";
}

function mapAttendanceRecord(record) {
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    // Backend sends this as one pre-combined string, e.g. "Grade_6 - Sampaguita"
    // (underscore instead of space in the grade level part) - swap underscores
    // for spaces so it displays as "Grade 6 - Sampaguita".
    gradeAndSection: (record.gradeAndSection ?? "").replace(/_/g, " "),
    date: record.dateTimeIn ? record.dateTimeIn.split("T")[0] : "",
    timeIn: extractHHmm(record.dateTimeIn), // "07:00:00" -> "07:00"
    timeOut: extractHHmm(record.dateTimeOut),
    // on_school -> "On School", present -> "Present", absent -> "Absent".
    // A tap right after POST /api/attendance is always on_school; the
    // teacher's scanner later moves it to present and sets timeOut.
    status: STATUS_TO_LABEL[record.attendanceStatus] ?? record.attendanceStatus ?? "",
  };
}

function getLocalTodayString() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

// error is an axios error - error.response.data is already-parsed JSON
// (no response.json() dance needed like the old fetch version). Attaches
// the HTTP status (and the backend's own error message, when it sends a
// JSON body - see ApplicationException subclasses like
// AlreadyHasARecord/AssignmentNotFound) to the thrown Error, so callers
// can branch on specific failures instead of only ever getting a
// generic "request failed".
function buildAttendanceError(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message = (data && typeof data === "object" && data.message) || `POST /api/attendance failed (${status})`;
  const err = new Error(message);
  err.status = status;
  return err;
}

// POST /api/attendance - the RFID "time in" tap (GUARD side). Body:
// { rfid }. Creates a new row (dateTimeIn = server "now", status =
// on_school) if this assignment has no record yet today, or throws
// 409 (AlreadyHasARecord) if one already exists - a normal, expected
// outcome here (one gate tap per day is all that's needed), not an
// error state for the guard. Also throws 404 (AssignmentNotFound) if
// the rfid doesn't match an active assignment.
export async function timeInAttendance(rfid) {
  try {
    const { data } = await guardAttendanceApi.post("/attendance", { rfid });
    return mapAttendanceRecord(data);
  } catch (error) {
    throw buildAttendanceError(error);
  }
}

// GET /api/attendance - read-only lookup so the gate kiosk can show what
// happened to a student AFTER their gate tap (teacher's scanner moved
// them to Present, then later set a time out). Nothing pushes that to
// this browser, so the page polls this.
//
// The response is a Spring Page<AttendanceResponse> (unwrap data.content)
// with NO rfid / studentId field, so callers match rows by `id`
// (attendanceId), which the gate tap already gave us.
//
// The backend caps the page size (~10 rows even if size=1000 is asked
// for), so this walks pages NEWEST-first (sort=attendanceId,desc) and
// stops as soon as it has gone past the oldest id the caller still cares
// about (`minId` = smallest still-pending tap), reached a record from a
// previous day, hit the last page, or hit `maxPages`. That keeps the
// poll cheap once most taps are finished (timeOut set).
export async function fetchTodaysAttendanceUpdates({ minId = 0, size = 1000, maxPages = 40 } = {}) {
  const today = getLocalTodayString();
  const all = [];

  try {
    for (let page = 0; page < maxPages; page += 1) {
      const { data } = await guardAttendanceApi.get("/attendance", {
        params: { size, page, sort: "attendanceId,desc" },
      });
      const content = Array.isArray(data?.content) ? data.content : [];
      const mapped = content.map(mapAttendanceRecord);
      all.push(...mapped);

      const reachedOldDay = mapped.some((r) => r.date && r.date !== today);
      const passedMinId = mapped.length > 0 && mapped.every((r) => r.id < minId);
      const isLastPage = data?.last === true || page + 1 >= (data?.totalPages ?? 1);
      if (reachedOldDay || passedMinId || isLastPage || content.length === 0) break;
    }
  } catch (error) {
    const status = error.response?.status;
    const err = new Error(`GET /api/attendance failed (${status})`);
    err.status = status;
    throw err;
  }

  return all;
}

export default guardAttendanceApi;