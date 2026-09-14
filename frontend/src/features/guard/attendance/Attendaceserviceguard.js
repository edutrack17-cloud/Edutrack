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
function mapAttendanceRecord(record) {
  const timeIn = record.dateTimeIn ? record.dateTimeIn.split("T")[1] : "";
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    // Backend sends this as one pre-combined string, e.g. "Grade_6 - Sampaguita"
    // (underscore instead of space in the grade level part) - swap underscores
    // for spaces so it displays as "Grade 6 - Sampaguita".
    gradeAndSection: (record.gradeAndSection ?? "").replace(/_/g, " "),
    timeIn: timeIn ? timeIn.slice(0, 5) : "", // "07:00:00" -> "07:00"
  };
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

export default guardAttendanceApi;