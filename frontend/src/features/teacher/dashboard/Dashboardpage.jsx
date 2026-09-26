import React, { useCallback, useEffect, useState } from "react";
import { Users, UserCheck, UserX, ClipboardX, DoorOpen, UserRound, Layers } from "lucide-react";
import StatCard from "./components/Statcard";
import AttendanceChart from "./components/Attendancechart";
import DailyLogsTable from "./components/Dailylogstable";
import SectionDropdown from "./components/dropdownsectiondashboard";
import { getAdminDashboard, getTeacherDashboard } from "./dashboardservice";
import { useAuth } from "../../../Context/Authcontext";

// Maps Attendancechart's "Show:" labels to DashboardPeriod.java's enum values.
const LABEL_TO_PERIOD = { Daily: "daily", Week: "weekly", Month: "monthly", Year: "yearly" };


function DashboardPage() {
  const { role } = useAuth();

  // Matches dashboardservice.js's own `period = "daily"` default on both
  // getAdminDashboard() and getTeacherDashboard() - was hardcoded to
  // "Month" here, which silently overrode that default on every initial
  // load (fetchDashboard() always passes an explicit period, so the
  // service's default value never actually got a chance to apply).
  const [rangeLabel, setRangeLabel] = useState("Daily");

  // Which of the teacher's sections (mySections) the dashboard is scoped to.
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(
    async (label, sectionId) => {
      setIsLoading(true);
      setError(null);
      try {
        const period = LABEL_TO_PERIOD[label];
        const response =
          role === "admin"
            ? await getAdminDashboard({ period })
            : await getTeacherDashboard({ period, sectionId: sectionId ?? undefined });
        setData(response);
        if (role === "teacher") {
          setSelectedSectionId(response.selectedSectionId);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't load the dashboard. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [role]
  );

  useEffect(() => {
    if (role !== "admin" && role !== "teacher") return;
    fetchDashboard(rangeLabel, selectedSectionId);
    // selectedSectionId intentionally omitted - handleSectionChange fetches on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDashboard, rangeLabel, role]);

  function handleSectionChange(nextSectionId) {
    setSelectedSectionId(nextSectionId);
    fetchDashboard(rangeLabel, nextSectionId);
  }

  const summary = data?.summary;

  const statCards =
    role === "admin"
      ? [
          { id: 1, icon: Users, label: "Enrolled Students", count: summary?.enrolledStudents, colorClass: "text-primary" },
          { id: 2, icon: UserRound, label: "Active Teachers", count: summary?.activeTeachers, colorClass: "text-primary" },
          { id: 3, icon: Layers, label: "Active Sections", count: summary?.activeSections, colorClass: "text-primary" },
          { id: 4, icon: UserCheck, label: "Present Today", count: summary?.presentToday, colorClass: "text-success" },
          { id: 5, icon: DoorOpen, label: "On School Today", count: summary?.onSchoolToday, colorClass: "text-primary" },
          { id: 6, icon: UserX, label: "Absent Today", count: summary?.absentToday, colorClass: "text-danger" },
          { id: 7, icon: ClipboardX, label: "Incomplete Attendance", count: summary?.incompleteAttendance, colorClass: "text-warning" },
        ]
      : [
          { id: 1, icon: Users, label: "My Students", count: summary?.myStudents, colorClass: "text-primary" },
          { id: 2, icon: UserCheck, label: "Present Today", count: summary?.presentToday, colorClass: "text-success" },
          { id: 3, icon: DoorOpen, label: "On School Today", count: summary?.onSchoolToday, colorClass: "text-primary" },
          { id: 4, icon: UserX, label: "Absent Today", count: summary?.absentToday, colorClass: "text-danger" },
          { id: 5, icon: ClipboardX, label: "Incomplete Attendance", count: summary?.incompleteAttendance, colorClass: "text-warning" },
        ];

  const showSectionSwitcher = role === "teacher" && (data?.mySections?.length ?? 0) > 1;

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {showSectionSwitcher && (
          <div className="self-start">
            <SectionDropdown
              sections={data.mySections}
              value={selectedSectionId}
              onChange={handleSectionChange}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-1">
          {statCards.map((card) => (
            <div key={card.id} className="min-w-40 flex-1">
              <StatCard
                icon={card.icon}
                count={isLoading ? "--" : card.count ?? 0}
                label={card.label}
                colorClass={card.colorClass}
              />
            </div>
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