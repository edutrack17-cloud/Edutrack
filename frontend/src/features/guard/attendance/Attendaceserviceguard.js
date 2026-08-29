const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// GUARD ATTENDANCE SERVICE
// Separate from the teacher account's Attendanceservice.js on purpose
// - guard and teacher are different accounts/features, and this file
// only needs the ONE call the gate kiosk makes. If the guard account
// ever needs more attendance calls later, add them here rather than
// reaching into features/teacher/.

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
    gradeAndSection: record.gradeAndSection ?? "",
    timeIn: timeIn ? timeIn.slice(0, 5) : "", // "07:00:00" -> "07:00"
  };
}

// Attaches the HTTP status (and the backend's own error message, when
// it sends a JSON body - see ApplicationException subclasses like
// AlreadyHasARecord/AssignmentNotFound) to the thrown Error, so
// callers can branch on specific failures instead of only ever
// getting a generic "request failed".
async function buildAttendanceError(response) {
  let message = `POST /api/attendance failed (${response.status})`;
  try {
    const body = await response.json();
    if (body?.message) message = body.message;
  } catch {
    // no JSON body on the error response - keep the generic message above
  }
  const error = new Error(message);
  error.status = response.status;
  return error;
}

// POST /api/attendance - the RFID "time in" tap (GUARD side). Body:
// { rfid }. Creates a new row (dateTimeIn = server "now", status =
// on_school) if this assignment has no record yet today, or throws
// 409 (AlreadyHasARecord) if one already exists - a normal, expected
// outcome here (one gate tap per day is all that's needed), not an
// error state for the guard. Also throws 404 (AssignmentNotFound) if
// the rfid doesn't match an active assignment.
export async function timeInAttendance(rfid) {
  const response = await fetch(`${BASE_URL}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfid }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response);
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}