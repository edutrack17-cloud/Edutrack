import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import SearchInput from "./Componetns/SearchInput";
import Pagination from "./Componetns/Pagiantion";
import Sf2AttendanceTable from "./Componetns/Sf2attendancetable";
import ConfirmExportModal from "./Componetns/Confirmexportmodal";
import Sf2FilterDropdown from "./Componetns/Sf2filterdropdown";
import { exportSf2Report } from "./Componetns/Sf2exportexcel";
import { fetchSf2Sections, fetchSf2SectionsByAdviser, fetchSf2Table } from "./Sf2attendanceservice";
// Same context EnrollmentPage.jsx uses for its own role/adviser split
// (src/Context/Authcontext.jsx). Path depth assumes this file lives in the
// same folder as Sf2attendanceservice.js, matching that file's own
// "../../../services/apiClient" import - adjust the "../" count if this
// file actually lives somewhere deeper (e.g. a "pages" subfolder).
import { useAuth } from "../../../Context/Authcontext";

// GradeLevel is a fixed enum on the backend (Grade_4 / Grade_5 / Grade_6).
// This only pins display order (4 -> 5 -> 6) - the actual option list is
// derived from `sections` further down, which is now itself role-scoped
// (ADMIN gets every section via /section/dropdown; TEACHER gets only their
// own via /section/adviser/{userId} - see the sections-loading effect
// above). So a TEACHER genuinely only sees the grade level(s) they're
// assigned to. Labels match what the service produces for
// section.gradeLevel ("Grade_4" -> "Grade 4").
const GRADE_LEVEL_ORDER = ["Grade 4", "Grade 5", "Grade 6"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "" is the "All ..." option, same convention as the Section Level filters.
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
  const { user, role, isInitializing } = useAuth();
  const today = new Date();

  // Filters. "" = "All ..." for Grade Level / School Year / Section. Ids are
  // kept as strings because that's what the dropdowns hand back.
  //
  // Month/Year default to *this* month/year instead of "All" - SF2 is a
  // monthly report, so "All Months"/"All Year" was never actually a useful
  // resting state, just two more required clicks (on top of Grade Level ->
  // School Year -> Section) before the table or the Export button did
  // anything. Still fully overridable via the dropdowns below.
  const [gradeLevel, setGradeLevel] = useState("");
  const [schoolYearId, setSchoolYearId] = useState("");
  const [sectionId, setSectionId] = useState(""); // Section.sectionId, not the display name
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // GET /api/section/dropdown (ADMIN) or GET /api/section/adviser/{userId}
  // (TEACHER) - see the effect below, which branches on role exactly like
  // EnrollmentPage.jsx's loadSections() does. A TEACHER only ever gets
  // their own assigned section(s) this way; ADMIN still gets every section.
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

  // FIX: sections and the attendance table below used to only (re)fetch on
  // mount, a filter change, or a manual "Try again" click - so a section
  // added/archived, a student enrolled/transferred, or an attendance mark
  // changed elsewhere never showed up here until this page's filters were
  // touched or the browser was reloaded. Same gap already fixed on
  // Rfidattendancepage.jsx (rosterRefreshKey) and Promotestudentpage.jsx
  // (sectionsRefreshKey extended to loadStudents) - bumping this on window
  // focus/tab visibility and including it in both effects below closes it
  // here too, for both the section list and the table data in one go.
  const [focusRefreshKey, setFocusRefreshKey] = useState(0);
  useEffect(() => {
    function handleRefetch() {
      if (document.visibilityState === "visible") {
        setFocusRefreshKey((prev) => prev + 1);
      }
    }
    window.addEventListener("focus", handleRefetch);
    document.addEventListener("visibilitychange", handleRefetch);
    return () => {
      window.removeEventListener("focus", handleRefetch);
      document.removeEventListener("visibilitychange", handleRefetch);
    };
  }, []);

  // ---- Sections (and the school years derived from them) ----------------
  // TEACHER vs ADMIN scoping: same split as EnrollmentPage.jsx's
  // loadSections() - a TEACHER only ever gets the section(s) they advise
  // (GET /api/section/adviser/{userId}), never the full /section/dropdown
  // list. isInitializing guards against AuthContext's rehydrate-on-refresh:
  // without it, this could fire once with role still null (falling into the
  // ADMIN branch) before re-firing once role actually resolves to "teacher" -
  // a redundant fetch and a brief flash of the wrong, unscoped section list.
  useEffect(() => {
    if (isInitializing) return;

    let ignore = false;
    setIsSectionsLoading(true);
    setSectionsError("");

    const request =
      role === "teacher" ? fetchSf2SectionsByAdviser(user?.id) : fetchSf2Sections();

    request
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
  }, [role, user?.id, isInitializing, sectionsReloadToken, focusRefreshKey]);

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

  // School Year defaults to the most recent one available - same convention
  // Student Management's own School Year filter already follows (it opens
  // on a real year, not "All School Years"; only Grade Level/Section/Status
  // open on "All" there, and stay that way below). Runs once, the moment we
  // actually know what years exist, so picking "All School Years" by hand
  // afterwards sticks instead of snapping back.
  const hasDefaultedSchoolYear = useRef(false);
  useEffect(() => {
    if (hasDefaultedSchoolYear.current || schoolYears.length === 0) return;
    hasDefaultedSchoolYear.current = true;
    setSchoolYearId(schoolYears[0].id);
  }, [schoolYears]);

  // If the selected school year disappears afterwards (e.g. a reload under
  // a different account), fall back to "All School Years".
  useEffect(() => {
    if (schoolYearId && !schoolYears.some((sy) => sy.id === schoolYearId)) {
      setSchoolYearId("");
    }
  }, [schoolYears, schoolYearId]);

  // Grade Level options, same idea as schoolYears above: only the level(s)
  // actually present in `sections`, which is now role-scoped (see the
  // sections-loading effect) - so a TEACHER only sees the grade(s) they're
  // actually assigned to, and ADMIN sees every level in use.
  const gradeLevels = useMemo(() => {
    const present = new Set(sections.map((s) => s.gradeLevel).filter(Boolean));
    return GRADE_LEVEL_ORDER.filter((level) => present.has(level));
  }, [sections]);

  // ADMIN: Grade Level defaults to the first available level, same
  // convention as the School Year default above - so narrowing (and
  // auto-selecting) a section happens right away, the same way it already
  // does for TEACHER simply by having one assigned section. There's no
  // "All Grade Levels" option for ADMIN any more (see gradeLevelOptions
  // below), so this also guarantees gradeLevel is never left at "" once
  // levels are known. TEACHER keeps "All Grade Levels" - untouched, since
  // that side already works.
  const hasDefaultedGradeLevel = useRef(false);
  useEffect(() => {
    if (role !== "admin") return;
    if (hasDefaultedGradeLevel.current || gradeLevels.length === 0) return;
    hasDefaultedGradeLevel.current = true;
    setGradeLevel(gradeLevels[0]);
  }, [role, gradeLevels]);

  // If the selected grade level disappears (e.g. reassigned, or a reload
  // under a different account): TEACHER falls back to "All Grade Levels";
  // ADMIN falls back to the first remaining level, since "All" isn't a
  // choice it has any more.
  useEffect(() => {
    if (gradeLevel && !gradeLevels.includes(gradeLevel)) {
      setGradeLevel(role === "admin" ? gradeLevels[0] ?? "" : "");
    }
  }, [gradeLevels, gradeLevel, role]);

  const selectedSection = sections.find((s) => String(s.id) === String(sectionId)) || null;

  // The API needs a school year, and it's always the selected section's own.
  // That's why the School Year filter can safely be "All": it only narrows
  // the section list, it isn't what gets sent.
  const tableSchoolYearId = selectedSection ? String(selectedSection.schoolYearId) : "";

  // SF2 is a monthly form, so the table (and the export) need one specific
  // month + year. "All Months" / "All Years" just means "not picked yet".
  const hasPeriod = monthIndex !== "" && year !== "";

  const sectionsForFilters = useMemo(
    () =>
      sections
        .filter(
          (s) =>
            (!schoolYearId || String(s.schoolYearId) === schoolYearId) &&
            (!gradeLevel || s.gradeLevel === gradeLevel)
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) ||
            String(b.schoolYearName).localeCompare(String(a.schoolYearName))
        ),
    [sections, schoolYearId, gradeLevel]
  );

  // A teacher almost always has exactly one assigned section, and an admin
  // often narrows Grade Level + School Year down to exactly one too. Either
  // way, once there's only one section left to pick, making that a required
  // third click is just friction for an answer that's already unambiguous -
  // that's the "only shows up once every dropdown is exactly right"
  // confusion. Auto-pick it, and step aside the moment there's a real choice
  // to make (sectionsForFilters.length > 1).
  useEffect(() => {
    if (sectionsForFilters.length !== 1) return;
    const onlyOption = String(sectionsForFilters[0].id);
    if (onlyOption !== sectionId) setSectionId(onlyOption);
  }, [sectionsForFilters, sectionId]);

  // With "All School Years" the same section name can appear once per school
  // year, so show the school year next to the name in that case.
  const showSchoolYearInSectionLabel = !schoolYearId && schoolYears.length > 1;

  // ADMIN has no "All Grade Levels" option any more - it always resolves to
  // a real level (defaulted above, or reset above if it ever disappears),
  // so picking a section is at most Grade Level -> Section instead of
  // Grade Level -> School Year -> Section, same as TEACHER already gets
  // for free from having one assigned section. TEACHER keeps "All Grade
  // Levels", since that side already works.
  const gradeLevelOptions = isSectionsLoading
    ? [{ value: "", label: "Loading..." }]
    : role === "admin"
    ? gradeLevels.map((level) => ({ value: level, label: level }))
    : [
        { value: "", label: "All Grade Levels" },
        ...gradeLevels.map((level) => ({ value: level, label: level })),
      ];
  const schoolYearOptions = [
    { value: "", label: isSectionsLoading ? "Loading..." : "All School Years" },
    ...schoolYears.map((sy) => ({ value: sy.id, label: sy.name })),
  ];
  // Unlike Grade Level/School Year, "All Sections" was never a real,
  // usable state here - the table needs exactly one section no matter what,
  // so it always either got auto-picked back (the effect above) or just sat
  // empty. Drop the "All" framing entirely: when there's exactly one match
  // it's already selected, so there's nothing to place-hold; otherwise show
  // a plain "pick one" placeholder that says what's actually going on.
  let sectionPlaceholderLabel = "Select a Section";
  if (isSectionsLoading) sectionPlaceholderLabel = "Loading...";
  else if (sections.length === 0) sectionPlaceholderLabel = "No sections";
  else if (sectionsForFilters.length === 0) sectionPlaceholderLabel = "No matching section";

  const sectionOptions =
    sectionsForFilters.length === 1
      ? [
          {
            value: String(sectionsForFilters[0].id),
            label: showSchoolYearInSectionLabel
              ? `${sectionsForFilters[0].name} (${sectionsForFilters[0].schoolYearName})`
              : sectionsForFilters[0].name,
          },
        ]
      : [
          { value: "", label: sectionPlaceholderLabel },
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
  }, [sectionId, tableSchoolYearId, hasPeriod, year, monthIndex, reloadToken, focusRefreshKey]);

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
    if (!isSectionsLoading && !sectionsError && sections.length === 0) {
      emptyMessage = "No sections available.";
    } else if (!sectionId && sections.length > 0 && sectionsForFilters.length === 0) {
      // Grade Level + School Year narrowed the Section dropdown down to
      // nothing - say so, instead of a generic message that gives no clue
      // why there's nothing left to pick.
      emptyMessage = "No section matches that Grade Level and School Year. Try a different combination.";
    } else if (!sectionId) {
      emptyMessage = "Select a section to view attendance.";
    } else {
      emptyMessage = "Select a month and year to view attendance.";
    }
  } else if (loadError) {
    emptyMessage = "Attendance couldn't be loaded.";
  } else if (tableData && students.length === 0) {
    emptyMessage = "No students found in this section for the selected month.";
  } else if (students.length > 0 && filteredRecords.length === 0) {
    emptyMessage = "No students match your search.";
  }

  // ---- Export ------------------------------------------------------------
  // "Select a section" vs "Select a month and year" - not always all three,
  // now that Month/Year already default to the current period. Shared by
  // the button's disabled title below and this confirm-gate check.
  const exportDisabledReason = !sectionId
    ? "Select a section first"
    : !hasPeriod
    ? "Select a month and year first"
    : "";

  function handleOpenExportConfirm() {
    if (!sectionId || !hasPeriod) {
      setExportError(`${exportDisabledReason} - SF2 is exported one section and month at a time.`);
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
            options={gradeLevelOptions}
            value={gradeLevel}
            onChange={handleGradeLevelChange}
            ariaLabel="Filter by grade level"
            widthClass={GRADE_WIDTH}
            disabled={isSectionsLoading}
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
            title={exportDisabledReason || undefined}
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