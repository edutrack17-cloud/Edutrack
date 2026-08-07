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

// TODO: BACKEND CONNECTION
// GET /api/dashboard/attendance-trend?range={range}
// Covers all FOUR metrics shown on the StatCards up in Dashboardpage.jsx
// (those cards are static display only), toggleable here via this
// chart's own "Show:" filter dropdown below - this used to only ever plot
// "Attendance" + "New Enrollees", and "New Enrollees" wasn't even one
// of the four stat cards, so card and chart were showing unrelated
// numbers. Each key below maps to a real ERD field:
//   "totalStudents" -> COUNT(*) FROM students WHERE student_status = 'enrolled'
//                       (as of the end of that day/week/month)
//   "present"       -> COUNT(*) FROM attendance WHERE status = 'present',
//                       grouped by day (Week) / week (Month) / month (Year)
//   "absent"        -> COUNT(*) FROM attendance WHERE status = 'absent',
//                       same grouping
//   "dropped"       -> COUNT(*) FROM students WHERE student_status = 'dropped'
//                       (as of the end of that day/week/month)
//
// Each range below has its OWN mock dataset (and its own x-axis
// labels), so switching the dropdown actually changes what's drawn.
const CHART_DATA_BY_RANGE = {
  // A single day only ever has ONE count per metric (no sub-daily
  // breakdown in the ERD - attendance.status is one row per student
  // per day), so this is one data point, not a trend line. The chart
  // still renders fine with just a dot per active metric.
  Daily: [
    { label: "Today", totalStudents: 522, present: 42, absent: 3, dropped: 13 },
  ],
  // Mon-Fri only - no Sat/Sun entries, since there's no school (and so
  // no attendance) on weekends. The header label above the chart still
  // shows the full calendar week ("Aug 3-9") via getDisplayDate() below,
  // but the plotted data itself only ever has 5 points for Week.
  Week: [
    { label: "Mon", totalStudents: 500, present: 35, absent: 2, dropped: 10 },
    { label: "Tue", totalStudents: 500, present: 42, absent: 0, dropped: 10 },
    { label: "Wed", totalStudents: 501, present: 38, absent: 1, dropped: 10 },
    { label: "Thu", totalStudents: 501, present: 45, absent: 3, dropped: 11 },
    { label: "Fri", totalStudents: 502, present: 40, absent: 0, dropped: 11 },
  ],
  Month: [
    { label: "Week 1", totalStudents: 495, present: 180, absent: 7, dropped: 8 },
    { label: "Week 2", totalStudents: 498, present: 195, absent: 8, dropped: 9 },
    { label: "Week 3", totalStudents: 500, present: 170, absent: 6, dropped: 10 },
    { label: "Week 4", totalStudents: 502, present: 205, absent: 9, dropped: 11 },
  ],
  Year: [
    { label: "Jan", totalStudents: 470, present: 720, absent: 35, dropped: 5 },
    { label: "Feb", totalStudents: 472, present: 690, absent: 28, dropped: 6 },
    { label: "Mar", totalStudents: 475, present: 710, absent: 30, dropped: 6 },
    { label: "Apr", totalStudents: 478, present: 680, absent: 25, dropped: 7 },
    { label: "May", totalStudents: 480, present: 650, absent: 22, dropped: 7 },
    { label: "Jun", totalStudents: 482, present: 200, absent: 8, dropped: 8 },
    { label: "Jul", totalStudents: 485, present: 210, absent: 9, dropped: 8 },
    // Aug: new school year - enrollment jumps, matching students.admission_type
    { label: "Aug", totalStudents: 510, present: 700, absent: 32, dropped: 9 },
    { label: "Sep", totalStudents: 515, present: 715, absent: 34, dropped: 10 },
    { label: "Oct", totalStudents: 518, present: 705, absent: 33, dropped: 11 },
    { label: "Nov", totalStudents: 520, present: 690, absent: 30, dropped: 12 },
    { label: "Dec", totalStudents: 522, present: 300, absent: 25, dropped: 13 },
  ],
};

// Single source of truth for how each metric is drawn - label + color
// both deliberately match the corresponding StatCard exactly
// (Dashboardpage.jsx's colorClass), using the same hex values defined
// in index.css's @theme block. METRIC_ORDER is separate from whatever
// order metrics were clicked in, so the legend/lines always render in
// one stable, predictable order.
const METRIC_CONFIG = {
  totalStudents: { label: "Total Students", color: "#01379A" }, // matches text-primary
  present: { label: "Present", color: "#008C34" }, // matches text-success
  absent: { label: "Absent", color: "#dc2626" }, // matches text-danger
  dropped: { label: "Dropped", color: "#C08E00" }, // matches text-warning
};
const METRIC_ORDER = ["totalStudents", "present", "absent", "dropped"];

const RANGE_OPTIONS = ["Daily", "Week", "Month", "Year"];

// TODO: BACKEND CONNECTION
// GET /api/grade-levels, GET /api/sections
// Same mock lists already used by Enrollment/Attendance/SF2 - matches
// the Figma's "All" (grade level) + "Section" dropdowns next to the
// date, which weren't in the chart before this. Added for consistency
// with sections.grade_level / sections.section_name in the ERD.
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

// Which metrics plot on the chart is now entirely this component's own
// concern - controlled by the "Show:" dropdown below, NOT by clicking
// the StatCards up in Dashboardpage.jsx (those are plain static
// display cards).
function AttendanceChart() {
  const [range, setRange] = useState("Month");
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(METRIC_ORDER);

  // Matches the Figma's "All" / "Section" dropdowns. NOTE: the mock
  // data above (CHART_DATA_BY_RANGE) is school-wide only - it doesn't
  // currently branch by grade level or section, so picking a filter
  // here won't change the plotted numbers yet. Once
  // GET /api/dashboard/attendance-trend accepts gradeLevel/section
  // query params, this is where those values should get passed in.
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

  // This is the actual fix: read the dataset that matches the
  // currently selected range, instead of one hardcoded array.
  const chartData = CHART_DATA_BY_RANGE[range];

  // Stable render order regardless of the order the chips were clicked in.
  const activeKeys = METRIC_ORDER.filter((key) => selectedMetrics.includes(key));

  // Year totals are much bigger than a single Week's, so one fixed
  // domain (the old code) would visually flatten/clip the Year line.
  // Scale the top of the Y-axis to whatever range AND whichever
  // metrics are currently active - e.g. if only Absent/Dropped are
  // selected, the axis zooms in on their (much smaller) scale instead
  // of staying stretched out for Total Students/Present.
  const maxValue =
    activeKeys.length > 0
      ? Math.max(...chartData.flatMap((point) => activeKeys.map((key) => point[key])))
      : 0;
  const yAxisMax = Math.ceil((maxValue * 1.15) / 10) * 10;

  // TODO: BACKEND CONNECTION - once the real chart data is fetched,
  // this should reflect whatever date range the fetched data actually
  // covers, in case it doesn't line up with the current calendar
  // period (e.g. showing last week's data for some reason).
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

          {/* Range selector (Daily/Week/Month/Year) */}
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

      {activeKeys.length === 0 ? (
        // Defensive fallback - toggleMetric above already refuses to
        // let selectedMetrics go empty, but keeping this in case that
        // guard is ever changed or bypassed - an empty chart with no
        // explanation would just look broken.
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          Select at least one metric above to see its trend here.
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
                  each colored to match its StatCard exactly. Using
                  Line (not Line+Scatter like before) for all of them
                  since up to 4 series can be active at once now - a
                  consistent shape and distinct colors + the Legend are
                  what tell them apart, rather than mixing shapes. */}
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