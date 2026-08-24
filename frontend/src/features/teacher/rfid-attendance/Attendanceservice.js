const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// CONFIRMED via AttendanceStatus.java (com.edutrack.attendance.enums) -
// present/absent only, no "late".
const STATUS_TO_LABEL = {
  present: "Present",
  absent: "Absent",
};

const LABEL_TO_STATUS = {
  Present: "present",
  Absent: "absent",
};

function formatDate(datetime) {
  if (!datetime) return "";
  return datetime.split("T")[0]; // "2026-08-05T07:00:00" -> "2026-08-05"
}

function formatTime(datetime) {
  if (!datetime) return "";
  const time = datetime.split("T")[1];
  return time ? time.slice(0, 5) : ""; // "07:00:00" -> "07:00"
}

// CONFIRMED via AttendanceResponse.java / AttendanceMapper.java - this is
// a FLAT record, not the nested assignment.student/assignment.section
// shape this file assumed earlier off the ERD alone:
//   attendanceId, studentName, gradeAndSection, dateTimeIn, dateTimeOut,
//   attendanceStatus, confirmed
// Two things this rules out that the old AttendanceTable.jsx relies on:
//   - There's no "rfid" field at all - the RFID Tag column can't be
//     populated from this response.
//   - Grade level and section come back pre-combined into one
//     "gradeAndSection" string (built server-side by GradeAndSectionUtil,
//     whose exact format we don't have), not separate gradeLevel/section
//     fields - so they can't be shown/filtered as two columns without
//     either parsing that string or the backend exposing them separately.
function mapAttendanceRecord(record) {
  return {
    id: record.attendanceId,
    name: record.studentName ?? "",
    gradeAndSection: record.gradeAndSection ?? "",
    date: formatDate(record.dateTimeIn),
    timeIn: formatTime(record.dateTimeIn),
    timeOut: formatTime(record.dateTimeOut),
    status: STATUS_TO_LABEL[record.attendanceStatus] ?? record.attendanceStatus ?? "",
    isConfirmed: record.confirmed ?? false,
  };
}

// Attaches the HTTP status (and the backend's own error message, when it
// sends a JSON body - see ApplicationException subclasses like
// AlreadyHasARecord/AttendanceNotFound/AttendanceAlreadyConfirmed) to the
// thrown Error, so callers can branch on specific failures (e.g. a 409
// conflict) instead of only ever getting a generic "request failed".
async function buildAttendanceError(response, label) {
  let message = `${label} failed (${response.status})`;
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

// CONFIRMED via AttendanceController.java / AttendanceService.java -
// POST /api/attendance is the RFID "time in" tap. Body: { rfid }.
// The backend looks up the student's active assignment by rfid and:
//   - creates a new row (dateTimeIn = server "now", status = present,
//     confirmed = false) if this assignment has no record yet today, or
//   - throws 409 (AlreadyHasARecord) if one already exists.
// NOTE: there is currently no concept of "second tap = time out" on the
// backend - a second tap the same day just 409s. See the TODO in
// RFIDAttendancePage.jsx's recordTap() for how that's handled for now.
export async function timeInAttendance(rfid) {
  const response = await fetch(`${BASE_URL}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfid }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, "POST /api/attendance");
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}

// CONFIRMED via AttendanceController.java / AttendanceService.java -
// PATCH /api/attendance/confirm. Body: { rfid }. Finds TODAY's record for
// that rfid and sets confirmed = true. Throws 400 (AttendanceAlreadyConfirmed)
// if it's already confirmed, 404 (AttendanceNotFound) if there's no record
// for today yet, and 404 (AssignmentNotFound) if the rfid itself doesn't
// match an active assignment.
export async function confirmAttendance(rfid) {
  const response = await fetch(`${BASE_URL}/attendance/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfid }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, "PATCH /api/attendance/confirm");
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}

// STILL BLOCKED: AttendanceController.java only exposes POST /api/attendance
// (RFID tap-in) and PATCH /api/attendance/confirm - there is no GET
// endpoint to list/search/paginate attendance records at all yet. This
// function is written against what a future GET /api/attendance would
// plausibly look like (same AttendanceResponse shape as create/confirm,
// wrapped in a paginated envelope, filterable by gradeLevel/status/search),
// but until that endpoint exists on the backend, every call here will fail.
// CONNECT: GET /api/attendance
export async function fetchAttendance({
  page = 1,
  level = "",
  section = "",
  status = "",
  search = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  if (level) params.set("gradeLevel", level); // TODO: no confirmed param - endpoint doesn't exist yet
  if (section) params.set("section", section); // TODO: no confirmed param - endpoint doesn't exist yet
  if (status) params.set("status", LABEL_TO_STATUS[status] ?? status.toLowerCase());
  if (search) params.set("search", search); // TODO: no confirmed param - endpoint doesn't exist yet

  const response = await fetch(`${BASE_URL}/attendance?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`GET /api/attendance failed (${response.status})`);
  }

  const data = await response.json();

  const rawRecords = Array.isArray(data) ? data : (data.content ?? []);
  const totalPages = Array.isArray(data) ? 1 : (data.totalPages ?? 1);

  return {
    records: rawRecords.map(mapAttendanceRecord),
    totalPages,
  };
}

const GRADE_LEVEL_VALUES = ["Grade_4", "Grade_5", "Grade_6"];
const LABEL_TO_GRADE_LEVEL = {
  "Grade 4": "Grade_4",
  "Grade 5": "Grade_5",
  "Grade 6": "Grade_6",
};

export async function fetchSections({ level = "" } = {}) {
  const params = new URLSearchParams();
  if (level) params.set("gradeLevel", LABEL_TO_GRADE_LEVEL[level] ?? level);

  const response = await fetch(`${BASE_URL}/section/dropdown?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`GET /api/section/dropdown failed (${response.status})`);
  }

  const sections = await response.json();

  return (Array.isArray(sections) ? sections : []).map((section) => {
    const name = section.sectionName ?? section.name ?? "";
    return { value: name, label: name };
  });
}