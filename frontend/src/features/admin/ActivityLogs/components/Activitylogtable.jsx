

// Maps keywords found in logHeader to a short label + color, so this stays
// flexible for whatever action types eventually come from the backend
// (not just section actions) instead of hardcoding one entry per exact
// header string. Checked in order, first match wins.
//
// Activitylogheaderfilter.jsx imports getLogVisual from here, so a filter's
// dropdown color always matches the color its logs render with in the feed.
const ACTION_STYLES = [
  { match: "archived", label: "Archived", colorClass: "text-secondary" },
  { match: "dropped", label: "Dropped", colorClass: "text-danger" },
  { match: "absent", label: "Marked Absent", colorClass: "text-warning" },
  { match: "transferred", label: "Transferred", colorClass: "text-warning" },
  { match: "transfer", label: "Section Transfer", colorClass: "text-warning" },
  { match: "graduated", label: "Graduated", colorClass: "text-primary" },
  { match: "promoted", label: "Promoted", colorClass: "text-success" },
  { match: "activated", label: "Activated", colorClass: "text-success" },
  { match: "enrolled", label: "Enrolled", colorClass: "text-success" },
  { match: "created", label: "Added", colorClass: "text-success" },
  { match: "added", label: "Added", colorClass: "text-success" },
  { match: "attendance", label: "Manual Attendance", colorClass: "text-primary" },
  { match: "timeout", label: "Manual Timeout", colorClass: "text-primary" },
  { match: "updated", label: "Updated", colorClass: "text-primary" },
  { match: "started", label: "Started", colorClass: "text-primary" },
];

export function getLogVisual(logHeader) {
  const normalized = (logHeader || "").toLowerCase();
  const match = ACTION_STYLES.find((entry) => normalized.includes(entry.match));
  return match || { label: logHeader || "Activity", colorClass: "text-gray-700" };
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ActivityLogService.createLogRecord() (backend) bakes the actor's role +
// full name into the FRONT of logDescription itself, e.g.
// "Teacher John Doe enrolled a new student" - while ActivityLogResponse
// ALSO returns that same full name separately as userFullName
// (-> log.performedBy here, built fresh on every read by NameUtil).
// Rendered as-is, the name would show twice: once inside the sentence,
// once again in the footer. This strips that "{Teacher|Admin} {name} "
// prefix so the footer stays the single source for "who did this."
//
// performedBy is built by today's NameUtil.buildFullName() as "Last,
// First Middle". But some existing log rows were written before that
// comma/space existed (or via whatever name-builder was in place at the
// time), so the text already baked into logDescription for those rows
// instead reads "LastFirst Middle" - no comma, no space between last
// name and first name. That's baked, static text now; nothing on the
// backend can change it without a DB backfill. toLegacyGluedName()
// derives that older glued shape from today's correctly-formatted
// performedBy so the prefix gets matched (and stripped) either way it
// was written. If neither form matches (format changes again, missing
// performedBy, etc.) this is a no-op - the description just renders
// untouched, it never throws or hides text.
function toLegacyGluedName(performedBy) {
  return performedBy.replace(/,\s*/, "");
}

function stripEmbeddedActor(logDescription, performedBy) {
  if (!logDescription || !performedBy) return logDescription;
  const currentForm = escapeRegExp(performedBy);
  const legacyForm = escapeRegExp(toLegacyGluedName(performedBy));
  const pattern = new RegExp(`^(Teacher|Admin)\\s+(?:${currentForm}|${legacyForm})\\s+`, "i");
  return logDescription.replace(pattern, "");
}

// Some existing log rows also glue OTHER people's names together inside
// the body of the description itself, the same broken way - e.g.
// "CruzSofia Marie" instead of "Cruz, Sofia Marie" (seen in the
// "Students: ..." list produced when marking a batch of students
// absent). The frontend only ever receives one flat logDescription
// string, with nothing that marks where each affected person's name
// starts or ends, so there's no way to know the exact split point for
// certain - this is a best-effort display fix, not a guaranteed one.
//
// It looks for a lowercase letter directly followed by an uppercase
// letter - the same "last name touching first name" shape the old glued
// format produces - and inserts a comma there. The auto-generated
// English around it ("enrolled", "marked", "graduated", "absent",
// "Section", etc.) never has a lowercase letter immediately followed by
// an uppercase one with no space between them, so this shouldn't misfire
// on the surrounding sentence - but a real name that itself has a
// genuine internal capital (e.g. "McArthur", "DeGuzman") would get split
// incorrectly, and there's no way to detect that case from the frontend
// alone. This only patches how already-broken historical rows are
// displayed; once the backend stops baking names into logDescription and
// old rows are backfilled, this can be removed.
function insertMissingNameSeparators(text) {
  if (!text) return text;
  return text.replace(/([a-z])([A-Z])/g, "$1, $2");
}

function Activitylogtable({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500 shadow-sm">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => {
        const { label, colorClass } = getLogVisual(log.logHeader);
        const timestamp = formatTimestamp(log.createdAt);

        // Order matters: strip the actor prefix first, against the RAW
        // description (so the legacy-glued-form match above still lines
        // up exactly), then patch up any other glued names left in the
        // remaining text.
        const strippedDescription = stripEmbeddedActor(log.logDescription, log.performedBy);
        const description = insertMissingNameSeparators(strippedDescription);

        return (
          <div
            key={log.logId}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3"
          >
            <span className={`shrink-0 text-sm font-bold ${colorClass}`}>{label}:</span>
            <p className="text-sm text-gray-600">{description}</p>

            {(log.performedBy || timestamp) && (
              <p className="shrink-0 text-xs text-gray-500">
                {log.performedBy && "· "}
                {log.performedBy}
                {log.performedBy && timestamp && " · "}
                {timestamp}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Activitylogtable;