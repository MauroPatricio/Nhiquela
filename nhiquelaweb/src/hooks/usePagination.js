import { useState, useMemo } from 'react';

export default function usePagination(data = [], itemsPerPage = 10, searchFields = ['name', 'nome', 'description', 'email', 'phone', '_id', 'title']) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort and Handle Search Filtering
  const filteredData = useMemo(() => {
    // 1. Sort data from newest to oldest
    const sortedData = [...data].sort((a, b) => {
      // Avoid sorting if objects don't have standard identifiers
      if (!a || !b) return 0;
      
      let dateA = 0;
      let dateB = 0;
      
      if (a.createdAt) dateA = new Date(a.createdAt).getTime();
      else if (a._id && typeof a._id === 'string' && a._id.length === 24) dateA = parseInt(a._id.substring(0, 8), 16) * 1000;
      else if (a.id && typeof a.id === 'string' && a.id.length === 24) dateA = parseInt(a.id.substring(0, 8), 16) * 1000;
      
      if (b.createdAt) dateB = new Date(b.createdAt).getTime();
      else if (b._id && typeof b._id === 'string' && b._id.length === 24) dateB = parseInt(b._id.substring(0, 8), 16) * 1000;
      else if (b.id && typeof b.id === 'string' && b.id.length === 24) dateB = parseInt(b.id.substring(0, 8), 16) * 1000;
      
      // Only sort if we extracted valid timestamps, otherwise keep original order
      if (dateA > 0 && dateB > 0) return dateB - dateA;
      return 0;
    });

    if (!searchQuery) return sortedData;
    const lowerQuery = searchQuery.toLowerCase();
    
    return sortedData.filter(item => {
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
