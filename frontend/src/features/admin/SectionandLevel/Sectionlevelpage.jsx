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
  startNewSchoolYearPreservingAdvisers,
  cloneSectionsAcrossSchoolYears,
  activateSchoolYear,
} from "./Sectionlevelservice";
import { logActivity } from "../ActivityLogs/Activitylogservice";

const PAGE_SIZE = 10;

// The backend can only AND section-name and adviser-name filters (never OR them), so an active search fetches both matches separately and merges them client-side - see loadSections() below; results past this cap per field are dropped.
const SEARCH_FETCH_SIZE = 200;

// Sections in a school year with one of these statuses are frozen: no edit (so no adviser changes either) and no archive/unarchive. Active and Planning years stay editable - Planning on purpose, since rosters and advisers get filled in there before the year starts.
const PAST_SCHOOL_YEAR_STATUSES = ["closed", "archived"];

function Sectionlevelpage() {
  const [sections, setSections] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [planningSchoolYears, setPlanningSchoolYears] = useState([]);
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

  // GET /api/section already accepts a `fullName` param (SectionSpecification.hasAdviserName), the same one the search box's "adviser" half sends - so unlike the School Year filter, this just resolves the picked id to a name and passes it straight through as a normal AND'd filter.
  const selectedTeacherName = useMemo(() => {
    if (!teacherFilter) return null;
    return advisers.find((adviser) => String(adviser.id) === teacherFilter)?.name ?? null;
  }, [teacherFilter, advisers]);

  // Section rows only carry their school year's label (section.schoolYear), not its id or status, so the status is looked up by label in allSchoolYears - the unfiltered list that already has every year's status.
  const schoolYearStatusByLabel = useMemo(
    () => new Map(allSchoolYears.map((sy) => [sy.label, sy.status])),
    [allSchoolYears]
  );

  // True once a section's school year is past (closed/archived). An unknown year (list not loaded yet, or a section with no year) counts as editable - this is only the UI gate, the backend is what actually has to refuse the change.
  function isSectionReadOnly(section) {
    return PAST_SCHOOL_YEAR_STATUSES.includes(schoolYearStatusByLabel.get(section?.schoolYear));
  }

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

      // Only the search box still forces us off the normal server-paginated path - the backend can only AND sectionName/fullName (never OR them), so an active search fetches both matches and merges them locally. School Year is now a real backend filter (schoolYearId), same as Grade Level/Status/Teacher, so it no longer needs that treatment.
      const needsClientSideFiltering = Boolean(debouncedSearch);

      if (needsClientSideFiltering) {
        let combined;

        if (selectedTeacherName) {
          // A specific teacher is already pinned via the dropdown, so the free-text box's "OR match on adviser name" behavior doesn't apply anymore - fullName is spoken for by the selected teacher, and since sectionName + fullName are AND'd on the backend already, one fetch covers it.
          const response = await getSections({
            sectionSearch: debouncedSearch,
            search: selectedTeacherName,
            gradeLevel,
            status,
            schoolYearId: schoolYearFilter || undefined,
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
              schoolYearId: schoolYearFilter || undefined,
              page: 0,
              size: SEARCH_FETCH_SIZE,
              signal: controller.signal,
            }),
            getSections({
              search: debouncedSearch,
              gradeLevel,
              status,
              schoolYearId: schoolYearFilter || undefined,
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
        // No search term - School Year, Grade Level, Status and Teacher are all real, AND'able backend filters, so this is a normal server-paginated fetch (no local batching/slicing needed).
        const response = await getSections({
          gradeLevel,
          status,
          schoolYearId: schoolYearFilter || undefined,
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
    // selectedTeacherName (not advisers) is the dependency here on purpose, same reasoning the old BUG FIX comment had for the school-year label: re-run if the teacher filter is picked before the advisers list has caught up, but not just because that list was refetched into a new array reference. schoolYearFilter is a plain id sent straight to the backend now, so there's no derived label to depend on anymore.
  }, [
    debouncedSearch,
    gradeLevel,
    status,
    schoolYearFilter,
    teacherFilter,
    selectedTeacherName,
    currentPage,
  ]);

  // Hits GET /api/school-year for the statuses the Add/Edit form and the New School Year TARGET dropdown need (active/planning - the Closed/Archived source years come from loadAllSchoolYears() instead, see newSchoolYearSourceOptions below); kept as its own function so it can be re-run on demand (handleOpenAdd/Edit/NewSchoolYear) instead of only once on page load.
  async function loadSchoolYearOptions() {
    try {
      const [activeYears, planningYears] = await Promise.all([
        getSchoolYears("active"),
        getSchoolYears("planning"),
      ]);
      setSchoolYears(activeYears);
      setPlanningSchoolYears(planningYears);
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
      // Dedicated /school-year/dropdown endpoint - returns every year with no size ceiling, unlike getSchoolYears() above: GET /school-year is paginated and the backend caps page size at 10, so size:100 is silently ignored and only the first 10 rows of a status come back. This list also feeds the New School Year source dropdown, so no Closed/Archived year gets cut off.
      const years = await getSchoolYearDropdown();
      setAllSchoolYears(years);
    } catch (error) {
      // Keep the last good list instead of clearing it. Clearing dropped the selected year from the options, so the trigger fell back to "All School Years" while the table was still filtered to that year - and it would also wipe the statuses isSectionReadOnly() relies on.
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
    // The table already hides Edit/Archive for these rows; this is the second gate.
    if (isSectionReadOnly(section)) {
      showToast("Sections from past school years are read-only.", "error");
      return;
    }
    setModalMode("edit");
    setSelectedSection(section);
    setIsModalOpen(true);
    loadSchoolYearOptions();
    loadAdvisers();
  }

  // Read-only details for a section, used by the View item in each row's kebab menu. Nothing here is editable, so unlike Add/Edit it doesn't need the school year / adviser lists refreshed first.
  function handleOpenView(section) {
    setModalMode("view");
    setSelectedSection(section);
    setIsModalOpen(true);
  }

  // Re-fetches source/target school year options right before opening the modal, so it always reflects whatever was last changed on the School Year Management page.
  function handleOpenNewSchoolYear() {
    setIsNewSchoolYearModalOpen(true);
    loadSchoolYearOptions();
    loadAllSchoolYears(); // the source dropdown (newSchoolYearSourceOptions) is derived from this list
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
    if (isSectionReadOnly(section)) {
      showToast("Sections from past school years are read-only.", "error");
      return;
    }
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
        // Wrapped instead of calling startNewSchoolYear() directly - see
        // startNewSchoolYearPreservingAdvisers() in Sectionlevelservice.js:
        // the backend's newSchoolYear() clears the adviser off EVERY section
        // in the source year (not just the gradeLevel just cloned), so a
        // partial clone otherwise strips advisers from grade levels left
        // behind. The wrapper restores those automatically where it can.
        const { clonedSections, restored, restoreFailed } = await startNewSchoolYearPreservingAdvisers({
          sourceSchoolYearId: payload.sourceSchoolYearId,
          targetSchoolYearId: payload.targetSchoolYearId,
          gradeLevel: payload.gradeLevel,
          advisers,
        });

        // The target came from planningSchoolYears in the first place (that's what populated the modal's dropdown), so its label is already available here without an extra fetch - used to spell out exactly which year is now Active instead of leaving that implicit.
        const targetYearLabel = targetYear?.label ? `"${targetYear.label}" is now Active. ` : "";

        // Only surfaced when something couldn't be auto-restored (a
        // renamed/removed teacher) - the common case is silent, since from
        // the person's perspective nothing should have gone wrong at all.
        const restoreNote =
          restoreFailed.length > 0
            ? ` ${restoreFailed.length} section(s) left behind lost their adviser and need to be reassigned manually: ${restoreFailed
                .map((item) => item.sectionName)
                .join(", ")}.`
            : "";

        showToast(
          `${targetYearLabel}${clonedSections.length} section(s) carried over.${restoreNote}`,
          restoreFailed.length > 0 ? "error" : undefined
        );
        logActivity(
          "New School Year Started",
          `${targetYearLabel}${clonedSections.length} section(s) carried over from the current school year.` +
            (restored.length > 0
              ? ` ${restored.length} other section(s) left behind had their adviser automatically restored.`
              : "") +
            (restoreFailed.length > 0
              ? ` ${restoreFailed.length} couldn't be restored: ${restoreFailed
                  .map((item) => item.sectionName)
                  .join(", ")}.`
              : "")
        );
      } else {
        const { created, failed } = await cloneSectionsAcrossSchoolYears({
          sourceSchoolYearId: payload.sourceSchoolYearId,
          targetSchoolYearId: payload.targetSchoolYearId,
          targetLabel: targetYear?.label,
          gradeLevel: payload.gradeLevel,
          advisers,
        });

        // All-failed is treated as a real error (nothing to show for it, and the person should see why) - anything else is best-effort: whatever copied over did copy over, so surface the partial shortfall as a toast rather than discarding the successful ones.
        if (created.length === 0 && failed.length > 0) {
          throw new Error(failed.map((item) => `${item.sectionName}: ${item.reason}`).join(" "));
        }

        // BUG FIX: unlike the Active-source path above, cloneSectionsAcrossSchoolYears()
        // never touches school year status - so a Planning target used to stay
        // "Planning" forever after a Closed/Archived-source copy, with no year
        // ever becoming Active again. A Planning target that just received
        // sections is ready to go live, so activate it the same way "Start New
        // School Year" already would. Only attempted once per submit (not once
        // per grade level someone copies in over multiple visits), and it's
        // best-effort: the backend still enforces "only one Active school year"
        // (ActiveSchoolYearAlreadyExists), so if another year is already Active
        // this simply fails and the copied sections are left exactly as they are.
        //
        // NOTE: targetYear (above) came from [...planningSchoolYears, ...schoolYears],
        // and getSchoolYears() (Sectionlevelservice.js) only returns {id, label} -
        // no status - so targetYear.status is always undefined and can't be used
        // here. allSchoolYears (getSchoolYearDropdown()) is the one list that
        // actually carries each year's current status, so look the target up
        // there instead - same source newSchoolYearSourceOptions already trusts
        // for the source year's status above.
        const targetSchoolYearRecord = allSchoolYears.find(
          (sy) => sy.id === payload.targetSchoolYearId
        );
        const targetIsPlanning =
          String(targetSchoolYearRecord?.status).toLowerCase() === "planning";

        let activated = false;
        let activateErrorMessage = "";
        if (targetIsPlanning) {
          try {
            await activateSchoolYear(payload.targetSchoolYearId);
            activated = true;
          } catch (activateError) {
            activateErrorMessage = activateError.message;
          }
        }

        const targetYearLabel = activated ? `"${targetYear.label}" is now Active. ` : "";
        const shortfallNote = failed.length > 0 ? ` ${failed.length} couldn't be copied.` : "";
        const activateNote = activateErrorMessage
          ? ` Couldn't mark "${targetYear?.label}" Active: ${activateErrorMessage}`
          : "";

        showToast(
          `${targetYearLabel}${created.length} section(s) copied into "${targetYear?.label}".${shortfallNote}${activateNote}`,
          failed.length > 0 || activateErrorMessage ? "error" : undefined
        );
        logActivity(
          "Sections Cloned",
          `${targetYearLabel}${created.length} section(s) copied from "${sourceYear.label}" into "${targetYear?.label}".` +
            (failed.length > 0
              ? ` ${failed.length} failed: ${failed.map((item) => item.sectionName).join(", ")}.`
              : "") +
            (activateErrorMessage ? ` Activation failed: ${activateErrorMessage}` : "")
        );
      }

      try {
        // The clone always CREATES new Section rows under the target year - it never rewrites the originals (both cloneSectionsAcrossSchoolYears and SectionService.newSchoolYear call create/save, never an update), since past enrollment/attendance records point at that exact sectionId and rewriting in place would silently rewrite history.
        //
        // Simply refetching under the current filters isn't enough to show what just happened - the table could still be filtered to the source year, to a status the fresh sections don't have, or paginated past where the new rows land - so instead of just reloading, every filter is pointed at exactly the new sections: switch to the target year, clear Status/grade level/search, and jump back to page 1.
        //
        // schoolYearFilter is a plain id now, sent straight to the backend, so loadSections() doesn't need anything resolved first. allSchoolYears is still refreshed before switching the filter so the School Year dropdown itself already shows the target year's label instead of a blank/stale option for one render.
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

  // Source options for "Start New School Year": the currently Active year(s) (quick-start - closes it, activates the target, and clones every section) plus any Closed/Archived (past) years (clone-select), each tagged with its status so both the modal and submit handler can tell which behavior applies. Derived from allSchoolYears (GET /school-year/dropdown, unpaginated) instead of three paginated GET /school-year calls - the backend caps those at 10 rows, which silently dropped every Closed/Archived year past the 10th. Planning years are excluded on purpose: they are valid targets, not sources.
  const newSchoolYearSourceOptions = allSchoolYears
    .map((sy) => ({ ...sy, status: String(sy.status).toLowerCase() }))
    .filter((sy) => ["active", "closed", "archived"].includes(sy.status));

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
            <Sectiontable
              sections={sections}
              onEdit={handleOpenEdit}
              onView={handleOpenView}
              onToggleStatus={handleRequestStatusChange}
              isSectionReadOnly={isSectionReadOnly}
            />
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