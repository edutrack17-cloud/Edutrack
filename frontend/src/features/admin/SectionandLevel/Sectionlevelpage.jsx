import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, CalendarSync } from "lucide-react";
import Sectiontable from "./Components/Sectiontable";
import Sectionlevelfilters from "./Components/Sectionlevelfilters";
import Sectionlevelsearchinput from "./Components/Sectionlevelsearchinput";
import Sectionlevelpagination from "./Components/Sectionlevelpagination";
import Sectionformmodal from "./Components/Sectionformmodal";
import ConfirmSectionStatusModal from "./Components/ConfirmSectionStatusModal";
import NewSchoolYearModal from "./Components/Newschoolyearmodal";
import { ToastContainer, useToasts } from "../../../components/ui/Toast";
import {
  getSections,
  createSection,
  updateSection,
  archiveSection,
  restoreSection,
  getTeachers,
  getSchoolYears,
  getSchoolYearDropdown,
  startNewSchoolYear,
  cloneSectionsAcrossSchoolYears,
} from "./Sectionlevelservice";
import { logActivity } from "../ActivityLogs/Activitylogservice";

const PAGE_SIZE = 10;

// The backend can only AND section-name and adviser-name filters (never OR them), so an active search fetches both matches separately and merges them client-side - see loadSections() below; results past this cap per field are dropped.
const SEARCH_FETCH_SIZE = 200;

// GET /api/section has no schoolYearId param (Spring silently drops unknown params), so the School Year filter fetches a larger batch filtered by whatever the backend CAN filter on, matches each section's `schoolYear` label client-side, then paginates locally; results past this cap won't show up.
const SCHOOL_YEAR_FETCH_SIZE = 300;

function Sectionlevelpage() {
  const [sections, setSections] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [planningSchoolYears, setPlanningSchoolYears] = useState([]);
  // Closed and Archived (past) school years are valid CLONE sources for "Start New School Year" (see newSchoolYearSourceOptions below), alongside the currently Active year - but neither is a valid target or offered on the Add/Edit form, so both stay separate from schoolYears/planningSchoolYears.
  const [closedSchoolYears, setClosedSchoolYears] = useState([]);
  const [archivedSchoolYears, setArchivedSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [gradeLevel, setGradeLevel] = useState("");


  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  // Separate from schoolYears/planningSchoolYears above (those only ever hold "active"/"planning" years for the Add/Edit and New School Year dropdowns) - the filter bar should look back at closed/archived years too, so it gets its own unfiltered list.
  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [allSchoolYears, setAllSchoolYears] = useState([]);

  // Teacher filter - stores the selected adviser's id (string, same convention as schoolYearFilter) and reuses the `advisers` list already loaded for the Add/Edit Section modal's Adviser field, so no extra fetch is needed.
  const [teacherFilter, setTeacherFilter] = useState("");

  // BUG FIX: loadSections() used to depend on `allSchoolYears` directly, but that array gets a new reference every time the School Year dropdown is opened (see onSchoolYearDropdownOpen), which re-triggered the sections effect and reloaded the whole table just from opening the dropdown. Depending on this derived, primitive label instead fixes it: it's `null` when nothing's selected, and only changes when the resolved label itself actually changes.
  const selectedSchoolYearLabel = useMemo(() => {
    if (!schoolYearFilter) return null;
    return allSchoolYears.find((sy) => String(sy.id) === schoolYearFilter)?.label ?? null;
  }, [schoolYearFilter, allSchoolYears]);

  // GET /api/section already accepts a `fullName` param (SectionSpecification.hasAdviserName), the same one the search box's "adviser" half sends - so unlike the School Year filter, this just resolves the picked id to a name and passes it straight through as a normal AND'd filter.
  const selectedTeacherName = useMemo(() => {
    if (!teacherFilter) return null;
    return advisers.find((adviser) => String(adviser.id) === teacherFilter)?.name ?? null;
  }, [teacherFilter, advisers]);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedSection, setSelectedSection] = useState(null);

  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  const [isNewSchoolYearModalOpen, setIsNewSchoolYearModalOpen] = useState(false);

  const { toasts, showToast, dismissToast } = useToasts();

  // Holds the AbortController for whichever /api/section request(s) are currently in flight, so a filter/search/page change before they resolve cancels them instead of letting a slower, older response overwrite the table.
  const abortControllerRef = useRef(null);

  // CONNECT: GET /api/section
  async function loadSections() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage("");

      let pageContent;
      let newTotalPages;

      // Either the search box or the School Year filter (or both) force us off the normal server-paginated path and into fetch-a-batch, filter/merge locally, then paginate locally.
      const needsClientSideFiltering = Boolean(debouncedSearch) || Boolean(schoolYearFilter);

      if (needsClientSideFiltering) {
        let combined;

        if (debouncedSearch) {
          if (selectedTeacherName) {
            // A specific teacher is already pinned via the dropdown, so the free-text box's "OR match on adviser name" behavior doesn't apply anymore - fullName is spoken for by the selected teacher, and since sectionName + fullName are AND'd on the backend already, one fetch covers it.
            const response = await getSections({
              sectionSearch: debouncedSearch,
              search: selectedTeacherName,
              gradeLevel,
              status,
              page: 0,
              size: SEARCH_FETCH_SIZE,
              signal: controller.signal,
            });
            combined = response.content;
          } else {
            // Fetch section-name matches and adviser-name matches in parallel and merge them, instead of only falling back to adviser matches when section-name matches are empty - the old approach silently hid real adviser matches whenever the term also matched a section name.
            const [bySectionName, byAdviserName] = await Promise.all([
              getSections({
                sectionSearch: debouncedSearch,
                gradeLevel,
                status,
                page: 0,
                size: SEARCH_FETCH_SIZE,
                signal: controller.signal,
              }),
              getSections({
                search: debouncedSearch,
                gradeLevel,
                status,
                page: 0,
                size: SEARCH_FETCH_SIZE,
                signal: controller.signal,
              }),
            ]);

            const mergedById = new Map();
            [...bySectionName.content, ...byAdviserName.content].forEach((section) => {
              mergedById.set(section.sectionId, section);
            });

            combined = Array.from(mergedById.values());
          }
        } else {
          // No search term - the School Year and/or Teacher filter is why we're here, so one fetch (narrowed by whatever the backend supports) is enough to filter locally for school year.
          const response = await getSections({
            gradeLevel,
            status,
            search: selectedTeacherName || undefined,
            page: 0,
            size: SCHOOL_YEAR_FETCH_SIZE,
            signal: controller.signal,
          });
          combined = response.content;
        }

        if (schoolYearFilter) {
          // SectionResponse only exposes the school year as a display name (no id), so matching goes through the resolved label (see selectedSchoolYearLabel) - fails open rather than hiding everything if it's somehow not resolvable yet.
          if (selectedSchoolYearLabel) {
            combined = combined.filter((section) => section.schoolYear === selectedSchoolYearLabel);
          }
        }

        combined = combined.sort((a, b) =>
          a.sectionName.localeCompare(b.sectionName, undefined, { numeric: true })
        );

        newTotalPages = Math.max(1, Math.ceil(combined.length / PAGE_SIZE));
        setTotalPages(newTotalPages);

        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
          return;
        }

        pageContent = combined.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
      } else {
        const response = await getSections({
          gradeLevel,
          status,
          search: selectedTeacherName || undefined,
          page: currentPage - 1,
          size: PAGE_SIZE,
          signal: controller.signal,
        });
        newTotalPages = response.totalPages || 1;
        setTotalPages(newTotalPages);

        if (currentPage > newTotalPages) {
          setCurrentPage(newTotalPages);
          return;
        }

        pageContent = response.content;
      }

      setSections(pageContent);
    } catch (error) {
      if (error.code === "ERR_CANCELED") return;
      setErrorMessage(error.message);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }


  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDebouncedSearch(search.trim().replace(/\s+/g, " "));
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  useEffect(() => {
    loadSections();
    // selectedSchoolYearLabel/selectedTeacherName (not allSchoolYears/advisers) are the dependencies here on purpose - see the BUG FIX comment above; this still re-runs if a filter is picked before its list has caught up, but not just because a dropdown was reopened and refetched into a new array reference.
  }, [
    debouncedSearch,
    gradeLevel,
    status,
    schoolYearFilter,
    selectedSchoolYearLabel,
    teacherFilter,
    selectedTeacherName,
    currentPage,
  ]);

  // Hits GET /api/school-year for every status this page needs (active/planning/closed/archived - see newSchoolYearSourceOptions below); kept as its own function so it can be re-run on demand (handleOpenAdd/Edit/NewSchoolYear) instead of only once on page load.
  async function loadSchoolYearOptions() {
    try {
      const [activeYears, planningYears, closedYears, archivedYears] = await Promise.all([
        getSchoolYears("active"),
        getSchoolYears("planning"),
        getSchoolYears("closed"),
        getSchoolYears("archived"),
      ]);
      setSchoolYears(activeYears);
      setPlanningSchoolYears(planningYears);
      setClosedSchoolYears(closedYears);
      setArchivedSchoolYears(archivedYears);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  // Own function, same reasoning as loadSchoolYearOptions above - lets the Adviser field in Sectionformmodal refresh on demand instead of needing a full page reload.
  async function loadAdvisers() {
    const teachers = await getTeachers(); // safe: getTeachers() already catches its own errors and falls back to []
    setAdvisers(teachers);
  }

  // Own function, same reasoning as loadSchoolYearOptions/loadAdvisers above - a one-time mount fetch went stale the moment a school year was added/edited elsewhere, breaking the School Year filter (fail-open lookup, or the new year missing from the dropdown); re-run on demand instead (see onSchoolYearDropdownOpen below).
  async function loadAllSchoolYears() {
    try {
      // Dedicated /school-year/dropdown endpoint - returns every year with no size ceiling, unlike getSchoolYears() above (hardcoded size:100, fine for active/planning/closed pulls but wrong for "every year regardless of status").
      const years = await getSchoolYearDropdown();
      setAllSchoolYears(years);
    } catch (error) {
      setAllSchoolYears([]);
    }
  }

  useEffect(() => {
    loadAdvisers();
    loadSchoolYearOptions();
    loadAllSchoolYears();
  }, []);

  // Re-fetches school years and advisers right before opening the Add Section modal, so its dropdowns always reflect whatever was last changed elsewhere - not whatever was true when this page loaded.
  function handleOpenAdd() {
    setModalMode("add");
    setSelectedSection(null);
    setIsModalOpen(true);
    loadSchoolYearOptions();
    loadAdvisers();
  }

  // Same refresh as handleOpenAdd above, for the Edit Section modal.
  function handleOpenEdit(section) {
    setModalMode("edit");
    setSelectedSection(section);
    setIsModalOpen(true);
    loadSchoolYearOptions();
    loadAdvisers();
  }

  // Re-fetches source/target school year options right before opening the modal, so it always reflects whatever was last changed on the School Year Management page.
  function handleOpenNewSchoolYear() {
    setIsNewSchoolYearModalOpen(true);
    loadSchoolYearOptions();
  }

  function handleGradeLevelChange(event) {
    setGradeLevel(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setCurrentPage(1);
  }

  function handleSchoolYearFilterChange(event) {
    setSchoolYearFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleTeacherFilterChange(event) {
    setTeacherFilter(event.target.value);
    setCurrentPage(1);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }


  async function handleSubmitSection(formData) {
    if (modalMode === "edit") {
      await updateSection(selectedSection.sectionId, formData);
      showToast("Section updated successfully.");
      logActivity("Section Updated", `${formData.sectionName || selectedSection.sectionName} was updated.`);
    } else {
      await createSection(formData);
      showToast("Section added successfully.");
      logActivity("Section Created", `${formData.sectionName} was added.`);
    }
    await loadSections();
  }

  function handleRequestStatusChange(section) {
    const nextStatus = section.sectionStatus === "archived" ? "active" : "archived";
    setStatusChangeRequest({ section, nextStatus });
  }

  // CONNECT: PATCH /api/section/{id}/section-status/archive|active
  async function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { section, nextStatus } = statusChangeRequest;

    try {
      if (nextStatus === "archived") {
        await archiveSection(section.sectionId);
        showToast(`${section.sectionName} was archived.`);
        logActivity("Section Archived", `${section.sectionName} was archived.`);
      } else {
        await restoreSection(section.sectionId);
        showToast(`${section.sectionName} was activated.`);
        logActivity("Section Activated", `${section.sectionName} was activated.`);
      }
      await loadSections();
    } catch (error) {
      setErrorMessage(error.message);
      showToast(error.message, "error");
    } finally {
      setStatusChangeRequest(null);
    }
  }

  // CONNECT: POST /api/section/school-year/new-school-year (active source) or cloneSectionsAcrossSchoolYears() (closed/archived source - see that function in Sectionlevelservice.js for why it can't reuse the endpoint above). Which path runs depends entirely on the source's status - newSchoolYearSourceOptions (below) is the single source of truth, since it's the same list that populated the modal's dropdown.
  async function handleStartNewSchoolYear(payload) {
    const sourceYear = newSchoolYearSourceOptions.find((sy) => sy.id === payload.sourceSchoolYearId);
    // A Closed/Archived source can target either a "Planning" year or the current Active year, so the lookup has to check both lists, not just planning.
    const targetYear = [...planningSchoolYears, ...schoolYears].find(
      (sy) => sy.id === payload.targetSchoolYearId
    );

    try {
      if (sourceYear?.status === "active") {
        const clonedSections = await startNewSchoolYear(payload);

        // The target came from planningSchoolYears in the first place (that's what populated the modal's dropdown), so its label is already available here without an extra fetch - used to spell out exactly which year is now Active instead of leaving that implicit.
        const targetYearLabel = targetYear?.label ? `"${targetYear.label}" is now Active. ` : "";

        showToast(`${targetYearLabel}${clonedSections.length} section(s) carried over.`);
        logActivity(
          "New School Year Started",
          `${targetYearLabel}${clonedSections.length} section(s) carried over from the current school year.`
        );
      } else {
        const { created, failed } = await cloneSectionsAcrossSchoolYears({
          sourceLabel: sourceYear.label,
          targetLabel: targetYear?.label,
          targetSchoolYearId: payload.targetSchoolYearId,
          gradeLevel: payload.gradeLevel,
          advisers,
          // Which specific sections the admin checked in the modal's preview list - see cloneSectionsAcrossSchoolYears() for how this narrows the clone down instead of copying everything under the source year.
          sectionIds: payload.sectionIds,
        });

        // All-failed is treated as a real error (nothing to show for it, and the person should see why) - anything else is best-effort: whatever copied over did copy over, so surface the partial shortfall as a toast rather than discarding the successful ones.
        if (created.length === 0 && failed.length > 0) {
          throw new Error(failed.map((item) => `${item.sectionName}: ${item.reason}`).join(" "));
        }

        const shortfallNote = failed.length > 0 ? ` ${failed.length} couldn't be copied.` : "";
        showToast(
          `${created.length} section(s) copied into "${targetYear?.label}".${shortfallNote}`,
          failed.length > 0 ? "error" : undefined
        );
        logActivity(
          "Sections Cloned",
          `${created.length} section(s) copied from "${sourceYear.label}" into "${targetYear?.label}".` +
            (failed.length > 0
              ? ` ${failed.length} failed: ${failed.map((item) => item.sectionName).join(", ")}.`
              : "")
        );
      }

      try {
        // The clone always CREATES new Section rows under the target year - it never rewrites the originals (both cloneSectionsAcrossSchoolYears and SectionService.newSchoolYear call create/save, never an update), since past enrollment/attendance records point at that exact sectionId and rewriting in place would silently rewrite history.
        //
        // Simply refetching under the current filters isn't enough to show what just happened - the table could still be filtered to the source year, to a status the fresh sections don't have, or paginated past where the new rows land - so instead of just reloading, every filter is pointed at exactly the new sections: switch to the target year, clear Status/grade level/search, and jump back to page 1.
        //
        // allSchoolYears is refreshed first so the target year's label is already resolvable the moment schoolYearFilter changes - otherwise selectedSchoolYearLabel can't find it yet and loadSections() would fail open for one render before catching up.
        await loadAllSchoolYears();
        setGradeLevel("");
        setStatus("");
        setSearch("");
        setDebouncedSearch("");
        setSchoolYearFilter(String(payload.targetSchoolYearId));
        setCurrentPage(1);
        await loadSchoolYearOptions();
      } catch (error) {
        showToast(
          "Done, but the page couldn't refresh automatically. Please reload.",
          "error"
        );
      }
    } catch (error) {
      loadSchoolYearOptions();
      throw error;
    }
  }

  // Sections can be created directly under a "planning" year (e.g. building out rosters ahead of the year officially starting), not just the current active one, so the Add/Edit modal's School Year dropdown needs both lists, with Planning entries labeled accordingly.
  const sectionFormSchoolYears = [
    ...schoolYears,
    ...planningSchoolYears.map((sy) => ({ ...sy, label: `${sy.label} (Planning)` })),
  ];

  // Source options for "Start New School Year": the currently Active year(s) (quick-start - closes it, activates the target, and clones every section) plus any Closed/Archived (past) years (clone-select), each tagged with its status so both the modal and submit handler can tell which behavior applies.
  const newSchoolYearSourceOptions = [
    ...schoolYears.map((sy) => ({ ...sy, status: "active" })),
    ...closedSchoolYears.map((sy) => ({ ...sy, status: "closed" })),
    ...archivedSchoolYears.map((sy) => ({ ...sy, status: "archived" })),
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Sectionlevelfilters
            gradeLevel={gradeLevel}
            status={status}
            schoolYear={schoolYearFilter}
            schoolYearOptions={allSchoolYears}
            teacher={teacherFilter}
            teacherOptions={advisers}
            onGradeLevelChange={handleGradeLevelChange}
            onStatusChange={handleStatusChange}
            onSchoolYearChange={handleSchoolYearFilterChange}
            onSchoolYearDropdownOpen={loadAllSchoolYears}
            onTeacherChange={handleTeacherFilterChange}
            onTeacherDropdownOpen={loadAdvisers}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Sectionlevelsearchinput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by section or adviser"
            />

            {/* Primary, frequent, low-stakes action: solid fill so it reads as the default thing you'd click on this page. */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-32"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Section
            </button>

           <button
              type="button"
              onClick={handleOpenNewSchoolYear}
              className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-40"
            >
              <CalendarSync size={15} strokeWidth={2.5} />
              New School Year
            </button>
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading sections...</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Sectiontable sections={sections} onEdit={handleOpenEdit} onToggleStatus={handleRequestStatusChange} />
            <Sectionlevelpagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>

      <Sectionformmodal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={selectedSection}
        advisers={advisers}
        schoolYears={sectionFormSchoolYears}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitSection}
      />

      <ConfirmSectionStatusModal
        isOpen={statusChangeRequest !== null}
        onClose={() => setStatusChangeRequest(null)}
        onConfirm={handleConfirmStatusChange}
        sectionName={statusChangeRequest?.section.sectionName}
        newStatus={statusChangeRequest?.nextStatus === "archived" ? "Archived" : "Active"}
      />

      <NewSchoolYearModal
        isOpen={isNewSchoolYearModalOpen}
        sourceSchoolYears={newSchoolYearSourceOptions}
        targetSchoolYears={planningSchoolYears}
        activeSchoolYears={schoolYears}
        onClose={() => setIsNewSchoolYearModalOpen(false)}
        onSubmit={handleStartNewSchoolYear}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default Sectionlevelpage;