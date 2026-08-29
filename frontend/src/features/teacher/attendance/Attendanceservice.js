const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

// CONFIRMED via AttendanceStatus.java (com.edutrack.attendance.enums) -
// THREE values as of the latest backend pull: present / on_school /
// absent (previously we only mapped present/absent - on_school is the
// "guard tapped in, not yet confirmed by the teacher" state and was
// missing here).
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
  return datetime.split("T")[0]; // "2026-08-05T07:00:00" -> "2026-08-05"
}

function formatTime(datetime) {
  if (!datetime) return "";
  const time = datetime.split("T")[1];
  return time ? time.slice(0, 5) : ""; // "07:00:00" -> "07:00"
}

// CONFIRMED via AttendanceResponse.java / AttendanceMapper.java - flat
// record: attendanceId, studentName, gradeAndSection, dateTimeIn,
// dateTimeOut, attendanceStatus, confirmed. No "rfid" field, and
// gradeAndSection is one pre-combined string, not separate
// gradeLevel/section - same limitation as before.
//
// NOTE on `confirmed`: AttendanceResponse.java still declares this
// field, but Attendance.java (the entity) has NO matching property -
// the backend dropped the old confirmed-boolean model in favor of the
// 3-value attendanceStatus enum (on_school -> present, see
// AttendanceStatus.java + AttendanceService.java markAsPresent/timeOut).
// MapStruct has nothing to map `confirmed` from, so don't trust
// whatever comes back in that field - derive it from attendanceStatus
// instead. Worth flagging to backend so they either wire it up or drop
// it from the DTO.
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

// Attaches the HTTP status (and the backend's own error message, when it
// sends a JSON body - see ApplicationException subclasses like
// AlreadyHasARecord/AttendanceNotFound/AttendanceAlreadyConfirmed/
// AttendanceNotConfirmed/AlreadyTimedOut/AssignmentNotFound) to the
// thrown Error, so callers can branch on specific failures instead of
// only ever getting a generic "request failed".
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

/* =========================================================================
 * ATTENDANCE SCREEN (RFID tap flow) - CONFIRMED against
 * AttendanceController.java / AttendanceService.java. All three
 * endpoints below are rfid-keyed and exist on the backend today.
 *
 * UPDATED per the latest backend pull: the old "confirm" endpoint/
 * terminology is gone. The status model is now the 3-value
 * AttendanceStatus enum (on_school / present / absent), not a
 * confirmed boolean.
 *
 * REAL-WORLD SHAPE OF THE FLOW:
 *   1. GUARD taps at the gate  -> POST /api/attendance        (creates
 *      the record, status=on_school, dateTimeOut=null)
 *   2. TEACHER'S SCANNER tap   -> PATCH /api/attendance/present (sets
 *      status=present - this is what Rfidattendancepage.jsx now does.
 *      Was PATCH /api/attendance/confirm before this pull - renamed.)
 *   3. Either scanner, later   -> PATCH /api/attendance/time-out
 *      (requires status=present first - throws NoClassromTap (400) if
 *      still on_school, i.e. never went through step 2)
 *
 * There is no guard-side page yet, so timeInAttendance() below (the
 * "create" call) currently has no caller in this codebase - it's kept
 * here ready for whenever that guard kiosk gets built.
 * ========================================================================= */

// POST /api/attendance - the RFID "time in" tap (GUARD side). Body:
// { rfid }. Creates a new row (dateTimeIn = server "now", status =
// on_school) if this assignment has no record yet today, or throws
// 409 (AlreadyHasARecord) if one already exists.
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

// PATCH /api/attendance/present. Body: { rfid }. Finds TODAY's record
// for that rfid and sets attendanceStatus = present (this is the
// "student tapped at the guard gate" -> "adviser/teacher marked
// present" step, done by a tap on the TEACHER'S scanner).
// RENAMED from PATCH /api/attendance/confirm in the latest backend
// pull - path and semantics both changed (status enum instead of a
// confirmed boolean). Throws 400 (AlreadyMarkedPresent) if
// attendanceStatus is already present, 404 (AttendanceNotFound) if
// there's no record for today yet, and 404 (AssignmentNotFound) if the
// rfid doesn't match an active assignment.
export async function markAttendancePresent(rfid) {
  const response = await fetch(`${BASE_URL}/attendance/present`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfid }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, "PATCH /api/attendance/present");
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}

// PATCH /api/attendance/time-out. Body: { rfid }. Throws 400
// (NoClassromTap) if attendanceStatus is still on_school (i.e. never
// marked present - renamed from the old AttendanceNotConfirmed check),
// 400 (AlreadyTimedOut) if dateTimeOut is already set, 404
// (AttendanceNotFound)/(AssignmentNotFound) same as above.
export async function timeOutAttendance(rfid) {
  const response = await fetch(`${BASE_URL}/attendance/time-out`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfid }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, "PATCH /api/attendance/time-out");
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}

/* =========================================================================
 * STUDENT RECORD (adviser-side table) - BLOCKED. None of the functions
 * below have a real backend endpoint yet - AttendanceController.java
 * only exposes the three rfid-keyed endpoints above. Everything here
 * is mocked so the UI/interactions can be built now; every CONNECT
 * comment marks exactly what the backend still needs to expose.
 *
 * This mock store (MOCK_STUDENTS) is also read/written by the RFID
 * scanner screen's teacherScannerTap()/findEnrolledStudentByRfid()
 * below, so a tap on the Attendance Screen tab and an action in the
 * Student Record tab stay in sync while there's no real backend yet.
 * ========================================================================= */

// TODO: mock only, stands in for GET /api/student-section-assignment
// (or similar) until it exists. Shape matches what the Student Record
// table + action modals need: base student info plus "todayAttendance"
// (null when the student hasn't tapped/been marked yet today).
//
// UPDATED per the latest backend pull: status is now one of "On
// School" / "Present" / "Absent" (mirrors AttendanceStatus.java's
// on_school/present/absent), and the separate isConfirmed boolean is
// gone - "On School" itself now means "guard tapped in, not yet
// present". assignmentId 6 (Athena) is seeded at "On School" on
// purpose to keep that state testable without a real guard page.
let MOCK_STUDENTS = [
  {
    assignmentId: 1,
    lrn: "090941037",
    rfid: "090941037",
    name: "Yuri Sakazaki",
    gradeLevel: "Grade 4",
    section: "Apple",
    todayAttendance: null, // no record yet -> Present / Absent buttons
  },
  {
    assignmentId: 2,
    lrn: "090941038",
    rfid: "090941038",
    name: "Kyo Kusanagi",
    gradeLevel: "Grade 4",
    section: "Rose",
    todayAttendance: {
      id: 101,
      status: "Present",
      timeIn: "07:05",
      timeOut: null, // present, not timed out yet -> Time out button
    },
  },
  {
    assignmentId: 4,
    lrn: "090941040",
    rfid: "090941040",
    name: "Juan Dela Cruz",
    gradeLevel: "Grade 4",
    section: "Rose",
    todayAttendance: {
      id: 102,
      status: "Present",
      timeIn: "07:02",
      timeOut: "16:10", // fully done -> "..." kebab
    },
  },
  {
    assignmentId: 5,
    lrn: "090941041",
    rfid: "090941041",
    name: "Maria Santos",
    gradeLevel: "Grade 4",
    section: "Apple",
    todayAttendance: {
      id: 103,
      status: "Absent",
      timeIn: null,
      timeOut: null, // absent for today -> "..." kebab
    },
  },
  {
    assignmentId: 6,
    lrn: "090941042",
    rfid: "090941042",
    name: "Athena Asamiya",
    gradeLevel: "Grade 4",
    section: "Apple",
    todayAttendance: {
      id: 104,
      status: "On School", // guard tapped her in, no time-in with the teacher yet
      timeIn: null,
      timeOut: null,
    },
  },
];

// Derives which action the row should show. Used by AttendanceTable so
// the "what button do I render" logic lives in one place instead of
// being re-guessed per component.
//
//   needs-status        -> no record at all today -> Present / Absent
//   needs-present       -> guard already tapped this student in
//                          (status = "On School") -> Mark Present /
//                          Mark Absent buttons (real present tap
//                          normally happens via the teacher's scanner -
//                          this is the manual fallback for a lost/
//                          forgotten card, or for closing out anyone
//                          left on_school once attendance-checking for
//                          the period is done - see
//                          markRemainingAsAbsent() below for the bulk
//                          version of that second case)
//   needs-timeout       -> present, no time out yet -> Time out button
//   done                -> present + timed out, OR marked absent
export function getRowActionState(todayAttendance) {
  if (!todayAttendance) return "needs-status";
  if (todayAttendance.status === "On School") return "needs-present";
  if (todayAttendance.status === "Present" && !todayAttendance.timeOut) {
    return "needs-timeout";
  }
  return "done";
}

// TODO: BACKEND CONNECTION
// CONNECT: GET /api/student-section-assignment?adviserId={id}&gradeLevel={}&section={}&search={}&page={}
// Should return enrolled students for sections this adviser handles,
// each with today's attendance record (or null) embedded/joined -
// same shape as MOCK_STUDENTS above.
export async function fetchStudentRecords({
  page = 1,
  level = "",
  section = "",
  search = "",
} = {}) {
  await new Promise((resolve) => setTimeout(resolve, 300)); // simulate latency

  const filtered = MOCK_STUDENTS.filter((student) => {
    const matchesLevel = !level || student.gradeLevel === level;
    const matchesSection = !section || student.section === section;
    const matchesSearch =
      !search ||
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.lrn.includes(search);
    return matchesLevel && matchesSection && matchesSearch;
  });

  return { records: filtered, totalPages: 1, currentPage: page };
}

// TODO: BACKEND CONNECTION
// CONNECT: POST /api/attendance/manual (or similar)
// Body: { assignmentId, timeIn }
// This is the adviser clicking "Present" and picking a time in, for a
// student who has NO record yet today at all (walk-in / forgot card /
// guard never caught them). Unlike the rfid flow this jumps straight
// to status = present - a person is entering it directly, there's no
// on_school stage to pass through first.
export async function markPresentManual(assignmentId, timeIn) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const student = MOCK_STUDENTS.find((s) => s.assignmentId === assignmentId);
  if (!student) throw new Error("Student not found");

  student.todayAttendance = {
    id: Date.now(),
    status: "Present",
    timeIn,
    timeOut: null,
  };
  return { ...student };
}

// TODO: BACKEND CONNECTION
// CONNECT: PATCH /api/attendance/manual-present (or similar,
// assignmentId-keyed). Does NOT exist on the backend yet - only PATCH
// /api/attendance/present (rfid-keyed, meant for an actual tap on the
// teacher's scanner) exists today. This is the manual fallback for
// when a guard-tapped ("On School") record is sitting with no time-in
// and the student can't tap the teacher's scanner (lost card, scanner
// down, etc). RENAMED from confirmManual() - matches the backend's
// confirm -> present rename.
export async function markPresentFromOnSchool(assignmentId) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const student = MOCK_STUDENTS.find((s) => s.assignmentId === assignmentId);
  if (!student || !student.todayAttendance) throw new Error("No record to mark present");

  const now = new Date();
  const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  student.todayAttendance = {
    ...student.todayAttendance,
    status: "Present",
    timeIn: student.todayAttendance.timeIn ?? nowHHmm,
  };
  return { ...student };
}

// TODO: BACKEND CONNECTION
// CONNECT: POST /api/attendance/manual-absent (or similar)
// Body: { assignmentId }
// Adviser clicking "Absent" - covers both a student with no record at
// all today, AND a student stuck at "On School" (guard tapped in, but
// never got a time-in with the teacher) - see getRowActionState's
// "needs-status" and "needs-present" states.
export async function markAbsentManual(assignmentId) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const student = MOCK_STUDENTS.find((s) => s.assignmentId === assignmentId);
  if (!student) throw new Error("Student not found");

  student.todayAttendance = {
    id: Date.now(),
    status: "Absent",
    timeIn: null,
    timeOut: null,
  };
  return { ...student };
}

// TODO: BACKEND CONNECTION
// CONNECT: PATCH /api/attendance/{attendanceId}/time-out (or similar,
// keyed by attendanceId/assignmentId instead of rfid - the adviser
// doesn't have the student's card in hand when clicking this in the
// table). Fires immediately with "now" as dateTimeOut, no modal.
export async function manualTimeOut(assignmentId) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const student = MOCK_STUDENTS.find((s) => s.assignmentId === assignmentId);
  if (!student || !student.todayAttendance) throw new Error("No record to time out");

  const now = new Date();
  const timeOut = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  student.todayAttendance = { ...student.todayAttendance, timeOut };
  return { ...student };
}

/* =========================================================================
 * TEACHER SCANNER (Attendance Screen tab / Rfidattendancepage.jsx) -
 * mock tap state machine, shares MOCK_STUDENTS above with the Student
 * Record tab so both views stay consistent while there's no real
 * backend or guard page yet.
 *
 * This mirrors what the real backend flow will do once wired up:
 *   no record today            -> can't create it here; only the GUARD's
 *                                  tap (POST /api/attendance) creates a
 *                                  record - this returns "no-record" so
 *                                  the UI can say "not timed in yet"
 *   record exists, unconfirmed -> tap = PATCH /api/attendance/confirm
 *   confirmed, no time out     -> tap = PATCH /api/attendance/time-out
 *   confirmed + timed out      -> tap = no-op, just re-show the record
 * ========================================================================= */

export function findEnrolledStudentByRfid(rfid) {
  const student = MOCK_STUDENTS.find((s) => s.rfid === rfid);
  return student ? { ...student } : null;
}

// Manual fallback search for Rfidattendancepage.jsx's "card lost/broken"
// flow - teacher types a name or LRN instead of tapping the scanner.
// Synchronous (called directly, no await at the call site) and matches
// on name OR lrn, case-insensitive substring. Same MOCK_STUDENTS source
// as everything else here, so results stay consistent with the Student
// Record tab.
//
// TODO: BACKEND CONNECTION - real version likely becomes
// GET /api/students/search?q={query} (debounced), returning the same
// shape used below (rfid, lrn, name, gradeLevel, section).
export function searchEnrolledStudents(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return MOCK_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(normalized) ||
      s.lrn.toLowerCase().includes(normalized)
  ).map((s) => ({ ...s }));
}

// TODO: BACKEND CONNECTION - real version calls PATCH
// /api/attendance/confirm or PATCH /api/attendance/time-out depending
// on server-side record state; the server decides which one applies,
// this mock just replicates that decision locally for now.
export async function teacherScannerTap(rfid) {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const student = MOCK_STUDENTS.find((s) => s.rfid === rfid);
  if (!student) {
    return { action: "unrecognized", student: null };
  }

  if (!student.todayAttendance) {
    return { action: "no-record", student: { ...student } };
  }

  if (student.todayAttendance.status === "On School") {
    student.todayAttendance = { ...student.todayAttendance, status: "Present" };
    return { action: "present", student: { ...student } };
  }

  if (!student.todayAttendance.timeOut) {
    const now = new Date();
    const timeOut = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    student.todayAttendance = { ...student.todayAttendance, timeOut };
    return { action: "timed-out", student: { ...student } };
  }

  return { action: "already-done", student: { ...student } };
}

// TODO: BACKEND CONNECTION
// CONNECT: PATCH /api/attendance/mark-remaining-absent (or similar) -
// bulk action, no body needed (server just works off "today"). Real
// equivalent: find every row still stuck at attendanceStatus =
// on_school for today (guard tapped them in via POST /api/attendance,
// but they never got the PATCH /api/attendance/present tap from the
// teacher's scanner) and set attendanceStatus = absent on all of them
// in one shot.
//
// This is the button the teacher taps once they're done checking
// attendance for the period - anyone still sitting at "on school" past
// that point gets marked absent instead of staying in limbo forever.
export async function markRemainingAsAbsent() {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const affected = MOCK_STUDENTS.filter(
    (s) => s.todayAttendance?.status === "On School"
  );

  affected.forEach((student) => {
    student.todayAttendance = {
      ...student.todayAttendance,
      status: "Absent",
      timeIn: null,
      timeOut: null,
    };
  });

  return affected.map((s) => ({ ...s }));
}

// Read-only feed for the Attendance Screen tab - "who's been tapped in
// so far today", no edit affordances (that's the Student Record tab's
// job). Just the students who already have a record today.
export async function fetchTodaysActivity() {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return MOCK_STUDENTS.filter((s) => s.todayAttendance).map((s) => ({ ...s }));
}

/* =========================================================================
 * SECTIONS - CONFIRMED, unchanged from before.
 * ========================================================================= */

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