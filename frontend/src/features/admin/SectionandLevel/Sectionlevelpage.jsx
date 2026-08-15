import React, { useEffect, useState } from "react";
import Sectiontable, { getSectionStatusColorClass } from "./Components/Sectiontable";
import Sectionlevelfilters from "./Components/Sectionlevelfilters";
import Sectionlevelsearchinput from "./Components/Sectionlevelsearchinput";
import Sectionlevelpagination from "./Components/Sectionlevelpagination";
import Sectionformmodal from "./Components/Sectionformmodal";
import ConfirmSectionStatusModal from "./Components/ConfirmSectionStatusModal";
import {
  getSections,
  createSection,
  updateSection,
  archiveSection,
  restoreSection,
  getTeachers,
  getSchoolYears,
} from "./Sectionlevelservice";

const PAGE_SIZE = 10;

export default function Sectionlevelpage() {
  const [sections, setSections] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [gradeLevel, setGradeLevel] = useState("");

  // No default status filter - dropdown shows "Status" placeholder on
  // first load, and the table shows all sections (active + archived)
  // until the user explicitly picks a filter.
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  
  const [debouncedSearch, setDebouncedSearch] = useState("");

  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedSection, setSelectedSection] = useState(null);

  const [statusChangeRequest, setStatusChangeRequest] = useState(null);

  // CONNECT: GET /api/section
  async function loadSections() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await getSections({
        search: debouncedSearch,
        gradeLevel,
        status,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      const newTotalPages = response.totalPages || 1;
      setTotalPages(newTotalPages);

      // If the page we just asked for no longer exists (e.g. the last
      // section on this page was just archived, or a filter shrank the
      // result set), fall back to the new last page instead of showing
      // a false "No sections found" for a page that isn't really empty.
      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
        return;
      }

      setSections(response.content);
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
    loadSections();
  }, [debouncedSearch, gradeLevel, status, currentPage]);

  // getSchoolYears() hits a confirmed working endpoint (GET /api/school-year).
  // getTeachers() is still a placeholder - UserController has no GET
  // endpoint to list teachers yet, so it currently resolves to [] until
  // that's built. See Sectionlevelservice.js for both.
  useEffect(() => {
    getTeachers().then(setAdvisers); // safe: getTeachers() already catches its own errors and falls back to []

    getSchoolYears()
      .then(setSchoolYears)
      .catch((error) => {
        setErrorMessage(error.message);
      });
  }, []);

  function handleOpenAdd() {
    setModalMode("add");
    setSelectedSection(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(section) {
    setModalMode("edit");
    setSelectedSection(section);
    setIsModalOpen(true);
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
    // Just updates what's shown in the input - the debounce effect
    // above is what actually commits this to debouncedSearch (and
    // resets the page) once typing pauses.
    setSearch(event.target.value);
  }

 
  async function handleSubmitSection(formData) {
    if (modalMode === "edit") {
      await updateSection(selectedSection.sectionId, formData);
    } else {
      await createSection(formData);
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
      } else {
        await restoreSection(section.sectionId);
      }
      await loadSections();
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
          <Sectionlevelfilters
            gradeLevel={gradeLevel}
            status={status}
            onGradeLevelChange={handleGradeLevelChange}
            onStatusChange={handleStatusChange}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Sectionlevelsearchinput value={search} onChange={handleSearchChange} />

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition sm:w-auto sm:py-2 sm:text-sm"
            >
              Add Section
            </button>
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading sections...</p>
        ) : (
          <>
            <Sectiontable sections={sections} onEdit={handleOpenEdit} onToggleStatus={handleRequestStatusChange} />
            <Sectionlevelpagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      <Sectionformmodal
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={selectedSection}
        advisers={advisers}
        schoolYears={schoolYears}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitSection}
      />

      <ConfirmSectionStatusModal
        isOpen={statusChangeRequest !== null}
        onClose={() => setStatusChangeRequest(null)}
        onConfirm={handleConfirmStatusChange}
        sectionName={statusChangeRequest?.section.sectionName}
        newStatus={statusChangeRequest?.nextStatus === "archived" ? "Archived" : "Active"}
        statusColorClass={statusChangeRequest ? getSectionStatusColorClass(statusChangeRequest.nextStatus) : ""}
      />
    </div>
  );
}