import { useState, useMemo, useCallback } from 'react';

export const usePagination = (initialLimit = 10, initialPage = 1) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const skip = useMemo(() => (page - 1) * limit, [page, limit]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return {
    page,
    limit,
    skip,
    setPage,
    setLimit,
    handlePageChange,
    handleLimitChange,
  };
};