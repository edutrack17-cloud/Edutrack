import React, { useEffect, useRef, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Check, ChevronDown } from "lucide-react";

// Data now comes from the parent (Dashboardpage.jsx), which fetches
// GET /api/dashboard/admin or /teacher and passes down `data:
// attendanceOverview`. This component no longer owns any mock dataset -
// see Dashboardpage.jsx for the fetch + range-to-period mapping.
//
// TODO: BACKEND MISMATCH - the old mock plotted FOUR metrics
// (totalStudents, present, absent, dropped) to match the dashboard's
// four StatCards. AttendanceOverviewPointResponse.java only returns
// THREE: present, absent, onSchool - no totalStudents, no dropped.
// METRIC_CONFIG below reflects what the backend actually sends; adding
// totalStudents/dropped back here means adding those fields to
// AttendanceOverviewPointResponse.java (and DashboardService.java's
// buildAttendanceOverview()) first.
const METRIC_CONFIG = {
  present: { label: "Present", color: "#008C34" }, // matches text-success
  absent: { label: "Absent", color: "#dc2626" }, // matches text-danger
  onSchool: { label: "On School", color: "#01379A" }, // no matching StatCard right now - see Dashboardpage.jsx
};
const METRIC_ORDER = ["present", "absent", "onSchool"];

const RANGE_OPTIONS = ["Daily", "Week", "Month", "Year"];

// TODO: BACKEND CONNECTION
// GET /api/grade-levels, GET /api/sections
// Same mock lists already used by Enrollment/Attendance/SF2 - matches
// the Figma's "All" (grade level) + "Section" dropdowns next to the
// date. STILL INERT: DashboardController doesn't accept gradeLevel/
// section query params yet, and DashboardService.buildAttendanceOverview()
// only ever filters by section for a teacher's OWN section (forced, not
// user-selectable) - never for admin. Picking a value here won't change
// what's plotted until the backend adds that filtering.
const GRADE_LEVEL_OPTIONS = ["Grade 4", "Grade 5", "Grade 6"];
const SECTION_OPTIONS = ["Apple", "Rose", "Jade"];

// The label next to the chart should describe WHICH period the chart is
// showing, not just always print today's date - "August 6, 2026" makes
// sense for a single day, but is misleading once you're looking at a
// whole Month or Year of data.
function getDisplayDate(range) {
  const today = new Date();

  if (range === "Daily") {
    return today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  if (range === "Year") {
    return today.getFullYear().toString();
  }

  if (range === "Month") {
    return today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // range === "Week": show a compact "Aug 3-9" style range for the
  // Monday-Sunday week that contains today.
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();

  if (sameMonth) {
    // Common case - one month name, plain hyphen, no year: "Aug 3-9".
    const monthLabel = monday.toLocaleDateString("en-US", { month: "short" });
    return `${monthLabel} ${monday.getDate()}-${sunday.getDate()}`;
  }

  // Week spans two different months (e.g. "Jul 29-Aug 4") - only add a
  // year if it ALSO spans two different years (e.g. New Year's week).
  const startLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = sunday.toLocaleDateString(
    "en-US",
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );

  return `${startLabel}-${endLabel}`;
}

// Which metrics plot on the chart is still entirely this component's own
// concern - controlled by the "Show:" dropdown below. `range` itself is
// now controlled by the parent (Dashboardpage.jsx needs to know it too,
// to know which `period` to request), passed in as `range` +
// `onRangeChange`.
function AttendanceChart({ data: attendanceOverview, range, onRangeChange, isLoading }) {
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(METRIC_ORDER);

  // Matches the Figma's "All" / "Section" dropdowns. Still inert - see
  // the TODO above GRADE_LEVEL_OPTIONS.
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");

  // "Show:" used to be 5 separate chip buttons sitting right below the
  // chart's built-in color Legend - two rows of near-identical info
  // (colors + names) right on top of each other, which is what felt
  // overwhelming. Collapsing them into one dropdown keeps the Legend
  // as the "what does each color mean" reference, and this dropdown
  // as the "which ones do I want to see" control - only one is open
  // (visible) at a time instead of both competing for attention.
  const [isShowOpen, setIsShowOpen] = useState(false);
  const showDropdownRef = useRef(null);

  useEffect(() => {
    if (!isShowOpen) return;

    function handleClickOutside(event) {
      if (showDropdownRef.current && !showDropdownRef.current.contains(event.target)) {
        setIsShowOpen(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") setIsShowOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isShowOpen]);

  function toggleMetric(metricKey) {
    setSelectedMetrics((prev) => {
      const isSelected = prev.includes(metricKey);
      if (isSelected) {
        // Refuse to deselect down to zero - an empty chart isn't
        // useful, and there'd be no obvious way back.
        if (prev.length === 1) return prev;
        return prev.filter((key) => key !== metricKey);
      }
      return [...prev, metricKey];
    });
  }

  const chartData = attendanceOverview ?? [];

  // Stable render order regardless of the order the chips were clicked in.
  const activeKeys = METRIC_ORDER.filter((key) => selectedMetrics.includes(key));

  // Year totals are much bigger than a single Week's, so one fixed
  // domain (the old code) would visually flatten/clip the Year line.
  // Scale the top of the Y-axis to whatever range AND whichever
  // metrics are currently active. Guarded against an empty chartData -
  // Math.max(...[]) is -Infinity, which would otherwise turn yAxisMax
  // into NaN and break the chart entirely on a period with no data.
  const maxValue =
    activeKeys.length > 0 && chartData.length > 0
      ? Math.max(...chartData.flatMap((point) => activeKeys.map((key) => point[key] ?? 0)))
      : 0;
  const yAxisMax = Math.ceil((maxValue * 1.15) / 10) * 10 || 10;

  const displayDate = getDisplayDate(range);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <h2 className="text-lg font-bold text-primary">Chart</h2>
        <p className="justify-self-center text-base font-semibold text-primary">{displayDate}</p>
        <div />
      </div>

      {/* Grade Level / Section / Month, grouped together with the "Show"
          metric dropdown in one row below the title - keeps every
          filter in a single predictable place instead of splitting them
          across the header. */}
      <div className="flex flex-wrap items-center gap-2">
          {/* "Show:" dropdown - which metrics get plotted below, moved to
              the front of the filter row since it's the primary control
              here (Grade Level/Section/Month just narrow the data, this
              decides what's drawn at all). Separate, deliberate choice
              from the chart's own built-in Legend above (that just
              labels whichever lines already ARE drawn - it's not
              interactive). Multi-select, so clicking an item toggles it
              without closing the list - the person can pick several
              before dismissing it. Colors used for each dot are inline
              styles rather than Tailwind classes because METRIC_CONFIG's
              colors are arbitrary hex values not known at build time -
              Tailwind can only generate CSS for class names it can see
              literally in the source, so a dynamically-built class
              string here would silently produce no styling in a
              production build. */}
          <div className="relative w-fit" ref={showDropdownRef}>
            <button
              type="button"
              onClick={() => setIsShowOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary"
              aria-haspopup="listbox"
              aria-expanded={isShowOpen}
            >
              Show
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${isShowOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isShowOpen && (
              <ul
                role="listbox"
                aria-multiselectable="true"
                className="absolute left-0 z-20 mt-1 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              >
                <li>
                  {/* Styled distinctly from the individual metric rows
                      below (tinted background + bold primary text, no
                      colored dot) so it reads as a "select everything"
                      action/button, not just another list option -
                      that's the confusion this was flagged for. */}
                  <button
                    type="button"
                    onClick={() => setSelectedMetrics(METRIC_ORDER)}
                    className="flex w-full items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm font-bold text-primary transition-colors hover:bg-gray-100"
                  >
                    All
                    {activeKeys.length === METRIC_ORDER.length && (
                      <Check size={14} className="text-primary" />
                    )}
                  </button>
                </li>

                {METRIC_ORDER.map((key) => {
                  const config = METRIC_CONFIG[key];
                  const isActive = activeKeys.includes(key);
                  return (
                    <li key={key} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onClick={() => toggleMetric(key)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          {config.label}
                        </span>
                        {isActive && <Check size={14} className="text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Grade Level filter */}
          <div className="relative">
            <select
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              className="appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition-colors hover:border-primary"
            >
              <option value="">Grade Level</option>
              {GRADE_LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>

          {/* Section filter */}
          <div className="relative">
            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className="appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 outline-none transition-colors hover:border-primary"
            >
              <option value="">Section</option>
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
          </div>

          {/* Range selector (Daily/Week/Month/Year) - now controlled by
              the parent so it can know which `period` to refetch. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRangeOpen((prev) => !prev)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
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
                          onRangeChange(option);
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

      {isLoading ? (
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          Loading chart...
        </div>
      ) : activeKeys.length === 0 ? (
        // Defensive fallback - toggleMetric above already refuses to
        // let selectedMetrics go empty, but keeping this in case that
        // guard is ever changed or bypassed - an empty chart with no
        // explanation would just look broken.
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          Select at least one metric above to see its trend here.
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          No attendance data for this period.
        </div>
      ) : (
        <div className="h-72 w-full sm:h-80">
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
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />

              {/* One Line per active metric, in stable METRIC_ORDER,
                  each colored to match METRIC_CONFIG above. */}
              {activeKeys.map((key) => {
                const config = METRIC_CONFIG[key];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={config.label}
                    stroke={config.color}
                    strokeWidth={2}
                    dot={{ r: 4, stroke: config.color, strokeWidth: 2, fill: config.color }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AttendanceChart;