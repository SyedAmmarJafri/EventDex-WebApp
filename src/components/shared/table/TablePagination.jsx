import React from 'react';

const TablePagination = ({ table }) => {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const canPrevious = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <>
      <style>
        {`
          .table-pagination {
            display: flex;
            justify-content: center;
            margin: 20px 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }
          
          .pagination-controls {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .pagination-button {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #374151;
            cursor: pointer;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
          }
          
          .pagination-button:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #9ca3af;
          }
          
          .pagination-button:active:not(:disabled) {
            background: #e5e7eb;
          }
          
          .pagination-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .page-indicator {
            font-size: 14px;
            color: #4b5563;
            min-width: 120px;
            text-align: center;
          }
        `}
      </style>

      <div className="table-pagination">
        <div className="pagination-controls">
          <button
            className="pagination-button"
            onClick={() => table.previousPage()}
            disabled={!canPrevious}
            aria-label="Previous page"
          >
            Previous
          </button>

          <span className="page-indicator">
            Page {currentPage} of {pageCount}
          </span>

          <button
            className="pagination-button"
            onClick={() => table.nextPage()}
            disabled={!canNext}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default TablePagination;