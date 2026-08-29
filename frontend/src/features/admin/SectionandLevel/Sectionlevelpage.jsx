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
  startNewSchoolYear,
  cloneSectionsAcrossSchoolYears,
} from "./Sectionlevelservice";
import { logActivity } from "../ActivityLogs/Activitylogservice";

const PAGE_SIZE = 10;

// How many rows to pull per field when a search term is active. The
// backend can only filter by section name OR adviser name in a single
// request (it ANDs the two params together, it can't OR them), so a
// search fetches both matches separately and merges them client-side -
// see loadSections() below. This cap keeps both requests bounded; if a
// single school somehow has more than this many matches for one search
// term, results past the cap won't be included (acceptable trade-off
// without a combined search endpoint on the backend).
const SEARCH_FETCH_SIZE = 200;

// GET /api/section has no schoolYearId query param - SectionController /
// SectionSpecification only support fullName, gradeLevel, sectionStatus,
// and sectionName. Spring silently drops unknown params instead of
// erroring, so sending schoolYearId does nothing server-side. Until the
// backend adds real support for it, the School Year filter is applied
// client-side: fetch a larger unpaginated-ish batch (filtered by whatever
// the backend CAN filter on - gradeLevel/status/search), then match each
// section's `schoolYear` label against the selected year and paginate
// locally. Same trade-off as SEARCH_FETCH_SIZE above: if a single school
// year + grade + status combo somehow has more matches than this cap,
// results past it won't show up.
const SCHOOL_YEAR_FETCH_SIZE = 300;

function Sectionlevelpage() {
  const [sections, setSections] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [planningSchoolYears, setPlanningSchoolYears] = useState([]);
  // Closed (past) school years are valid CLONE sources for "New School
  // Year" - see newSchoolYearSourceOptions below - but never valid targets
  // and never offered on the Add/Edit Section form, so this stays separate
  // from schoolYears/planningSchoolYears rather than folded into either.
  const [closedSchoolYears, setClosedSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [gradeLevel, setGradeLevel] = useState("");


  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");

  // Separate from schoolYears/planningSchoolYears above (those two only
  // ever hold "active" and "planning" years, for the Add/Edit and New
  // School Year form dropdowns). The filter bar should let you look back
  // at sections under closed/archived years too, so it gets its own
  // unfiltered list.
  const [schoolYearFilter, setSchoolYearFilter] = useState("");
  const [allSchoolYears, setAllSchoolYears] = useState([]);

  // BUG FIX: loadSections() used to depend on `allSchoolYears` directly
  // (the whole array) so it could react once the id->label list caught up
  // after a filter was picked before that list was ready. But
  // loadAllSchoolYears() is re-run every time the School Year dropdown is
  // OPENED (see onSchoolYearDropdownOpen below), not just once - and each
  // call produces a brand-new array reference even when the actual years
  // haven't changed. That made `allSchoolYears` change identity on every
  // dropdown open, which re-triggered the sections effect below and
  // reloaded the whole table (visible "Loading sections..." flicker) just
  // from opening the dropdown, plus a redundant double-fetch on mount
  // (once immediately, once again the moment the initial
  // loadAllSchoolYears() call resolved).
  //
  // Depending on this derived, primitive label instead fixes both: it's
  // `null` whenever no school year is selected (so reopening/refreshing
  // the dropdown without picking anything never changes it), and it only
  // changes when the label that a selected id resolves to actually
  // changes - not every time the backing array is refetched.
  const selectedSchoolYearLabel = useMemo(() => {
    if (!schoolYearFilter) return null;
    return allSchoolYears.find((sy) => String(sy.id) === schoolYearFilter)?.label ?? null;
  }, [schoolYearFilter, allSchoolYears]);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedSection, setSelectedSection] = useState(null);

  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  const [isNewSchoolYearModalOpen, setIsNewSchoolYearModalOpen] = useState(false);

  const { toasts, showToast, dismissToast } = useToasts();

  // Holds the AbortController for whichever /api/section request(s) are
  // currently in flight, so that if filters/search/page change again
  // before they resolve, we cancel them instead of letting a slower, older
  // response arrive after (and overwrite the table with) a newer one.
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

      // Either the search box or the School Year filter (or both) force
      // us off the normal server-paginated path and into fetch-a-batch,
      // filter/merge locally, then paginate locally.
      const needsClientSideFiltering = Boolean(debouncedSearch) || Boolean(schoolYearFilter);

      if (needsClientSideFiltering) {
        let combined;

        if (debouncedSearch) {
          // Fetch section-name matches and adviser-name matches in parallel
          // and merge them, instead of only falling back to adviser-name
          // matches when section-name matches are completely empty. The old
          // "if zero section-name hits, try adviser" approach silently hid
          // real adviser matches any time the term also happened to match
          // any section name at all.
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
        } else {
          // No search term - the School Year filter alone is why we're
          // here, so one fetch (still narrowed by whatever the backend
          // supports: gradeLevel/status) is enough to filter locally.
          const response = await getSections({
            gradeLevel,
            status,
            page: 0,
            size: SCHOOL_YEAR_FETCH_SIZE,
            signal: controller.signal,
          });
          combined = response.content;
        }

        if (schoolYearFilter) {
          // SectionResponse only exposes the school year as a display
          // name (no id), so matching has to go through the resolved
          // label (see selectedSchoolYearLabel above). If it somehow isn't
          // resolvable yet (shouldn't happen - you can only pick an id
          // that's already in the dropdown's own options), fail open
          // rather than hiding everything.
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
    // selectedSchoolYearLabel (not allSchoolYears) is the dependency here
    // on purpose - see the BUG FIX comment where it's derived above. It
    // still re-runs this effect if a filter is picked before the id->label
    // list has caught up (the label goes from unresolved to resolved),
    // but it does NOT re-run just because the dropdown was reopened and
    // refetched the same list of years into a new array reference.
  }, [debouncedSearch, gradeLevel, status, schoolYearFilter, selectedSchoolYearLabel, currentPage]);

  // Hits GET /api/school-year (active - for the section form's school-year
  // field and as the "source" list for Start New School Year) and again
  // with status=planning (the "target" list). Pulled into its own function
  // (instead of an inline effect) so it can be re-run on demand - see
  // handleOpenAdd/handleOpenEdit/handleOpenNewSchoolYear below - and not
  // just once on page load. Without that, a school year created or
  // status-changed on the School Year Management page wouldn't show up
  // here until a full page reload.
  async function loadSchoolYearOptions() {
    try {
      const [activeYears, planningYears, closedYears] = await Promise.all([
        getSchoolYears("active"),
        getSchoolYears("planning"),
        getSchoolYears("closed"),
      ]);
      setSchoolYears(activeYears);
      setPlanningSchoolYears(planningYears);
      setClosedSchoolYears(closedYears);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  // Pulled into its own function for the same reason as
  // loadSchoolYearOptions above - so the Adviser field in Sectionformmodal
  // can be refreshed on demand (a teacher added/removed elsewhere
  // shouldn't require a full page reload to show up here).
  async function loadAdvisers() {
    const teachers = await getTeachers(); // safe: getTeachers() already catches its own errors and falls back to []
    setAdvisers(teachers);
  }

  // Pulled into its own function, same reasoning as loadSchoolYearOptions/
  // loadAdvisers above: a fetch made once on mount goes stale the moment
  // someone creates or edits a school year on the School Year Management
  // page and comes back here, which broke the School Year filter two
  // different ways - the id->label lookup in loadSections() would fail
  // open (silently showing all years) for a year picked before this list
  // caught up, and the filter dropdown itself wouldn't even list the new
  // year to pick in the first place. Re-run this on demand (see
  // onSchoolYearDropdownOpen below) instead of relying on the one-time
  // mount fetch.
  async function loadAllSchoolYears() {
    try {
      // getSchoolYears(null), not "all" - SchoolYearStatus on the backend
      // has no "all" value (only planning/active/closed/archived), so
      // sending the literal string "all" as schoolYearStatus gets rejected
      // with a 400. Passing null skips the default param and axios drops
      // null/undefined params entirely, so no schoolYearStatus is sent at
      // all - which is exactly what SchoolYearSpecification.hasStatus()
      // treats as "no filter, return every status."
      const years = await getSchoolYears(null);
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

  // Re-fetches school years and advisers right before opening the
  // Add Section modal, so its School Year / Adviser dropdowns always
  // reflect whatever was last changed elsewhere (e.g. a school year
  // archived/activated, or a teacher added) - not whatever was true when
  // this page happened to load or was last opened.
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

  // Re-fetches source/target school year options right before opening
  // the modal, so it always reflects whatever was last created/changed
  // on the School Year Management page - not whatever was true when
  // THIS page happened to load.
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

  // CONNECT: POST /api/section/school-year/new-school-year (active source)
  // or cloneSectionsAcrossSchoolYears() (closed source - see that function
  // in Sectionlevelservice.js for why it can't reuse the endpoint above).
  //
  // Which path runs depends entirely on the STATUS of whichever source the
  // person picked in the modal, not anything the modal itself decides -
  // newSchoolYearSourceOptions (below) is the single source of truth for
  // that, since it's the same list that populated the modal's dropdown.
  async function handleStartNewSchoolYear(payload) {
    const sourceYear = newSchoolYearSourceOptions.find((sy) => sy.id === payload.sourceSchoolYearId);
    // A Closed source can now target either a "Planning" year (original
    // behavior) or the current Active year (so past sections can be
    // cloned straight into the school year that's actually running right
    // now) - so the lookup has to check both lists, not just planning.
    const targetYear = [...planningSchoolYears, ...schoolYears].find(
      (sy) => sy.id === payload.targetSchoolYearId
    );

    try {
      if (sourceYear?.status === "closed") {
        const { created, failed } = await cloneSectionsAcrossSchoolYears({
          sourceLabel: sourceYear.label,
          targetLabel: targetYear?.label,
          targetSchoolYearId: payload.targetSchoolYearId,
          gradeLevel: payload.gradeLevel,
          advisers,
        });

        // All-failed is treated as a real error (nothing to show for it,
        // and the person should see why) - anything else is best-effort:
        // whatever copied over did copy over, so surface the partial
        // shortfall as a toast rather than discarding the successful ones.
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
      } else {
        const clonedSections = await startNewSchoolYear(payload);

        // The target came from planningSchoolYears in the first place (that's
        // what populated the modal's dropdown), so its label is already
        // available here without a extra fetch - used to spell out exactly
        // which year is now Active instead of leaving that implicit.
        const targetYearLabel = targetYear?.label ? `"${targetYear.label}" is now Active. ` : "";

        showToast(`${targetYearLabel}${clonedSections.length} section(s) carried over.`);
        logActivity(
          "New School Year Started",
          `${targetYearLabel}${clonedSections.length} section(s) carried over from the current school year.`
        );
      }

      try {
        await loadSections();
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

  // Sections can be created directly under a "planning" year (e.g.
  // building out rosters ahead of the year officially starting), not just
  // the current active one, so the Add/Edit modal's School Year dropdown
  // needs both lists. Planning entries are labeled so it's clear which
  // status each option actually has.
  const sectionFormSchoolYears = [
    ...schoolYears,
    ...planningSchoolYears.map((sy) => ({ ...sy, label: `${sy.label} (Planning)` })),
  ];

  // Source options for "New School Year": the currently Active year(s)
  // (the normal case - closes it, activates the target) PLUS any Closed
  // (past) years (clone-only - see handleStartNewSchoolYear above). Each
  // entry is tagged with its status so both the modal and the submit
  // handler can tell which behavior applies without re-deriving it from
  // three separate lists each time.
  const newSchoolYearSourceOptions = [
    ...schoolYears.map((sy) => ({ ...sy, status: "active" })),
    ...closedSchoolYears.map((sy) => ({ ...sy, status: "closed" })),
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
            onGradeLevelChange={handleGradeLevelChange}
            onStatusChange={handleStatusChange}
            onSchoolYearChange={handleSchoolYearFilterChange}
            onSchoolYearDropdownOpen={loadAllSchoolYears}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Sectionlevelsearchinput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by section or adviser"
            />

            {/* Primary, frequent, low-stakes action: solid fill so it
                reads as the default thing you'd click on this page. */}
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
              title="Copies sections into a school year you've already created and marked 'Planning' - it does not create a new school year record. Picking your current school year as the source also closes it and activates the target; picking a past (Closed) year instead just clones its sections, without changing any school year's status."
              className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-40" >
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