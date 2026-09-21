import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import SearchInput from "./Componetns/SearchInput";
import Pagination from "./Componetns/Pagiantion";
import Sf2AttendanceTable from "./Componetns/Sf2attendancetable";
import ConfirmExportModal from "./Componetns/Confirmexportmodal";
import Sf2FilterDropdown from "./Componetns/Sf2filterdropdown";
import { exportSf2Report } from "./Componetns/Sf2exportexcel";
import { fetchSf2Sections, fetchSf2Table } from "./Sf2attendanceservice";

// GradeLevel is a fixed enum on the backend (Grade_4 / Grade_5 / Grade_6) and
// no endpoint lists it, so this stays a constant. The labels match what the
// service produces for section.gradeLevel ("Grade_4" -> "Grade 4").
const GRADE_LEVELS = ["Grade 4", "Grade 5", "Grade 6"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "" is the "All ..." option, same convention as the Section Level filters.
const GRADE_LEVEL_OPTIONS = [
  { value: "", label: "All Grade Levels" },
  ...GRADE_LEVELS.map((level) => ({ value: level, label: level })),
];
const MONTH_OPTIONS = [
  { value: "", label: "All Months" },
  ...MONTH_NAMES.map((name, index) => ({ value: String(index), label: name })),
];

// A handful of nearby years, since the period is a plain YearMonth (any
// year), not locked to the current one.
function buildYearOptions(currentYear) {
  return [
    { value: "", label: "All Years" },
    ...[currentYear - 1, currentYear, currentYear + 1].map((y) => ({
      value: String(y),
      label: String(y),
    })),
  ];
}

// SF2 rosters are small (SF2 template fits 25 boys + 27 girls), and the
// endpoint returns the whole section at once, so paging is done here.
const PAGE_SIZE = 15;

// Widths: same approach as Sectionlevelfilters (per-filter width classes).
const GRADE_WIDTH = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-36 md:w-40";
const SCHOOL_YEAR_WIDTH = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-[8.5rem]";
const SECTION_WIDTH = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-36 md:w-40";
const MONTH_WIDTH = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-32";
const YEAR_WIDTH = "relative min-w-[100px] flex-1 sm:min-w-0 sm:flex-none sm:w-28";

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer self-start rounded-md border border-danger/40 bg-white px-3 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 sm:self-auto"
      >
        Try again
      </button>
    </div>
  );
}

function SF2AttendancePage() {
  const today = new Date();

  // Filters. "" = "All ..." for every one of them. Ids are kept as strings
  // because that's what the dropdowns hand back. month/year hold "" (All) or a
  // number (monthIndex 0-11 / the year).
  //
  // To open the page on the current month instead of "All Months", change the
  // two initial values below to today.getMonth() and today.getFullYear().
  const [gradeLevel, setGradeLevel] = useState("");
  const [schoolYearId, setSchoolYearId] = useState("");
  const [sectionId, setSectionId] = useState(""); // Section.sectionId, not the display name
  const [year, setYear] = useState("");
  const [monthIndex, setMonthIndex] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // GET /api/section/dropdown
  const [sections, setSections] = useState([]);
  const [isSectionsLoading, setIsSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");
  const [sectionsReloadToken, setSectionsReloadToken] = useState(0);

  // GET /api/schoolform/sf2/table
  const [tableData, setTableData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0); // bump to refetch (Try again)

  // Export (GET /api/schoolform/sf2/{sectionId}) - unchanged flow.
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  // Gate for the actual download - clicking "Export SF2 Report" only opens
  // this confirmation. exportSf2Report only runs once the person hits
  // "Export" inside ConfirmExportModal.
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // ---- Sections (and the school years derived from them) ----------------
  useEffect(() => {
    let ignore = false;
    setIsSectionsLoading(true);
    setSectionsError("");

    fetchSf2Sections()
      .then((data) => {
        if (!ignore) setSections(data);
      })
      .catch((error) => {
        if (ignore) return;
        console.error("SF2 sections load failed:", error);
        setSections([]);
        setSectionsError(error?.message || "Failed to load sections. Please try again.");
      })
      .finally(() => {
        if (!ignore) setIsSectionsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sectionsReloadToken]);

  // GET /api/school-year/dropdown is ADMIN-only and this page is used by
  // teachers too, so the school-year options are the distinct school years
  // found on the sections the backend returned.
  const schoolYears = useMemo(() => {
    const byId = new Map();
    sections.forEach((section) => {
      if (section.schoolYearId == null) return;
      const id = String(section.schoolYearId);
      if (!byId.has(id)) {
        byId.set(id, { id, name: section.schoolYearName || `School year ${id}` });
      }
    });
    // Newest first ("2026-2027" sorts before "2025-2026").
    return [...byId.values()].sort((a, b) => b.name.localeCompare(a.name));
  }, [sections]);

  // If the selected school year disappears (e.g. after a reload), fall back
  // to "All School Years".
  useEffect(() => {
    if (schoolYearId && !schoolYears.some((sy) => sy.id === schoolYearId)) {
      setSchoolYearId("");
    }
  }, [schoolYears, schoolYearId]);

  const selectedSection = sections.find((s) => String(s.id) === String(sectionId)) || null;

  // The API needs a school year, and it's always the selected section's own.
  // That's why the School Year filter can safely be "All": it only narrows
  // the section list, it isn't what gets sent.
  const tableSchoolYearId = selectedSection ? String(selectedSection.schoolYearId) : "";

  // SF2 is a monthly form, so the table (and the export) need one specific
  // month + year. "All Months" / "All Years" just means "not picked yet".
  const hasPeriod = monthIndex !== "" && year !== "";

  const sectionsForFilters = sections
    .filter(
      (s) =>
        (!schoolYearId || String(s.schoolYearId) === schoolYearId) &&
        (!gradeLevel || s.gradeLevel === gradeLevel)
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        String(b.schoolYearName).localeCompare(String(a.schoolYearName))
    );

  // With "All School Years" the same section name can appear once per school
  // year, so show the school year next to the name in that case.
  const showSchoolYearInSectionLabel = !schoolYearId && schoolYears.length > 1;

  const schoolYearOptions = [
    { value: "", label: isSectionsLoading ? "Loading..." : "All School Years" },
    ...schoolYears.map((sy) => ({ value: sy.id, label: sy.name })),
  ];
  const sectionOptions = [
    { value: "", label: isSectionsLoading ? "Loading..." : "All Sections" },
    ...sectionsForFilters.map((s) => ({
      value: String(s.id),
      label: showSchoolYearInSectionLabel ? `${s.name} (${s.schoolYearName})` : s.name,
    })),
  ];
  const yearOptions = buildYearOptions(today.getFullYear());

  // Only clear the picked section if it no longer fits the new filter.
  function handleGradeLevelChange(value) {
    setGradeLevel(value);
    if (selectedSection && value && selectedSection.gradeLevel !== value) setSectionId("");
  }

  function handleSchoolYearChange(value) {
    setSchoolYearId(value);
    if (selectedSection && value && String(selectedSection.schoolYearId) !== value) {
      setSectionId("");
    }
  }

  // ---- Table -----------------------------------------------------------
  // Load whenever the section or month changes. `ignore` drops the response
  // of a request that's been superseded, so quickly switching sections can't
  // leave an older section's data on screen.
  useEffect(() => {
    if (!sectionId || !tableSchoolYearId || !hasPeriod) {
      setTableData(null);
      setLoadError("");
      setIsLoading(false);
      return undefined;
    }

    let ignore = false;
    setIsLoading(true);
    setLoadError("");

    fetchSf2Table({ sectionId, schoolYearId: tableSchoolYearId, year, monthIndex })
      .then((data) => {
        if (!ignore) setTableData(data);
      })
      .catch((error) => {
        if (ignore) return;
        console.error("SF2 table load failed:", error);
        setTableData(null);
        setLoadError(error?.message || "Failed to load SF2 attendance. Please try again.");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [sectionId, tableSchoolYearId, hasPeriod, year, monthIndex, reloadToken]);

  // Back to page 1 whenever what's being shown changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sectionId, year, monthIndex]);

  const students = tableData?.students ?? [];
  const schoolDays = tableData?.schoolDays ?? [];

  // The endpoint is already scoped to one section, so the only client-side
  // filter left is the search box.
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) || String(student.lrn).includes(query)
    );
  }, [students, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedRecords = filteredRecords.slice(pageStart, pageStart + PAGE_SIZE);

  let emptyMessage = "No attendance records found.";
  if (!sectionId || !hasPeriod) {
    emptyMessage =
      !sectionId && !isSectionsLoading && !sectionsError && sections.length === 0
        ? "No sections available."
        : "Select a section, month and year to view attendance.";
  } else if (loadError) {
    emptyMessage = "Attendance couldn't be loaded.";
  } else if (tableData && students.length === 0) {
    emptyMessage = "No students found in this section for the selected month.";
  } else if (students.length > 0 && filteredRecords.length === 0) {
    emptyMessage = "No students match your search.";
  }

  // ---- Export ----------------------------------------------------------
  function handleOpenExportConfirm() {
    if (!sectionId || !hasPeriod) {
      setExportError("Select a section, month and year first - SF2 is exported one section and month at a time.");
      return;
    }
    setExportError("");
    setIsExportModalOpen(true);
  }

  function handleCloseExportConfirm() {
    if (isExporting) return; // don't let a stray click close it mid-download
    setIsExportModalOpen(false);
    setExportError("");
  }

  // Downloads the actual DepEd-template .xlsx straight from the backend
  // (SF2ReportController -> SF2ReportService renders it server-side).
  // See Sf2exportexcel.js for the fetch + blob-download + error mapping.
  // Note: the export always covers the whole section for the chosen month -
  // the search box only filters what's shown on screen.
  async function handleConfirmExport() {
    try {
      setIsExporting(true);
      setExportError("");
      await exportSf2Report({ sectionId, year, monthIndex });
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("SF2 export failed:", error);
      setExportError(error?.message || "Failed to export SF2 report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
      {/* Same breakpoint as Sectionlevelpage.jsx (sm:, not lg:) so the
          filter row and the search/export row sit side-by-side as soon
          as there's room, instead of staying stacked until a large
          viewport. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Sf2FilterDropdown
            options={GRADE_LEVEL_OPTIONS}
            value={gradeLevel}
            onChange={handleGradeLevelChange}
            ariaLabel="Filter by grade level"
            widthClass={GRADE_WIDTH}
          />

          <Sf2FilterDropdown
            options={schoolYearOptions}
            value={schoolYearId}
            onChange={handleSchoolYearChange}
            ariaLabel="Filter by school year"
            widthClass={SCHOOL_YEAR_WIDTH}
            disabled={isSectionsLoading}
          />

          <Sf2FilterDropdown
            options={sectionOptions}
            value={sectionId}
            onChange={setSectionId}
            ariaLabel="Select section"
            widthClass={SECTION_WIDTH}
            disabled={isSectionsLoading}
          />

          <Sf2FilterDropdown
            options={MONTH_OPTIONS}
            value={String(monthIndex)}
            onChange={(value) => setMonthIndex(value === "" ? "" : Number(value))}
            ariaLabel="Select month"
            widthClass={MONTH_WIDTH}
          />

          <Sf2FilterDropdown
            options={yearOptions}
            value={String(year)}
            onChange={(value) => setYear(value === "" ? "" : Number(value))}
            ariaLabel="Select year"
            widthClass={YEAR_WIDTH}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} />

          <button
            type="button"
            onClick={handleOpenExportConfirm}
            disabled={!sectionId || !hasPeriod}
            title={!sectionId || !hasPeriod ? "Select a section, month and year first" : undefined}
            className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary sm:w-auto sm:text-sm"
          >
            <FileSpreadsheet size={15} strokeWidth={2.5} />
            Export SF2 Report
          </button>
        </div>
      </div>

      {sectionsError && (
        <ErrorBanner
          message={sectionsError}
          onRetry={() => setSectionsReloadToken((token) => token + 1)}
        />
      )}

      {loadError && (
        <ErrorBanner message={loadError} onRetry={() => setReloadToken((token) => token + 1)} />
      )}

      {tableData && !isLoading && (
        <p className="text-center text-xs text-gray-500 sm:text-sm">
          {[tableData.gradeLevel, tableData.sectionName].filter(Boolean).join(" - ")},{" "}
          {tableData.month} {year} ({schoolDays.length} school day
          {schoolDays.length === 1 ? "" : "s"})
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Sf2AttendanceTable
          records={pagedRecords}
          schoolDays={schoolDays}
          startIndex={pageStart}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
        />
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <ConfirmExportModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportConfirm}
        onConfirm={handleConfirmExport}
        isExporting={isExporting}
        errorMessage={exportError}
        gradeLevel={selectedSection?.gradeLevel}
        section={selectedSection?.name}
        monthName={MONTH_NAMES[monthIndex] ?? ""}
        year={year}
        // Whole section, not just what the search box currently shows -
        // that's what the .xlsx contains.
        recordCount={students.length}
      />
    </div>
  );
}

export default SF2AttendancePage;