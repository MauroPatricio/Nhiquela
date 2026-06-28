import { useState, useMemo } from 'react';

export default function usePagination(data = [], itemsPerPage = 10, searchFields = ['name', 'nome', 'description', 'email', 'phone', '_id', 'title']) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Search Filtering
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    
    return data.filter(item => {
      // Check if any of the configured search fields match the query
      return searchFields.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });
  }, [data, searchQuery, searchFields]);

  // Handle Pagination Math
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // Get current page slice
  const currentData = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Pagination Actions
  const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToPage = (page) => setCurrentPage(page);

  // If search query changes, reset to page 1
  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return {
    currentPage,
    searchQuery,
    setSearchQuery: handleSearch,
    filteredData,
    currentData,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    totalItems: filteredData.length,
    indexOfFirstItem,
    indexOfLastItem
  };
}
