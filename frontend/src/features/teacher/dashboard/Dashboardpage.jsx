import React, { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, UserX, ClipboardX } from "lucide-react";
import StatCard from "./components/Statcard";
import AttendanceChart from "./components/Attendancechart";
import DailyLogsTable from "./components/Dailylogstable";
import { getAdminDashboard, getTeacherDashboard } from "./dashboardservice";
import { useAuth } from "../../../Context/Authcontext";

// Attendancechart's "Show:" range labels <-> the DashboardPeriod enum
// values the backend actually accepts (DashboardPeriod.java is
// daily/weekly/monthly/yearly, lowercase). Kept here since this is the
// only place that needs to translate between the two.
const LABEL_TO_PERIOD = { Daily: "daily", Week: "weekly", Month: "monthly", Year: "yearly" };

function DashboardPage() {
  const { role } = useAuth();

  // Lifted up from Attendancechart.jsx (it used to own this itself with
  // its own mock dataset per range) - now that the chart's data has to
  // come from the backend, whoever fetches has to know which range is
  // selected.
  const [rangeLabel, setRangeLabel] = useState("Month");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(
    async (label) => {
      setIsLoading(true);
      setError(null);
      try {
        const period = LABEL_TO_PERIOD[label];
        const response =
          role === "admin"
            ? await getAdminDashboard({ period })
            : await getTeacherDashboard({ period });
        setData(response);
      } catch (err) {
        // NoActiveSchoolYearException / NoSectionAssignedException both
        // come back as 409 with a real { message } - show that instead
        // of a generic failure.
        setError(err.response?.data?.message || "Couldn't load the dashboard. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [role]
  );

  useEffect(() => {
    // This page is admin/teacher only (LoginForm.jsx sends guards to
    // /guard-attendance instead) - don't fire a request before
    // AuthContext has finished rehydrating `role` on refresh.
    if (role !== "admin" && role !== "teacher") return;
    fetchDashboard(rangeLabel);
  }, [fetchDashboard, rangeLabel, role]);

  const summary = data?.summary;

  // TODO: BACKEND MISMATCH - the old mock had a 4th "Dropped Students"
  // card, but neither DashboardSummaryResponse nor
  // TeacherDashboardSummaryResponse return a dropped-student count.
  // Swapped it for Incomplete Attendance (a real field on both DTOs -
  // students who tapped in but never tapped out) until/unless a dropped
  // count gets added to the backend response. activeTeachers,
  // activeSections, onSchoolToday and attendanceRate are also sitting in
  // `summary` unused right now if a 5th/6th card ever makes sense.
  const statCards =
    role === "admin"
      ? [
          { id: 1, icon: Users, label: "Enrolled Students", count: summary?.enrolledStudents, colorClass: "text-primary" },
          { id: 2, icon: UserCheck, label: "Present Today", count: summary?.presentToday, colorClass: "text-success" },
          { id: 3, icon: UserX, label: "Absent Today", count: summary?.absentToday, colorClass: "text-danger" },
          { id: 4, icon: ClipboardX, label: "Incomplete Attendance", count: summary?.incompleteAttendance, colorClass: "text-warning" },
        ]
      : [
          { id: 1, icon: Users, label: "My Students", count: summary?.myStudents, colorClass: "text-primary" },
          { id: 2, icon: UserCheck, label: "Present Today", count: summary?.presentToday, colorClass: "text-success" },
          { id: 3, icon: UserX, label: "Absent Today", count: summary?.absentToday, colorClass: "text-danger" },
          { id: 4, icon: ClipboardX, label: "Incomplete Attendance", count: summary?.incompleteAttendance, colorClass: "text-warning" },
        ];

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.id}
              icon={card.icon}
              count={isLoading ? "--" : card.count ?? 0}
              label={card.label}
              colorClass={card.colorClass}
            />
          ))}
        </div>

        <AttendanceChart
          data={data?.attendanceOverview ?? []}
          range={rangeLabel}
          onRangeChange={setRangeLabel}
          isLoading={isLoading}
        />

        <DailyLogsTable
          logs={role === "admin" ? data?.recentAttendance : data?.todayAttendance}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export default DashboardPage;