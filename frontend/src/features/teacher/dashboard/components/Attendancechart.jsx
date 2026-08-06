import React, { useState } from "react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";

// TODO: BACKEND CONNECTION
// GET /api/dashboard/attendance-trend?range={range}
//   "attendance"   -> COUNT(*) FROM attendance WHERE status = 'present',
//                      grouped by day (Week) / week (Month) / month (Year)
//   "newEnrollees" -> COUNT(*) FROM student_section_assignment WHERE
//                      assigned_at falls in that same day/week/month
//                      (a fresh assignment row = a new enrollment)
//
// Each range below has its OWN mock dataset (and its own x-axis
// labels), so switching the dropdown actually changes what's drawn.
// Previously all three ranges silently showed the exact same 7 numbers
// because "range" was tracked in state but never used anywhere - that
// was the bug being fixed here.
const CHART_DATA_BY_RANGE = {
  Week: [
    { label: "Mon", attendance: 35, newEnrollees: 2 },
    { label: "Tue", attendance: 42, newEnrollees: 0 },
    { label: "Wed", attendance: 38, newEnrollees: 1 },
    { label: "Thu", attendance: 45, newEnrollees: 3 },
    { label: "Fri", attendance: 40, newEnrollees: 0 },
    { label: "Sat", attendance: 10, newEnrollees: 0 },
    { label: "Sun", attendance: 5, newEnrollees: 0 },
  ],
  Month: [
    { label: "Week 1", attendance: 180, newEnrollees: 6 },
    { label: "Week 2", attendance: 195, newEnrollees: 3 },
    { label: "Week 3", attendance: 170, newEnrollees: 4 },
    { label: "Week 4", attendance: 205, newEnrollees: 2 },
  ],
  Year: [
    { label: "Jan", attendance: 720, newEnrollees: 40 },
    { label: "Feb", attendance: 690, newEnrollees: 12 },
    { label: "Mar", attendance: 710, newEnrollees: 8 },
    { label: "Apr", attendance: 680, newEnrollees: 5 },
    { label: "May", attendance: 650, newEnrollees: 3 },
    { label: "Jun", attendance: 200, newEnrollees: 1 },
    { label: "Jul", attendance: 210, newEnrollees: 2 },
    { label: "Aug", attendance: 700, newEnrollees: 60 },
    { label: "Sep", attendance: 715, newEnrollees: 15 },
    { label: "Oct", attendance: 705, newEnrollees: 6 },
    { label: "Nov", attendance: 690, newEnrollees: 4 },
    { label: "Dec", attendance: 300, newEnrollees: 1 },
  ],
};

const RANGE_OPTIONS = ["Week", "Month", "Year"];

// The label next to the chart should describe WHICH period the chart is
// showing, not just always print today's date - "August 6, 2026" makes
// sense for a single day, but is misleading once you're looking at a
// whole Month or Year of data.
function getDisplayDate(range) {
  const today = new Date();

  if (range === "Year") {
    return today.getFullYear().toString();
  }

  if (range === "Month") {
    return today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // range === "Week": show the Monday–Sunday range that contains today.
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = sunday.toLocaleDateString(
    "en-US",
    sameMonth
      ? { day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );

  return `${startLabel} – ${endLabel}`;
}

function AttendanceChart() {
  const [range, setRange] = useState("Month");
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  // This is the actual fix: read the dataset that matches the
  // currently selected range, instead of one hardcoded array.
  const chartData = CHART_DATA_BY_RANGE[range];

  // Year totals are much bigger than a single Week's, so one fixed
  // [0, 280] domain (the old code) would visually flatten/clip the
  // Year line. Scale the top of the Y-axis to whatever range is active.
  const maxAttendance = Math.max(...chartData.map((point) => point.attendance));
  const yAxisMax = Math.ceil((maxAttendance * 1.15) / 10) * 10;

  // TODO: BACKEND CONNECTION - once the real chart data is fetched,
  // this should reflect whatever date range the fetched data actually
  // covers, in case it doesn't line up with the current calendar
  // period (e.g. showing last week's data for some reason).
  const displayDate = getDisplayDate(range);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">Chart</h2>
        <p className="text-base font-semibold text-primary">{displayDate}</p>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRangeOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary"
          >
            {range}
            <ChevronDown
              size={14}
              className={`transition-transform ${isRangeOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isRangeOpen && (
            <>
              <div
                onClick={() => setIsRangeOpen(false)}
                className="fixed inset-0 z-10"
              />
              <ul className="absolute right-0 z-20 mt-1 w-28 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {RANGE_OPTIONS.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => {
                        setRange(option);
                        setIsRangeOpen(false);
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                        option === range ? "font-semibold text-primary" : "text-gray-700"
                      }`}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <YAxis
              domain={[0, yAxisMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#6B7280" }}
            />
            <Tooltip />

            {/* Solid connected line - matches "attendance" color to
                --color-secondary (#FF0000) from index.css. */}
            <Line
              type="monotone"
              dataKey="attendance"
              name="Attendance"
              stroke="#FF0000"
              strokeWidth={2}
              dot={{ r: 4, stroke: "#FF0000", strokeWidth: 2, fill: "#FF0000" }}
            />

            {/* Unconnected open-circle dots - matches --color-warning
                (#C08E00) from index.css, white fill for the "open
                circle" look from the reference. */}
            <Scatter
              dataKey="newEnrollees"
              name="New Enrollees"
              fill="white"
              stroke="#C08E00"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AttendanceChart;