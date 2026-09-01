import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export default function PaginationControls({ 
  currentPage, 
  totalPages, 
  onNext, 
  onPrev, 
  totalItems, 
  indexOfFirstItem, 
  indexOfLastItem,
  itemsPerPage,
  onItemsPerPageChange
}) {
  if (!totalItems || totalItems === 0) return null;

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center px-4 py-3 bg-white border-top rounded-bottom-4 gap-3">
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted small">
          Mostrando {Math.min(indexOfFirstItem + 1, totalItems)} a {Math.min(indexOfLastItem, totalItems)} de {totalItems} registos
        </span>
        {onItemsPerPageChange && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">| Por página:</span>
            <select 
              className="form-select form-select-sm bg-light border-0 rounded-3 text-dark fw-bold px-2 py-1"
              style={{ width: '70px', cursor: 'pointer' }}
              value={itemsPerPage || 10}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>
      <div className="btn-group shadow-sm">
        <button 
          className="btn btn-light border-0 text-primary-custom px-3" 
          disabled={currentPage === 1} 
          onClick={onPrev}
          title="Página Anterior"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="btn btn-light border-0 fw-bold px-4 text-dark" style={{ pointerEvents: 'none' }}>
          Página {currentPage} de {totalPages}
        </div>
        <button 
          className="btn btn-light border-0 text-primary-custom px-3" 
          disabled={currentPage >= totalPages} 
          onClick={onNext}
          title="Próxima Página"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      <style>{`
        .text-primary-custom { color: #8a2be2 !important; }
      `}</style>
    </div>
  );
}
