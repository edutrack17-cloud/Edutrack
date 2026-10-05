import { useEffect, useRef, useState } from "react";
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

const METRIC_CONFIG = {
  present: { label: "Present", color: "#008C34" }, 
  absent: { label: "Absent", color: "#dc2626" }, 
  onSchool: { label: "On School", color: "#01379A" },
};
const METRIC_ORDER = ["present", "absent", "onSchool"];

const RANGE_OPTIONS = ["Daily", "Week", "Month", "Year"];

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
  // NOTE: the backend's "weekly" range (DashboardDateRangeResolver) is
  // Monday-Friday (school week), not Monday-Sunday - it only ever
  // returns 5 buckets (Mon..Fri). This header must match that exactly,
  // or it implies a 7-day range while the chart only ever shows 5 bars.
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const sameMonth = monday.getMonth() === friday.getMonth();
  const sameYear = monday.getFullYear() === friday.getFullYear();

  if (sameMonth) {
    const monthLabel = monday.toLocaleDateString("en-US", { month: "short" });
    return `${monthLabel} ${monday.getDate()}-${friday.getDate()}`;
  }

  const startLabel = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = friday.toLocaleDateString(
    "en-US",
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );

  return `${startLabel}-${endLabel}`;
}

function AttendanceChart({ data: attendanceOverview, range, onRangeChange, isLoading }) {
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(METRIC_ORDER);


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
        if (prev.length === 1) return prev;
        return prev.filter((key) => key !== metricKey);
      }
      return [...prev, metricKey];
    });
  }

  const chartData = attendanceOverview ?? [];

  const activeKeys = METRIC_ORDER.filter((key) => selectedMetrics.includes(key));

  const maxValue =
    activeKeys.length > 0 && chartData.length > 0
      ? Math.max(...chartData.flatMap((point) => activeKeys.map((key) => point[key] ?? 0)))
      : 0;
  const yAxisMax = Math.ceil((maxValue * 1.15) / 10) * 10 || 10;

  const displayDate = getDisplayDate(range);

  function renderLegend() {
    return (
      <ul className="flex flex-wrap items-center justify-end gap-4 pb-1">
        {METRIC_ORDER.map((key) => {
          const config = METRIC_CONFIG[key];
          const isActive = activeKeys.includes(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggleMetric(key)}
                className={`flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-opacity ${
                  isActive ? "text-gray-700" : "text-gray-400 opacity-50"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      {/*
        Recharts wraps the chart in a focusable <svg class="recharts-surface"
        tabIndex="0"> (its built-in "accessibility layer", for keyboard
        navigation). Clicking anywhere on the chart focuses that <svg>, and
        the BROWSER (not Recharts, not this component's own styling) then
        draws its default focus outline around the whole surface - that's
        the black rectangle border that appears on click.

        Rather than disabling the accessibility layer outright (which would
        remove keyboard support entirely), this suppresses the outline only
        for a mouse-driven focus (:focus but not :focus-visible) and keeps a
        real, visible outline for keyboard users tabbing in (:focus-visible)
        - scoped to just this component via .attendance-chart-surface so it
        doesn't affect any other Recharts chart elsewhere in the app.
      */}
      <style>{`
        .attendance-chart-surface .recharts-surface:focus {
          outline: none;
        }
        .attendance-chart-surface .recharts-surface:focus-visible {
          outline: 2px solid #01379A;
          outline-offset: 2px;
        }
      `}</style>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <h2 className="text-lg font-bold text-primary">Chart</h2>
        <p className="justify-self-center text-base font-semibold text-primary">{displayDate}</p>
        <div />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => setSelectedMetrics(METRIC_ORDER)}
                    className="w-full border-b border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm font-bold text-primary transition-colors hover:bg-gray-100"
                  >
                    All
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
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                          isActive ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isActive ? "border-primary bg-primary" : "border-gray-300 bg-white"
                          }`}
                        >
                          {isActive && <Check size={12} strokeWidth={3} className="text-white" />}
                        </span>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

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
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          Select at least one metric above to see its trend here.
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-center text-sm text-gray-500 sm:h-80">
          No attendance data for this period.
        </div>
      ) : (
        <div className="attendance-chart-surface h-72 w-full sm:h-80">
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
              <Legend verticalAlign="top" align="right" height={28} content={renderLegend} />


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