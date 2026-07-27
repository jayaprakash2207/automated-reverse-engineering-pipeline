interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const canGoPrevious = page > 0;
  const canGoNext = page + 1 < totalPages;

  return (
    <nav aria-label="Pagination" className="pagination">
      <button type="button" disabled={!canGoPrevious} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span aria-live="polite">
        Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
      </span>
      <button type="button" disabled={!canGoNext} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
