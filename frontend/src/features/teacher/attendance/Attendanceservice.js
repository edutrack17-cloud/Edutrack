const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";


// AttendanceStatus.java has 3 values (present/late/absent) but the ERD only
// shows 2 (present/absent). TODO: confirm which is correct with backend.
const STATUS_TO_LABEL = {
  present: "Present",
  late: "Late",
  absent: "Absent",
};

const LABEL_TO_STATUS = {
  Present: "present",
  Late: "late",
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

// Maps one backend record to the row shape AttendanceTable.jsx expects.
function mapAttendanceRecord(record) {
  return {
    id: record.attendanceId,
    studentId: record.studentId ?? record.student?.studentId, // TODO: confirm path
    assignmentId: record.assignmentId ?? record.studentSectionAssignment?.assignmentId, // TODO: confirm path
    date: formatDate(record.datetimeIn),
    rfid: record.rfid ?? record.student?.rfid ?? "", // TODO: confirm join field
    name: record.name ?? record.studentName ?? "", // TODO: confirm join field
    gradeLevel: record.gradeLevel ?? "", // TODO: confirm join field
    section: record.section ?? "", // TODO: confirm join field
    timeIn: formatTime(record.datetimeIn),
    timeOut: formatTime(record.datetimeOut),
    status: STATUS_TO_LABEL[record.attendanceStatus] ?? record.attendanceStatus ?? "",
    isConfirmed: record.isConfirmed ?? record.confirmed ?? false,
  };
}

// TODO: URL, query params, and response envelope are unconfirmed placeholders.
// AttendanceTable.jsx still filters client-side as a fallback either way.
export async function fetchAttendance({
  page = 1,
  level = "",
  section = "",
  status = "",
  search = "",
} = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  if (level) params.set("gradeLevel", level); // TODO: confirm param name
  if (section) params.set("section", section); // TODO: confirm param name
  if (status) params.set("status", LABEL_TO_STATUS[status] ?? status.toLowerCase());
  if (search) params.set("search", search); // TODO: confirm param name

  const response = await fetch(`${BASE_URL}/attendance?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`GET /api/attendance failed (${response.status})`);
  }

  const data = await response.json();

  // TODO: assumes Spring Page<> envelope ({ content, totalPages }); falls
  // back to a plain array with 1 page if the controller returns that instead.
  const rawRecords = Array.isArray(data) ? data : (data.content ?? []);
  const totalPages = Array.isArray(data) ? 1 : (data.totalPages ?? 1);

  return {
    records: rawRecords.map(mapAttendanceRecord),
    totalPages,
  };
}