import React from "react";

// Maps keywords found in logHeader to a short label + color, so this stays
// flexible for whatever action types eventually come from the backend
// (not just section actions) instead of hardcoding one entry per exact
// header string. Checked in order, first match wins.
const ACTION_STYLES = [
  { match: "archived", label: "Archived", colorClass: "text-secondary" },
  { match: "dropped", label: "Dropped", colorClass: "text-secondary" },
  { match: "transferred", label: "Transferred", colorClass: "text-warning" },
  { match: "activated", label: "Activated", colorClass: "text-success" },
  { match: "enrolled", label: "Enrolled", colorClass: "text-success" },
  { match: "created", label: "Added", colorClass: "text-success" },
  { match: "added", label: "Added", colorClass: "text-success" },
  { match: "updated", label: "Updated", colorClass: "text-primary" },
  { match: "started", label: "Started", colorClass: "text-primary" },
];

function getLogVisual(logHeader) {
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

        return (
          <div
            key={log.logId}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3"
          >
            <span className={`shrink-0 text-sm font-bold ${colorClass}`}>{label}:</span>
            <p className="text-sm text-gray-600">{log.logDescription}</p>

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