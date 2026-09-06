import RFIDAttendancePage from "./Rfidattendancepage";

function AttendancePage() {
  return (
    <div className="font-primary flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6 -mt-4">
      <RFIDAttendancePage />
    </div>
  );
}

export default AttendancePage;