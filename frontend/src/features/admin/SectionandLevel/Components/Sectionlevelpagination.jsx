import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Small, presentation-only pagination bar: shows "Page X of Y" with
// prev/next controls. All page-tracking logic (currentPage, totalPages,
// fetching) lives in Sectionlevelpage.jsx - this component just renders
// the current state and reports the user's intent via onPageChange.
function Sectionlevelpagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  function handlePrev() {
    if (!isFirstPage) onPageChange(currentPage - 1);
  }

  function handleNext() {
    if (!isLastPage) onPageChange(currentPage + 1);
  }

  return (
    <div className="flex w-full items-center justify-center gap-4 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white sm:gap-6">
      <button
        type="button"
        onClick={handlePrev}
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
        onClick={handleNext}
        disabled={isLastPage}
        aria-label="Next page"
        className="flex items-center justify-center rounded-md border border-gray-200 bg-white p-1 text-primary transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-primary disabled:hover:bg-white"
      >
        <ChevronRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default Sectionlevelpagination;