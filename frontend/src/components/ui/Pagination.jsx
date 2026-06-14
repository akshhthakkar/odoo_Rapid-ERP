import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, limit }) => {
  if (!totalItems || totalItems === 0 || totalPages === 0) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Compute item ranges if totalItems and limit are provided
  const showRange = totalItems !== undefined && limit !== undefined;
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 0',
      borderTop: '1px solid var(--border)',
      marginTop: '16px',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {/* Page Info */}
      <div style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontWeight: 500,
      }}>
        {showRange ? (
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}-{endItem}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> records
          </span>
        ) : (
          <span>
            Page <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Navigation Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: currentPage === 1 ? 'var(--text-muted)' : '#FF540E',
            fontSize: '13px',
            fontWeight: 600,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: currentPage === 1 ? 0.5 : 1,
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (currentPage > 1) {
              e.currentTarget.style.background = '#FF540E10';
              e.currentTarget.style.borderColor = '#FF540E';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage > 1) {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          Prev
        </button>

        {/* Dynamic Page Numbers (optional but extremely professional) */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
          .reduce((acc, page, index, arr) => {
            if (index > 0 && page - arr[index - 1] > 1) {
              acc.push('...');
            }
            acc.push(page);
            return acc;
          }, [])
          .map((page, index) => {
            if (page === '...') {
              return (
                <span key={`dots-${index}`} style={{
                  padding: '8px 12px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  ...
                </span>
              );
            }

            const isCurrent = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                style={{
                  minWidth: '36px',
                  height: '36px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: isCurrent ? '1.5px solid #FF540E' : '1px solid var(--border)',
                  background: isCurrent ? '#FF540E' : 'var(--bg-card)',
                  color: isCurrent ? '#FFFFFF' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.borderColor = '#FF540E';
                    e.currentTarget.style.color = '#FF540E';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
              >
                {page}
              </button>
            );
          })}

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: currentPage === totalPages ? 'var(--text-muted)' : '#FF540E',
            fontSize: '13px',
            fontWeight: 600,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: currentPage === totalPages ? 0.5 : 1,
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.background = '#FF540E10';
              e.currentTarget.style.borderColor = '#FF540E';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
        >
          Next
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
