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
  indexOfLastItem 
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center px-4 py-3 bg-white border-top rounded-bottom-4 gap-3">
      <span className="text-muted small">
        Mostrando {Math.min(indexOfFirstItem + 1, totalItems)} a {Math.min(indexOfLastItem, totalItems)} de {totalItems} registos
      </span>
      <div className="btn-group shadow-sm">
        <button 
          className="btn btn-light border-0 text-primary-custom px-3" 
          disabled={currentPage === 1} 
          onClick={onPrev}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="btn btn-light border-0 fw-bold px-4 text-dark" style={{ pointerEvents: 'none' }}>
          Página {currentPage} de {totalPages}
        </div>
        <button 
          className="btn btn-light border-0 text-primary-custom px-3" 
          disabled={currentPage === totalPages} 
          onClick={onNext}
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
