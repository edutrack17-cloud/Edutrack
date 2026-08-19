import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function SchoolYearPagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  function handlePrev() {
    if (!isFirstPage) onPageChange(currentPage - 1);
  }

  function handleNext() {
    if (!isLastPage) onPageChange(currentPage + 1);
  }

  return (
    <div className="flex w-full items-center justify-center gap-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white sm:gap-6 sm:text-sm">
      <button
        type="button"
        onClick={handlePrev}
        disabled={isFirstPage}
        aria-label="Previous page"
        className="rounded p-0.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={15} />
      </button>

      <span>
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={handleNext}
        disabled={isLastPage}
        aria-label="Next page"
        className="rounded p-0.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export default SchoolYearPagination;