import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import SchoolYearTable, { getSchoolYearStatusLabel } from "./components/Schoolyeartable";
import SchoolYearFilters from "./components/Schoolyearfilters";
import SchoolYearSearchInput from "./components/Schoolyearsearchinput";
import SchoolYearPagination from "./components/Schoolyearpagination";
import SchoolYearFormModal from "./components/Schoolyearformmodal";
import ConfirmSchoolYearStatusModal from "./components/Confirmschoolyearstatusmodal";
import { ToastContainer, useToasts } from "../../../components/ui/Toast";
import {
  getSchoolYears,
  createSchoolYear,
  updateSchoolYear,
  archiveSchoolYear,
  restoreSchoolYear,
  closeSchoolYear,
  markAsPlanning,
  getActiveSchoolYear,
} from "./Schoolyearservice";

const PAGE_SIZE = 10;

function SchoolYearManagementpage() {
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter by a specific school year, picked from the dropdown (fed by
  // GET /api/school-year/dropdown via SchoolYearFilterDropdown). We keep
  // the id only to drive which option shows as selected; the actual
  // filtering reuses the existing GET /api/school-year?schoolYearName=
  // param with the option's exact name (see loadSchoolYears below) -
  // no new backend param needed.
  const [schoolYearId, setSchoolYearId] = useState("");
  const [schoolYearNameFilter, setSchoolYearNameFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);

  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  // The school year that is currently Active, fetched independently of
  // the table's page/filter/search - so "Mark Active" can be correctly
  // guarded even when that Active row isn't part of the currently
  // loaded page. Null means either there's no Active school year, or
  // the lookup itself failed (treated the same way: don't block on it).
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

  const { toasts, showToast, dismissToast } = useToasts();

  // CONNECT: GET /api/school-year?schoolYearStatus=active
  async function loadActiveSchoolYear() {
    const result = await getActiveSchoolYear();
    setActiveSchoolYear(result);
  }

  useEffect(() => {
    loadActiveSchoolYear();
  }, []);

  // Holds the AbortController for whichever /api/school-year request is
  // currently in flight, so that if filters/search/page change again
  // before it resolves, we cancel it instead of letting a slower, older
  // response arrive after (and overwrite the table with) a newer one.
  const abortControllerRef = useRef(null);

  // CONNECT: GET /api/school-year
  async function loadSchoolYears() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getSchoolYears({
        search: schoolYearNameFilter || debouncedSearch,
        status,
        page: currentPage - 1,
        size: PAGE_SIZE,
        signal: controller.signal,
      });
      // Math.max guards against a real empty-result totalPages of 0 (which
      // would otherwise send currentPage to 0, then page: -1 to Spring's
      // Pageable on the next fetch) while still respecting a genuine 0.
      const newTotalPages = Math.max(response.totalPages ?? 1, 1);
      setTotalPages(newTotalPages);

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setSchoolYears(response.content);
    } catch (error) {
      // A cancelled request isn't a real failure - a newer request
      // already took over, so there's nothing to show the user.
      if (error.code === "ERR_CANCELED") return;
      setErrorMessage(error.message);
    } finally {
      if (abortControllerRef.current === controller) setIsLoading(false);
    }
  }

  useEffect(() => {
    const debounceId = setTimeout(() => {
      // Trim and collapse repeated spaces, matching Sectionlevelpage.jsx's
      // search input so "2027   -" and "2027 -" are sent identically.
      setDebouncedSearch(search.trim().replace(/\s+/g, " "));
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  useEffect(() => {
    loadSchoolYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, schoolYearNameFilter, currentPage]);

  function handleOpenAdd() {
    setModalMode("add");
    setSelectedSchoolYear(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(schoolYear) {
    setModalMode("edit");
    setSelectedSchoolYear(schoolYear);
    setIsModalOpen(true);
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setCurrentPage(1);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    // Typing a free-text search supersedes a specific school year picked
    // from the dropdown, so the two filters never fight each other.
    if (schoolYearId) {
      setSchoolYearId("");
      setSchoolYearNameFilter("");
    }
  }

  // CONNECT: reuses GET /api/school-year/dropdown (already wired in
  // SchoolYearFilterDropdown) - picking an option here just sends its
  // exact schoolYearName through the existing GET /api/school-year
  // filter, same as the search box does, so no backend change is needed.
  function handleSchoolYearFilterChange(event) {
    const { value, name } = event.target;
    setSchoolYearId(value);
    setSchoolYearNameFilter(name || "");
    // Clear the free-text search so the search box doesn't show stale
    // text while a specific year is selected from the dropdown.
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
  }

  async function handleSubmitSchoolYear(formData) {
    if (modalMode === "edit") {
      await updateSchoolYear(selectedSchoolYear.schoolYearId, formData);
      showToast("School year updated successfully.");
    } else {
      await createSchoolYear(formData);
      showToast("School year added successfully.");
    }
    await loadSchoolYears();
  }
  
  function handleRequestStatusChange(schoolYear, targetStatus) {
    setStatusChangeRequest({ schoolYear, targetStatus });
  }

  // CONNECT: PATCH /api/school-year/{id}/school-year-status/{archive|active|planning}
  // "Only one Active at a time" is NOT enforced here - that's a backend
  // business rule, not something the frontend should simulate with
  // multiple non-atomic requests. If the backend rejects this (or allows
  // it and something downstream assumes single-active), the error/behavior
  // should come from the server, not be papered over client-side.
  async function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { schoolYear, targetStatus } = statusChangeRequest;

    try {
      if (targetStatus === "archived") {
        await archiveSchoolYear(schoolYear.schoolYearId);
        showToast(`${schoolYear.schoolYearName} was archived.`);
      } else if (targetStatus === "active") {
        await restoreSchoolYear(schoolYear.schoolYearId);
        showToast(`${schoolYear.schoolYearName} was marked active.`);
      } else if (targetStatus === "closed") {
        await closeSchoolYear(schoolYear.schoolYearId);
        showToast(`${schoolYear.schoolYearName} was marked closed.`);
      } else {
        await markAsPlanning(schoolYear.schoolYearId);
        showToast(`${schoolYear.schoolYearName} was marked planning.`);
      }
      await loadSchoolYears();
      await loadActiveSchoolYear();
    } catch (error) {
      setErrorMessage(error.message);
      showToast(error.message, "error");
    } finally {
      setStatusChangeRequest(null);
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-6 rounded-lg bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <SchoolYearFilters
            status={status}
            onStatusChange={handleStatusChange}
            schoolYearId={schoolYearId}
            onSchoolYearChange={handleSchoolYearFilterChange}
          />

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <SchoolYearSearchInput
              className="w-full sm:w-64"
              value={search}
              onChange={handleSearchChange}
            />

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap sm:h-9 rounded-md bg-primary px-3 text-base font-semibold text-white transition-colors hover:bg-sky-700 sm:w-auto"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add School Year
            </button>
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading school years...</p>
        ) : (
          <>
            <SchoolYearTable
              schoolYears={schoolYears}
              onEdit={handleOpenEdit}
              onChangeStatus={handleRequestStatusChange}
              // Fetched independently of the table's page/filter/search
              // (see loadActiveSchoolYear above), so "Mark Active" is
              // correctly disabled even when the Active row itself isn't
              // part of the currently loaded page. The backend
              // (ActiveSchoolYearAlreadyExists / acquireActivationLock in
              // SchoolYearService.java) remains the real enforcement -
              // this is purely a UX guard to avoid an avoidable round trip.
              activeSchoolYear={activeSchoolYear}
            />
            <SchoolYearPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      <SchoolYearFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={selectedSchoolYear}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitSchoolYear}
      />

      <ConfirmSchoolYearStatusModal
        isOpen={statusChangeRequest !== null}
        onClose={() => setStatusChangeRequest(null)}
        onConfirm={handleConfirmStatusChange}
        schoolYearName={statusChangeRequest?.schoolYear.schoolYearName}
        newStatus={statusChangeRequest ? getSchoolYearStatusLabel(statusChangeRequest.targetStatus) : ""}
        isVacatingOnlyActive={
          statusChangeRequest?.schoolYear.schoolYearStatus === "active" &&
          statusChangeRequest?.targetStatus !== "active"
        }
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default SchoolYearManagementpage;