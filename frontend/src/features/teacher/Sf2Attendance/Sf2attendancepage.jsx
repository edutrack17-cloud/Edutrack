import React, { useMemo, useState } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";
import SearchInput from "./Componetns/SearchInput";
import Pagination from "./Componetns/Pagiantion";
import Sf2AttendanceTable, { STATUS_STYLES } from "./Componetns/Sf2attendancetable";
import ConfirmExportModal from "./Componetns/Confirmexportmodal";
import { exportSf2ToExcel } from "./Componetns/Sf2exportexcel";

// TODO: BACKEND CONNECTION
// GET /api/grade-levels, GET /api/sections
// Same mock lists used by the Enrollment feature - swap these for the
// real API calls once they're ready.
const GRADE_LEVELS = ["Grade 4", "Grade 5", "Grade 6"];
const SECTIONS = ["Apple", "Rose", "Jade"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(monthIndex, year) {
  // Day 0 of "next month" is the same as the last day of "this month".
  return new Date(year, monthIndex + 1, 0).getDate();
}

// TODO: BACKEND CONNECTION
// GET /api/attendance/sf2?month={month}&year={year}&gradeLevel=&section=
// Should return one row per student, with a "days" map like
// { 1: "present", 2: "absent", ... } covering every day in that month.
// This mock version cycles through present/late/absent so the table
// has all 3 status colors visible for checking against the design.
function buildMockRecords(daysInMonth) {
  const students = [
    { id: 1, name: "Jhomell Rey", lrn: "202216598", gradeLevel: "Grade 4", section: "Rose" },
    { id: 2, name: "Yuri Sakazaki", lrn: "090941037", gradeLevel: "Grade 4", section: "Apple" },
    { id: 3, name: "Kyo Kusanagi", lrn: "090941038", gradeLevel: "Grade 5", section: "Jade" },
  ];

  const CYCLE = ["absent", "absent", "present", "present"];

  return students.map((student) => {
    const days = {};
    for (let day = 1; day <= daysInMonth; day++) {
      days[day] = CYCLE[(day - 1) % CYCLE.length];
    }
    return { ...student, days };
  });
}

function SF2AttendancePage() {
  const today = new Date();

  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  // Gate for the actual download - clicking "Export SF2 Report" now only
  // opens this confirmation. exportSf2ToExcel (the thing that actually
  // triggers the browser download) only runs once the person hits
  // "Export" inside ConfirmExportModal.
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const year = today.getFullYear();
  const daysInMonth = getDaysInMonth(monthIndex, year);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  // Recomputed whenever the month changes, so switching months actually
  // changes how many day-columns show up (28-31 depending on month).
  const records = useMemo(() => buildMockRecords(daysInMonth), [daysInMonth]);

  // Computed ONCE here, then handed to both the table (for display) and
  // the export (for the exported workbook) - so the exported file
  // always matches exactly what's on screen.
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !search ||
      record.name.toLowerCase().includes(search.toLowerCase()) ||
      record.lrn.includes(search);

    const matchesLevel = !gradeLevel || record.gradeLevel === gradeLevel;
    const matchesSection = !section || record.section === section;

    return matchesSearch && matchesLevel && matchesSection;
  });

  function handleOpenExportConfirm() {
    setExportError("");
    setIsExportModalOpen(true);
  }

  function handleCloseExportConfirm() {
    if (isExporting) return; // don't let a stray click close it mid-download
    setIsExportModalOpen(false);
    setExportError("");
  }

  // TODO: BACKEND CONNECTION (future upgrade)
  // Once a real GET /api/attendance/sf2/export?format=xlsx endpoint
  // exists (e.g. rendered server-side with the official DepEd SF2
  // template), this could just download that file directly instead.
  // For now, exportSf2ToExcel (see Sf2exportexcel.js) builds the .xlsx
  // client-side with ExcelJS and triggers the browser download - only
  // called from here, after explicit confirmation.
  async function handleConfirmExport() {
    try {
      setIsExporting(true);
      setExportError("");
      await exportSf2ToExcel({
        gradeLevel,
        section,
        monthName: MONTH_NAMES[monthIndex],
        year,
        dayNumbers,
        filteredRecords,
        statusStyles: STATUS_STYLES,
      });
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("SF2 Excel export failed:", error);
      setExportError(error?.message || "Failed to export SF2 report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  // Same trigger styling family as Sectionlevelfilters/PromoteStudentFilters
  // (radius, height, weight) - these stay native <select>s (no checkmark
  // menu here) but should still look/behave the same across breakpoints.
  const selectClass =
    "h-9 w-full appearance-none rounded-md border border-gray/50 shadow-sm bg-white py-2 pl-3 pr-9 text-xs font-medium text-gray-500 outline-none cursor-pointer transition-colors hover:border-gray-300 sm:pr-10 sm:text-xs";
  const iconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 sm:right-4";
  // Same responsive pattern as Sectionlevelfilters/PromoteStudentFilters's
  // wrapperClass: flexible/full-width on mobile, fixed width from sm: up.
  const wrapperClass = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-28 md:w-32";

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
      {/* Same breakpoint as Sectionlevelpage.jsx (sm:, not lg:) so the
          filter row and the search/export row sit side-by-side as soon
          as there's room, instead of staying stacked until a large
          viewport. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className={wrapperClass}>
            <select
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              className={selectClass}
            >
              <option value="">Grade Level</option>
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={iconClass} />
          </div>

          <div className={wrapperClass}>
            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className={selectClass}
            >
              <option value="">Section</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={iconClass} />
          </div>

          <div className={wrapperClass}>
            <select
              value={monthIndex}
              onChange={(event) => setMonthIndex(Number(event.target.value))}
              className={selectClass}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className={iconClass} />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} />

          <button
            type="button"
            onClick={handleOpenExportConfirm}
            className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-auto sm:text-sm"
          >
            <FileSpreadsheet size={15} strokeWidth={2.5} />
            Export SF2 Report
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Sf2AttendanceTable records={filteredRecords} dayNumbers={dayNumbers} />
        <Pagination currentPage={currentPage} totalPages={1} onPageChange={setCurrentPage} />
      </div>

      <ConfirmExportModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportConfirm}
        onConfirm={handleConfirmExport}
        isExporting={isExporting}
        errorMessage={exportError}
        gradeLevel={gradeLevel}
        section={section}
        monthName={MONTH_NAMES[monthIndex]}
        year={year}
        recordCount={filteredRecords.length}
      />
    </div>
  );
}

export default SF2AttendancePage;