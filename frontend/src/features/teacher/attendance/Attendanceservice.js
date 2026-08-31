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

// ManualAttendanceRequest.java's dateTimeIn is a full LocalDateTime, not
// just a clock time - Jackson's default LocalDateTime format is
// "yyyy-MM-dd'T'HH:mm:ss", so the "HH:mm" ManualTimeModal hands back has
// to be stitched onto today's date before it's sent. A manual entry is
// always for "today" (there's no date picker in that modal), so "now"'s
// date is always correct here.
function buildTodayDateTimeISO(hhmm) {
  const [hours, minutes] = hhmm.split(":");
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hours}:${minutes}:00`;
}

// CONFIRMED via AttendanceResponse.java / AttendanceMapper.java - flat record: attendanceId, studentName, gradeAndSection, dateTimeIn, dateTimeOut, attendanceStatus. No "rfid" field, no "confirmed" field (dropped from the DTO), and gradeAndSection is one pre-combined string, not separate gradeLevel/section.
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

// CONFIRMED via StudentController.java / StudentService.java - GET
// /api/student?gradeLevel=&sectionName=&studentStatus=&studentName=&page=&size=
// is real: filtered, paginated, built off
// StudentSectionAssignmentSpecification (same isCurrent()/leftAt-is-null
// pattern the attendance side uses). This is the roster HALF of what
// this function needs - but only the roster half. There is still no
// GET endpoint anywhere on the attendance side (AttendanceController.java
// has zero @GetMapping methods), so there's nothing to join in for
// "today's" attendance per student - every row below comes back with
// todayAttendance: null (== "no record yet", per getRowActionState)
// regardless of what actually happened today. Once an attendance GET
// endpoint ships, that's a second fetch to merge in here by studentId.
//
// IMPORTANT: studentStatus here is StudentStatus.java
// (enrolled/dropped/transferred_out/graduated) - a completely
// different thing from the "Present / On School / Absent" status
// dropdown in AttendaceFilters.jsx, which is about TODAY's attendance,
// not enrollment. Sending that dropdown's value as studentStatus would
// silently break the query ("Present" isn't a valid StudentStatus), so
// it's never sent - this always hard-codes studentStatus=enrolled
// (attendance-taking should never surface dropped/graduated/transferred
// students), and the Present/On School/Absent filter stays client-side
// against todayAttendance, same as AttendanceTable.jsx already does as
// a fallback.
//
// StudentResponse.java has NO assignmentId field (that FK is never
// exposed) - studentId is the real id, and it's ALSO what the manual
// attendance endpoints (POST /api/attendance/manual/{studentId}, PATCH
// /api/attendance/manual-timeout/{studentId}) key off. assignmentId is
// set equal to studentId below purely so AttendanceTable.jsx's existing
// record.assignmentId reads (used only as a row key / pending-state
// key) don't need to change.
//
// GUESS, unconfirmed: SectionResponse.java's gradeLevel shape wasn't in
// this pull, so its exact casing ("Grade_4" vs "grade_4" vs "GRADE_4")
// is assumed here via a loose regex rather than an exact enum map -
// flag to backend if grade level ends up blank in the table.
function formatGradeLevelLabel(gradeLevel) {
  if (!gradeLevel) return "";
  const match = /grade[_\s]?(\d+)/i.exec(String(gradeLevel));
  return match ? `Grade ${match[1]}` : String(gradeLevel);
}

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
  params.set("page", String(page - 1)); // Spring Pageable is 0-indexed
  params.set("size", "20");

  const response = await fetch(`${BASE_URL}/student?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`GET /api/student failed (${response.status})`);
  }

  const pageData = await response.json();
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
}
// NO LONGER used by fetchStudentRecords() above - that now hits the
// real GET /api/student roster (see the big comment there). This array
// is kept only for the Attendance Screen tab (Rfidattendancepage.jsx)
// and its mocked functions further down this file
// (teacherScannerTap/findEnrolledStudentByRfid/searchEnrolledStudents/
// fetchTodaysActivity/markRemainingAsAbsent), which have no real
// backend to hit at all yet (no GET on the attendance side) and so
// stay on this fake roster for now. The two rosters will disagree with
// each other (different ids, different students) until the Attendance
// Screen tab also moves onto the real student list + a real attendance
// GET endpoint.
let MOCK_STUDENTS = [
  {
    assignmentId: 1,
    studentId: 201,
    lrn: "090941037",
    rfid: "090941037",
    name: "Yuri Sakazaki",
    gradeLevel: "Grade 4",
    section: "Apple",
    todayAttendance: null, // no record yet -> Present / Absent buttons
  },
  {
    assignmentId: 2,
    studentId: 202,
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
    studentId: 204,
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
    studentId: 205,
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
    studentId: 206,
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

// The real fetchStudentRecords() is defined above, right after
// MOCK_STUDENTS was still being used for it - see the big comment
// there for what's real (roster/filter/pagination via GET /api/student)
// vs still blocked (today's attendance per student).

// CONFIRMED via AttendanceController.java - POST /api/attendance/manual/{studentId}.
// Body: ManualAttendanceRequest, i.e. { dateTimeIn }. This is the
// adviser clicking "Present" and picking a time in, for a student who
// has NO record yet today at all (walk-in / forgot card / guard never
// caught them). Unlike the rfid flow this jumps straight to status =
// present (AttendanceService.manualAttendance) - a person is entering
// it directly, there's no on_school stage to pass through first.
//
// KEYED BY studentId, NOT assignmentId - AttendanceService looks the
// student's current assignment up itself
// (findAssignmentByStudentId -> findByStudent_StudentIdAndLeftAtIsNull).
// The Student Record roster (MOCK_STUDENTS today, GET
// /api/student-section-assignment eventually) needs a studentId field
// on each row for this to work - added here as `studentId`.
//
// Response is an AttendanceResponse - attendanceId/studentName/
// gradeAndSection/dateTimeIn/dateTimeOut/attendanceStatus only, no
// assignmentId/studentId echoed back. The caller (AttendancePage.jsx)
// already knows which row this was for from the click that opened the
// modal, so it merges the returned fields into that row itself rather
// than matching on anything in the response.
export async function markPresentManual(studentId, timeIn) {
  const dateTimeIn = buildTodayDateTimeISO(timeIn);

  const response = await fetch(`${BASE_URL}/attendance/manual/${studentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dateTimeIn }),
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, `POST /api/attendance/manual/${studentId}`);
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
}

// STILL BLOCKED after this pull - checked AttendanceController.java/
// AttendanceService.java and there is still no studentId/assignmentId
// -keyed way to flip an "On School" record to "Present". The only
// present-marking endpoint that exists is PATCH /api/attendance/present,
// and it's hard-keyed to rfid (TimeInAndOutAttendanceRequest) - it
// re-looks-up the assignment by
// findByStudent_RfidAndLeftAtIsNull(request.rfid()), there's no
// overload that takes an id instead. So this manual fallback (student
// can't tap the teacher's scanner - lost card, scanner down, etc) has
// nothing to call yet. Worth flagging to backend: either a
// PATCH /api/attendance/manual-present/{studentId} companion to the
// manual/{studentId} time-in endpoint, or accept an optional id on the
// existing present request.
//
// No longer faked against MOCK_STUDENTS either - now that
// fetchStudentRecords() returns the REAL roster (real studentIds from
// GET /api/student), a row passed in here won't exist in MOCK_STUDENTS
// at all, so a silent mock "success" would be actively misleading.
// Fails loudly instead until there's something real to call.
export async function markPresentFromOnSchool(assignmentId) {
  throw new Error(
    "Marking present from On School isn't available on the backend yet - see the comment on markPresentFromOnSchool() in Attendanceservice.js."
  );
}

// STILL BLOCKED after this pull. AttendanceController.java only gained
// two new endpoints this time: POST /api/attendance/manual/{studentId}
// (present, wired up above) and PATCH
// /api/attendance/manual-timeout/{studentId} (wired up below). There is
// still no single-student "mark this one absent" endpoint - the only
// absent-marking capability in AttendanceService is bulkMarkAsAbsent(),
// which is section-wide (POST /api/attendance/close-attendance?sectionName=)
// and - per its actual logic - only creates absent rows for students
// with ZERO attendance record for the day. It does NOT flip an existing
// "On School" record to absent, so it can't cover the "needs-present"
// case either, only "needs-status". Keeping this mocked and flagging to
// backend: needs either a single-student absent endpoint, or
// bulkMarkAsAbsent needs to also sweep existing on_school rows to
// absent (right now those get silently skipped since they already
// "have a record").
// Adviser clicking "Absent" - covers both a student with no record at
// all today, AND a student stuck at "On School" (guard tapped in, but
// never got a time-in with the teacher) - see getRowActionState's
// "needs-status" and "needs-present" states.
//
// No longer faked against MOCK_STUDENTS either - same reasoning as
// markPresentFromOnSchool() above: real roster rows (from GET
// /api/student) won't exist in that fake array, so this fails loudly
// now instead of pretending to succeed.
export async function markAbsentManual(assignmentId) {
  throw new Error(
    "Marking a single student absent isn't available on the backend yet - see the comment on markAbsentManual() in Attendanceservice.js."
  );
}

// CONFIRMED via AttendanceController.java - PATCH
// /api/attendance/manual-timeout/{studentId}. No request body - the
// server just stamps dateTimeOut = now on that student's today record
// (AttendanceService.manualTimeOut). Fires immediately, no modal, same
// as before.
//
// KEYED BY studentId, same caveat as markPresentManual above. Throws
// 400 (NoClassromTap) if the record is still "on_school" (never got a
// time-in), 400 (AlreadyTimedOut) if dateTimeOut is already set, 404
// (AssignmentNotFound) if there's no record for today at all.
export async function manualTimeOut(studentId) {
  const response = await fetch(`${BASE_URL}/attendance/manual-timeout/${studentId}`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, `PATCH /api/attendance/manual-timeout/${studentId}`);
  }

  const data = await response.json();
  return mapAttendanceRecord(data);
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

// STILL BLOCKED for this button specifically, even though a real bulk
// endpoint now exists: POST /api/attendance/close-attendance?sectionName=
// (AttendanceController.bulkMarkAsAbsent). Two mismatches against what
// this button needs:
//   1. It's SECTION-scoped (sectionName is a required query param), but
//      this "Mark Remaining as Absent" button lives on the teacher
//      scanner screen with no section context at all - it's meant to
//      sweep everyone, across every section, in one tap.
//   2. Per AttendanceService.bulkMarkAsAbsent's actual logic, it only
//      creates absent rows for students with NO attendance record at
//      all today. A guard-tapped "On School" row already has a record
//      (just the wrong status), so it's excluded, not flipped to
//      absent - the opposite of what this button is for.
// Wired up closeAttendanceForSection() below against the real endpoint
// for whenever a section-scoped bulk-absent UI gets built, but this
// specific global button stays mocked. Flagging both points to backend.
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

// CONFIRMED via AttendanceController.java - POST
// /api/attendance/close-attendance?sectionName={sectionName}. No body.
// Creates an "absent" row for every currently-enrolled student in that
// section with NO attendance record yet today (see the semantics
// caveat on markRemainingAsAbsent above - this does NOT touch existing
// "On School" rows). Returns a List<AttendanceResponse>. Not called
// from anywhere in this file yet - kept ready for whenever a
// section-scoped "close attendance" action gets built (e.g. an
// adviser closing out their own section from the Student Record tab).
export async function closeAttendanceForSection(sectionName) {
  const params = new URLSearchParams({ sectionName });

  const response = await fetch(`${BASE_URL}/attendance/close-attendance?${params.toString()}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw await buildAttendanceError(response, "POST /api/attendance/close-attendance");
  }

  const data = await response.json();
  return (Array.isArray(data) ? data : []).map(mapAttendanceRecord);
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