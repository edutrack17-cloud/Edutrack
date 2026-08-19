import React, { useEffect, useState } from "react";
import SchoolYearTable, { getSchoolYearStatusColorClass, getSchoolYearStatusLabel } from "./components/Schoolyeartable";
import SchoolYearFilters from "./components/Schoolyearfilters";
import SchoolYearSearchInput from "./components/Schoolyearsearchinput";
import SchoolYearPagination from "./components/Schoolyearpagination";
import SchoolYearFormModal from "./components/Schoolyearformmodal";
import ConfirmSchoolYearStatusModal from "./components/Confirmschoolyearstatusmodal";
import {
  getSchoolYears,
  createSchoolYear,
  updateSchoolYear,
  archiveSchoolYear,
  markAsPlanning,
  getOtherActiveSchoolYears,
  activateSchoolYearExclusive,
} from "./Schoolyearservice";

const PAGE_SIZE = 10;

function SchoolYearManagementpage() {
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);

 
  const [statusChangeRequest, setStatusChangeRequest] = useState(null);
  // Row whose "Mark Active" click is currently fetching other active
  // school years - lets the table show a spinner/disabled state
  // instead of the click appearing to do nothing while it loads.
  const [checkingStatusChangeId, setCheckingStatusChangeId] = useState(null);

  // CONNECT: GET /api/school-year
  async function loadSchoolYears() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getSchoolYears({
        search: debouncedSearch,
        status,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setSchoolYears(response.content);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceId);
  }, [search]);

  useEffect(() => {
    loadSchoolYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, currentPage]);

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
  }

  async function handleSubmitSchoolYear(formData) {
    if (modalMode === "edit") {
      await updateSchoolYear(selectedSchoolYear.schoolYearId, formData);
    } else {
      await createSchoolYear(formData);
    }
    await loadSchoolYears();
  }
  
  async function handleRequestStatusChange(schoolYear, targetStatus) {
    if (targetStatus !== "active") {
      setStatusChangeRequest({ schoolYear, targetStatus, otherActiveSchoolYears: [] });
      return;
    }

    try {
      setCheckingStatusChangeId(schoolYear.schoolYearId);
      const others = await getOtherActiveSchoolYears(schoolYear.schoolYearId);
      setStatusChangeRequest({ schoolYear, targetStatus, otherActiveSchoolYears: others });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setCheckingStatusChangeId(null);
    }
  }

  // CONNECT: PATCH /api/school-year/{id}/school-year-status/{archive|active|planning}
  async function handleConfirmStatusChange() {
    if (!statusChangeRequest) return;
    const { schoolYear, targetStatus } = statusChangeRequest;

    try {
      if (targetStatus === "archived") {
        await archiveSchoolYear(schoolYear.schoolYearId);
      } else if (targetStatus === "active") {
        // Archives every other currently-Active school year first,
        // then activates this one - keeps "only one Active at a time"
        // true from this UI even though the backend doesn't guarantee
        // it yet. Reuses the list the user already saw in the confirm
        // modal so what gets archived matches what was shown to them.
        await activateSchoolYearExclusive(
          schoolYear.schoolYearId,
          statusChangeRequest.otherActiveSchoolYears
        );
      } else {
        await markAsPlanning(schoolYear.schoolYearId);
      }
      await loadSchoolYears();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setStatusChangeRequest(null);
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <SchoolYearFilters status={status} onStatusChange={handleStatusChange} />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SchoolYearSearchInput value={search} onChange={handleSearchChange} />

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 sm:w-auto"
            >
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
              checkingStatusChangeId={checkingStatusChangeId}
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
        statusColorClass={statusChangeRequest ? getSchoolYearStatusColorClass(statusChangeRequest.targetStatus) : ""}
        otherActiveSchoolYears={statusChangeRequest?.otherActiveSchoolYears ?? []}
      />
    </div>
  );
}

export default SchoolYearManagementpage;