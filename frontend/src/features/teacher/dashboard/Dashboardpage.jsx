import React from "react";
import { Users, UserCheck, UserX, UserMinus } from "lucide-react";
import StatCard from "./components/Statcard";
import AttendanceChart from "./components/Attendancechart";
import DailyLogsTable from "./components/Dailylogstable";

// TODO: BACKEND CONNECTION
// GET /api/dashboard/stats
// Should return something like:
//   { totalStudents: number, presentToday: number, absentToday: number, droppedStudents: number }
//
// Where each number comes from (based on the current ERD):
//   totalStudents    -> COUNT(*) FROM students WHERE student_status = 'enrolled'
//   presentToday     -> COUNT(*) FROM attendance WHERE status = 'present' AND DATE(datetime_in) = today
//   absentToday      -> COUNT(*) FROM attendance WHERE status = 'absent' AND DATE(datetime_in) = today
//   droppedStudents  -> COUNT(*) FROM students WHERE student_status = 'dropped'
//
// These 4 replace the old 4x "Total Students Registered" placeholder.
// Each one maps directly to a real ENUM value already in the ERD
// (students.student_status, attendance.status) - no invented metrics
// (e.g. "Late Today") that don't actually exist in the schema.
const STAT_CARDS = [
  { id: 1, icon: Users, label: "Total Students Registered", count: 10, colorClass: "text-primary" },
  { id: 2, icon: UserCheck, label: "Present Today", count: 10, colorClass: "text-success" },
  { id: 3, icon: UserX, label: "Absent Today", count: 10, colorClass: "text-danger" },
  { id: 4, icon: UserMinus, label: "Dropped Students", count: 10, colorClass: "text-warning" },
];

function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.id}
            icon={card.icon}
            count={card.count}
            label={card.label}
            colorClass={card.colorClass}
          />
        ))}
      </div>

      <AttendanceChart />

      <DailyLogsTable />
    </div>
  );
}

export default DashboardPage;