import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  function goToPrevious() {
    if (!isFirstPage) {
      // TODO:
      // EnrollmentPage should request the previous page.
      //
      // Example:
      // GET /api/students?page=${currentPage - 1}

      onPageChange(currentPage - 1);
    }
  }

  function goToNext() {
    if (!isLastPage) {
      // TODO:
      // EnrollmentPage should request the next page.
      //
      // Example:
      // GET /api/students?page=${currentPage + 1}

      onPageChange(currentPage + 1);
    }
  }

  return (
    <div className="flex items-center justify-center rounded-md bg-primary p-1 text-white">
      <button
        type="button"
        onClick={goToPrevious}
        disabled={isFirstPage}
        className="rounded p-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>

      <span className="mx-4 text-center text-xs font-semibold sm:mx-8 sm:text-sm">
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={goToNext}
        disabled={isLastPage}
        className="rounded p-1 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default Pagination;