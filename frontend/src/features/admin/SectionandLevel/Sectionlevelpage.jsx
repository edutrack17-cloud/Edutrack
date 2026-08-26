import React, { useEffect, useRef, useState } from "react";
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

function Sectionlevelpage() {
  const [sections, setSections] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [planningSchoolYears, setPlanningSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [gradeLevel, setGradeLevel] = useState("");


  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");

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

        const combined = Array.from(mergedById.values()).sort((a, b) =>
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
  }, [debouncedSearch, gradeLevel, status, currentPage]);

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

  // Pulled into its own function for the same reason as
  // loadSchoolYearOptions above - so the Adviser field in Sectionformmodal
  // can be refreshed on demand (a teacher added/removed elsewhere
  // shouldn't require a full page reload to show up here).
  async function loadAdvisers() {
    const teachers = await getTeachers(); // safe: getTeachers() already catches its own errors and falls back to []
    setAdvisers(teachers);
  }

  useEffect(() => {
    loadAdvisers();
    loadSchoolYearOptions();
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

  // CONNECT: POST /api/section/school-year/new-school-year
  async function handleStartNewSchoolYear(payload) {
    try {
      const clonedSections = await startNewSchoolYear(payload);
      showToast(`${clonedSections.length} section(s) carried over to the new school year.`);
      logActivity(
        "New School Year Started",
        `${clonedSections.length} section(s) carried over from the current school year.`
      );
      try {
        await loadSections();
        await loadSchoolYearOptions();
      } catch (error) {
        showToast(
          "New school year started, but the page couldn't refresh automatically. Please reload.",
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

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 -mt-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Sectionlevelfilters
            gradeLevel={gradeLevel}
            status={status}
            onGradeLevelChange={handleGradeLevelChange}
            onStatusChange={handleStatusChange}
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
              title="Carries your current sections over into a school year you've already created and marked 'Planning' - it does not create a new school year record."
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
        sourceSchoolYears={schoolYears}
        targetSchoolYears={planningSchoolYears}
        onClose={() => setIsNewSchoolYearModalOpen(false)}
        onSubmit={handleStartNewSchoolYear}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default Sectionlevelpage;