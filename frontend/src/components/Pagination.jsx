import React from 'react'

export default function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'records',
  loading = false,
}) {
  if (!pagination || pagination.totalRecords === undefined || pagination.totalRecords === 0) {
    return null
  }

  const {
    currentPage = 1,
    pageSize = 10,
    totalRecords = 0,
    totalPages = 1,
    hasNextPage = false,
    hasPreviousPage = false,
  } = pagination

  // Calculate slice range for "Showing X–Y of Z"
  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords)
  const endRecord = Math.min(currentPage * pageSize, totalRecords)

  // Generate smart array of page numbers to display
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = []
    pages.push(1)

    if (currentPage > 3) {
      pages.push('...')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('...')
    }

    pages.push(totalPages)
    return pages
  }

  return (
    <nav
      className="pagination-container"
      aria-label="Pagination Navigation"
      role="navigation"
    >
      {/* 1. Showing Record Stats */}
      <div className="pagination-info">
        Showing <strong>{startRecord}</strong>–<strong>{endRecord}</strong> of{' '}
        <strong>{totalRecords}</strong> {itemName}
      </div>

      <div className="pagination-controls">
        {/* 2. Rows per Page Selector */}
        {onPageSizeChange && (
          <div className="pagination-page-size">
            <label htmlFor="pagination-select-size" className="pagination-size-label">
              Rows:
            </label>
            <select
              id="pagination-select-size"
              value={pageSize}
              disabled={loading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="pagination-select"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Page Navigation Buttons */}
        <div className="pagination-buttons">
          {/* Previous Button */}
          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={!hasPreviousPage || loading}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous Page"
          >
            ‹ Prev
          </button>

          {/* Numeric Page Buttons */}
          {getPageNumbers().map((item, index) => {
            if (item === '...') {
              return (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  …
                </span>
              )
            }

            const isCurrent = item === currentPage
            return (
              <button
                key={`page-${item}`}
                type="button"
                className={`pagination-btn pagination-num-btn ${isCurrent ? 'active' : ''}`}
                disabled={loading}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Go to page ${item}`}
                onClick={() => {
                  if (!isCurrent) onPageChange(item)
                }}
              >
                {item}
              </button>
            )
          })}

          {/* Next Button */}
          <button
            type="button"
            className="pagination-btn pagination-nav-btn"
            disabled={!hasNextPage || loading}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next Page"
          >
            Next ›
          </button>
        </div>
      </div>
    </nav>
  )
}
