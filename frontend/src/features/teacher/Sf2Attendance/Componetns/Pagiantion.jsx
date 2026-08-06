// features/teacher/sf2Attendance/components/Pagination.jsx
//
// Same component already used by the Enrollment feature - copied here
// so SF2AttendancePage.jsx's "../components/Pagination" import resolves
// correctly. No logic changes; if you'd rather not maintain two copies,
// this is also a good candidate to move into components/ui/ and import
// from both features instead.

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  function goToPrevious() {
    if (!isFirstPage) {
      // TODO:
      // SF2AttendancePage should request the previous page.
      //
      // Example:
      // GET /api/attendance/sf2?page=${currentPage - 1}

      onPageChange(currentPage - 1);
    }
  }

  function goToNext() {
    if (!isLastPage) {
      // TODO:
      // SF2AttendancePage should request the next page.
      //
      // Example:
      // GET /api/attendance/sf2?page=${currentPage + 1}

      onPageChange(currentPage + 1);
    }
  }

  return (
    <div className="flex w-full items-center justify-center rounded-md bg-primary p-1 text-white sm:w-auto">
      <button
        type="button"
        onClick={goToPrevious}
        disabled={isFirstPage}
        aria-label="Previous page"
        className="shrink-0 rounded p-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} strokeWidth={2.5} className="sm:hidden" />
        <ChevronLeft size={18} strokeWidth={2.5} className="hidden sm:block" />
      </button>

      <span className="mx-3 text-center text-[11px] font-semibold whitespace-nowrap sm:mx-8 sm:text-sm">
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={goToNext}
        disabled={isLastPage}
        aria-label="Next page"
        className="shrink-0 rounded p-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} strokeWidth={2.5} className="sm:hidden" />
        <ChevronRight size={18} strokeWidth={2.5} className="hidden sm:block" />
      </button>
    </div>
  );
}

export default Pagination;