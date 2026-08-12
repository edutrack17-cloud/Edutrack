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
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  // 1-based, matches Sectionlevelpagination.jsx - converted to 0-based
  // right before calling getSections().
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
        search,
        gradeLevel,
        status,
        page: currentPage - 1,
        size: PAGE_SIZE,
      });
      setSections(response.content);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, gradeLevel, status, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, gradeLevel, status]);

  // CONNECT: no endpoints yet - see getTeachers()/getSchoolYears() in
  // Sectionlevelservice.js.
  useEffect(() => {
    getTeachers().then(setAdvisers);
    getSchoolYears().then(setSchoolYears);
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

  // CONNECT: POST/PATCH /api/section - see createSection()/updateSection()
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Sectionlevelfilters
            gradeLevel={gradeLevel}
            status={status}
            onGradeLevelChange={(event) => setGradeLevel(event.target.value)}
            onStatusChange={(event) => setStatus(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Sectionlevelsearchinput value={search} onChange={(event) => setSearch(event.target.value)} />

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition sm:text-sm"
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