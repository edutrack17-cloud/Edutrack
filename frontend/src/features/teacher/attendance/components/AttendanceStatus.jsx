import React from "react";
const STATUS_STYLES = {
  "On School": "text-warning",
  Present: "text-success",
  Absent: "text-danger",
};

function AttendanceStatus({ status }) {
  const colorClass = STATUS_STYLES[status] || "text-gray-500";

  return (
    <span className={`text-base font-semibold ${colorClass}`}>{status}</span>
  );
}

export default AttendanceStatus;