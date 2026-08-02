import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  function goToPrevious() {
    if (!isFirstPage) onPageChange(currentPage - 1);
  }

  function goToNext() {
    if (!isLastPage) onPageChange(currentPage + 1);
  }

  return (
    <div className="font-primary flex items-center justify-center gap-6 rounded-lg bg-primary px-4 py-3 text-white">
      <button
        onClick={goToPrevious}
        disabled={isFirstPage}
        className="cursor-pointer rounded-md p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={20} />
      </button>

      <span className="text-sm font-semibold">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={goToNext}
        disabled={isLastPage}
        className="cursor-pointer rounded-md p-1 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default Pagination;