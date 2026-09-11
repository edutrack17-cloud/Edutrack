import React, { useEffect, useState } from "react";
import { X, GraduationCap, UserX, Shuffle, ArrowUpCircle, Repeat, Clock } from "lucide-react";
import { getStudentHistory } from "../enrollmentService";

const ADMISSION_TYPE_LABELS = {
  regular: "Regular",
  transferred_in: "Transferred In",
};

// Matches the exitType enum GET /api/student/{id}/history returns:
// promoted | dropped | transferred_out | section_transfer | graduated
// (null on the current/active row). Icon/color pairs reuse the same
// ones StudentTable's kebab menu already uses for dropped/transferred/
// graduated, so a given status reads the same wherever it shows up.
const EXIT_TYPE_META = {
  promoted: { label: "Promoted", icon: ArrowUpCircle, colorClass: "text-primary" },
  dropped: { label: "Dropped", icon: UserX, colorClass: "text-danger" },
  transferred_out: { label: "Transferred Out", icon: Shuffle, colorClass: "text-warning" },
  section_transfer: { label: "Section Transfer", icon: Repeat, colorClass: "text-gray-600" },
  graduated: { label: "Graduated", icon: GraduationCap, colorClass: "text-primary" },
};

function formatGradeLevel(gradeLevel) {
  if (!gradeLevel) return "";
  return gradeLevel.replace("_", " ");
}

// History entries come back as plain "YYYY-MM-DD" strings. Parsing that
// straight into `new Date(...)` reads it as UTC midnight, which can
// display as the PREVIOUS day once the browser converts it to a
// negative-UTC-offset local time (e.g. anywhere in the Philippines/US) -
// so this builds the Date from the parsed parts in local time instead.
function formatHistoryDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-sm text-gray-500">{value || "—"}</p>
    </div>
  );
}

// Vertical timeline, most-recent-first (the order the endpoint already
// returns them in - no client-side re-sort). The top entry is the
// student's current assignment when leftAt is null; every entry below
// that is a past assignment with its own exitType.
//
// studentStatus (StudentResponse.studentStatus, passed down from the
// `student` prop that's already in scope where this is rendered) is
// used to catch a data gap: some Dropped/Transferred Out/Graduated
// students were marked that way before dropStudent()/transferOutStudent()/
// graduateStudent() started closing out the assignment row itself, so
// their top assignment can still have leftAt === null even though the
// STUDENT is no longer enrolled. Treating that as "Current" is wrong -
// so the top entry only counts as current when leftAt is null AND the
// student's own status agrees with that. Otherwise it falls back to
// studentStatus for the label/icon/color (dropped/transferred_out/
// graduated share their exact string values with ExitType, so the same
// EXIT_TYPE_META lookup covers both). This can only fix the LABEL,
// though - the real leftAt date and remarks were genuinely never
// recorded for these older rows, so both are shown as "not recorded"
// rather than guessed at. A proper fix (backfilling the real leftAt/
// exitType on those old assignment rows) is a backend/data job.
function HistoryTimeline({ entries, studentStatus }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">No section history yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-5">
      {entries.map((entry, index) => {
        const isStaleOpenAssignment =
          index === 0 &&
          entry.leftAt === null &&
          studentStatus &&
          studentStatus !== "enrolled";

        const isCurrent = entry.leftAt === null && !isStaleOpenAssignment;

        const meta = isStaleOpenAssignment
          ? EXIT_TYPE_META[studentStatus]
          : entry.exitType
          ? EXIT_TYPE_META[entry.exitType]
          : null;
        const Icon = meta?.icon ?? Clock;
        const iconColorClass = isCurrent ? "text-success" : (meta?.colorClass ?? "text-gray-600");

        return (
          <li key={`${entry.sectionName}-${entry.assignedAt}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 ${iconColorClass}`}>
                <Icon size={16} />
              </span>
              {index < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-gray-200" />}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">
                  {entry.sectionName} · {formatGradeLevel(entry.gradeLevel)}
                </p>
                {isCurrent ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    Current
                  </span>
                ) : (
                  <span className={`rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold ${meta?.colorClass ?? "text-gray-600"}`}>
                    {meta?.label ?? entry.exitType ?? studentStatus}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Assigned {formatHistoryDate(entry.assignedAt)}
                {" · "}
                {isCurrent
                  ? "Present"
                  : entry.leftAt
                  ? `Left At ${formatHistoryDate(entry.leftAt)}`
                  : "Left At — not recorded"}
              </p>
              {/* Remarks is only collected for exits (Dropped/Transferred
                  Out today - see StatusDetailsModal), so it's skipped for
                  the current/active row, which has no exitType at all.
                  Unlike before, this now always renders for past rows
                  instead of disappearing when entry.remarks is empty/null -
                  a blank "No remarks recorded" here is a visible signal
                  that the backend didn't send remarks for that row, rather
                  than looking like the History tab never had a Remarks
                  field in the first place. */}
              {!isCurrent && (
                <p className="mt-1 text-xs text-gray-500">
                  <span className="font-semibold text-gray-600">Remarks:</span>{" "}
                  <span className="italic">{entry.remarks || "No remarks recorded"}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ViewStudentModal({ isOpen, onClose, student }) {
  // BACKEND NOTE: there is still no GET /api/student/{id} single-record
  // endpoint, so the Details tab below displays whatever StudentResponse
  // object is already sitting in StudentTable's local state (from the
  // last GET /api/student list load) rather than re-fetching fresh data.
  // The new History tab is different - GET /api/student/{id}/history is
  // a real per-student endpoint, so that one IS fetched fresh below.
  const [activeTab, setActiveTab] = useState("details");
  const [history, setHistory] = useState(null); // null = not fetched yet for this student/open
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  // Bumped by the "Try again" link on a failed fetch - history/
  // historyError alone don't change on retry (they're reset back to
  // their same "not loaded" values), so this is what actually forces
  // the effect below to re-run.
  const [historyRetryCount, setHistoryRetryCount] = useState(0);

  // Reset tab + history state whenever a DIFFERENT student is being
  // viewed. Without this, opening Student B right after Student A (this
  // modal gets reused, not remounted, across rows) could keep showing
  // A's already-loaded History tab/data under B's name for a moment.
  useEffect(() => {
    setActiveTab("details");
    setHistory(null);
    setHistoryError("");
    setHistoryRetryCount(0);
  }, [student?.studentId]);

  // Lazy: only fetches once the History tab is actually opened (not on
  // every "View" click), and only once per student - toggling back to
  // Details and returning to History doesn't refetch. This keeps this
  // read-only, occasionally-viewed endpoint off the same shared rate-
  // limit bucket getStudents()/getSections() etc. already compete for.
  useEffect(() => {
    if (!isOpen || activeTab !== "history" || !student?.studentId) return;
    if (history !== null) return;

    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryError("");

    getStudentHistory(student.studentId)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, student?.studentId, history, historyRetryCount]);

  if (!isOpen || !student) return null;

  const admissionTypeLabel =
    ADMISSION_TYPE_LABELS[student.admissionType] || student.admissionType;

  const tabClass = (tab) =>
    `flex-1 cursor-pointer border-b-2 py-2.5 text-center text-sm font-semibold transition-colors ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Student Information
          </h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex shrink-0 border-b border-gray-200 px-4 sm:px-6">
          <button type="button" onClick={() => setActiveTab("details")} className={tabClass("details")}>
            Details
          </button>
          <button type="button" onClick={() => setActiveTab("history")} className={tabClass("history")}>
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {activeTab === "details" ? (
            <div className="flex flex-col gap-7">
              <div>
                <h3 className="mb-4 text-sm font-bold tracking-wide text-primary uppercase">
                  Enrollment Information
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                  <InfoField label="Level" value={formatGradeLevel(student.section?.gradeLevel)} />
                  <InfoField label="Section" value={student.section?.sectionName} />
                  <InfoField label="LRN" value={student.lrn} />
                  <InfoField label="RFID UID" value={student.rfid} />
                  <InfoField label="Admission Type" value={admissionTypeLabel} />
                </div>
              </div>

              <div>
                <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
                  Student Information
                </h3>
                {/* StudentResponse only exposes a single combined "fullName",
                    not separate first/middle/last, so that's all we can show
                    here until the backend exposes them individually. */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                  <InfoField label="Name" value={student.fullName} />
                  <InfoField label="Sex" value={student.sex} />
                  <InfoField label="Birthdate" value={student.birthDate} />
                </div>
              </div>

              <div>
                <h3 className="mb-4 mt-2 text-sm font-bold tracking-wide text-primary uppercase">
                  Parent / Guardian Information
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                  <InfoField label="Guardian Name" value={student.guardian} />
                  <InfoField label="Guardian Mobile Number" value={student.guardianPhoneNumber} />
                </div>
              </div>
            </div>
          ) : (
            <>
              {isLoadingHistory && (
                <p className="py-6 text-center text-sm text-gray-500">Loading history...</p>
              )}

              {!isLoadingHistory && historyError && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-sm text-danger">{historyError}</p>
                  <button
                    type="button"
                    onClick={() => setHistoryRetryCount((count) => count + 1)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!isLoadingHistory && !historyError && history !== null && (
                <HistoryTimeline entries={history} studentStatus={student.studentStatus} />
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewStudentModal;