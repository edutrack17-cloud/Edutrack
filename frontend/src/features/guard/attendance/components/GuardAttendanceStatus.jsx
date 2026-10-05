
const STATUS_STYLES = {
  "On School": "text-warning",
  Present: "text-success",
  Absent: "text-danger",
};

function GuardAttendanceStatus({ status }) {
  const colorClass = STATUS_STYLES[status] || "text-gray-500";

  return (
    <span className={`text-sm font-semibold ${colorClass}`}>{status}</span>
  );
}

export default GuardAttendanceStatus;