import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Briefcase, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import NotificationDropdown from './NotificationDropdown';

const TopNav = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults(null);
      setShowDropdown(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await api.get(`/search?q=${searchQuery}`);
      setResults(response.data.data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (path) => {
    navigate(path);
    setShowDropdown(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowDropdown(false);
  };

  return (
    <div className="bg-bg-primary border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex-1 max-w-2xl" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-text-tertiary" />
          </div>
          <input
            type="text"
            className="input-field pl-10 w-full bg-bg-secondary border-transparent focus:bg-bg-primary focus:border-accent"
            placeholder="Search documents, cases, or users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results) setShowDropdown(true); }}
          />
          {query && (
            <button 
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute mt-2 w-full bg-bg-primary border border-border rounded-lg shadow-lg overflow-hidden max-h-96 overflow-y-auto">
              {loading && <div className="p-4 text-center text-sm text-text-secondary">Searching...</div>}
              
              {!loading && results && (
                <>
                  {results.documents?.length === 0 && results.cases?.length === 0 && results.users?.length === 0 && (
                    <div className="p-4 text-center text-sm text-text-secondary">No results found for "{query}"</div>
                  )}

                  {results.documents?.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                        Documents
                      </div>
                      {results.documents.map(doc => (
                        <button
                          key={doc._id}
                          onClick={() => handleResultClick(`/documents/${doc._id}`)}
                          className="w-full text-left px-4 py-2 hover:bg-bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <FileText size={16} className="text-text-secondary" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">{doc.title}</div>
                            <div className="text-xs text-text-tertiary">{doc.caseId?.caseId || 'No Case'} • {doc.status}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.cases?.length > 0 && (
                    <div className="py-2 border-t border-border">
                      <div className="px-4 py-1 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                        Cases
                      </div>
                      {results.cases.map(c => (
                        <button
                          key={c._id}
                          onClick={() => handleResultClick(`/cases/${c._id}`)}
                          className="w-full text-left px-4 py-2 hover:bg-bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <Briefcase size={16} className="text-text-secondary" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">{c.caseId}</div>
                            <div className="text-xs text-text-tertiary">{c.title} • {c.priority}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.users?.length > 0 && (
                    <div className="py-2 border-t border-border">
                      <div className="px-4 py-1 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                        Users
                      </div>
                      {results.users.map(u => (
                        <button
                          key={u._id}
                          onClick={() => handleResultClick(`/admin/users`)}
                          className="w-full text-left px-4 py-2 hover:bg-bg-secondary flex items-center gap-3 transition-colors"
                        >
                          <User size={16} className="text-text-secondary" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">{u.name}</div>
                            <div className="text-xs text-text-tertiary">{u.email} • {u.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Space for future notifications / profile */}
      <div className="flex items-center gap-4">
        <NotificationDropdown />
      </div>
    </div>
  );
};

export default TopNav;
