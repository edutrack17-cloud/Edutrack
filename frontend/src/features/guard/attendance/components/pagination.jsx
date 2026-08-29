import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  function goToPrevious() {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  }

  function goToNext() {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  }

  return (
    <div className="flex w-full items-center justify-center gap-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white sm:gap-6 sm:text-sm">
      <button
        type="button"
        onClick={goToPrevious}
        disabled={isFirstPage}
        aria-label="Previous page"
        className="flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-white disabled:text-primary disabled:hover:bg-white"
      >
        <ChevronLeft size={15} strokeWidth={2.5} />
      </button>

      <span>
        Page {currentPage} of {totalPages}
      </span>

      <button
        type="button"
        onClick={goToNext}
        disabled={isLastPage}
        aria-label="Next page"
        className="flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-primary disabled:hover:bg-white"
      >
        <ChevronRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default Pagination;