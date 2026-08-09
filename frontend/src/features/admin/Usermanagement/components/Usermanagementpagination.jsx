import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Usermanagementpagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  function goToPrevious() {
    if (!isFirstPage) onPageChange(currentPage - 1);
  }

  function goToNext() {
    if (!isLastPage) onPageChange(currentPage + 1);
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

export default Usermanagementpagination;