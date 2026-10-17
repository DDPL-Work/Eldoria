import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '../../constants/icons';
import { useStore } from '../../context/StoreContext';
import {
  fetchPackageCities,
  buildMergedCities
} from '../../services/indianCitiesService';

/**
 * FormCityDropdown Component with live searchable input
 * Matches the user screenshot UI:
 * - Direct searchable input inside the rounded trigger box
 * - Clean dropdown list attached below
 * - Selected / hovered item in solid blue (#1A73E8) with white text
 * - Thin slim scrollbar on right
 * - Includes all Indian cities from package seamlessly
 */
export function FormCityDropdown({
  value = '',
  onChange,
  placeholder = 'Select city...',
  className = '',
  disabled = false,
  error = false,
  id,
}) {
  const { cities, backendCities, cityName } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [dynamicCities, setDynamicCities] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load package cities asynchronously
  useEffect(() => {
    let mounted = true;
    fetchPackageCities().then((res) => {
      if (mounted && Array.isArray(res) && res.length > 0) {
        setDynamicCities(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Combine database cities, store cities, DEFAULT_CITIES, and package cities
  const allCities = useMemo(() => {
    const storeCities = typeof cities === 'function' ? cities() : [];
    return buildMergedCities({
      storeCities,
      backendCities,
      dynamicCities,
    });
  }, [cities, backendCities, dynamicCities]);

  // Resolve display name for the current selected value
  const selectedCityObj = useMemo(() => {
    if (!value) return null;
    const cleanVal = String(value).trim().toLowerCase();
    return allCities.find(
      (c) =>
        String(c.id).toLowerCase() === cleanVal ||
        String(c.name).toLowerCase() === cleanVal
    );
  }, [value, allCities]);

  const selectedDisplayName = selectedCityObj?.name || (value ? cityName(value) || value : '');

  // Keep input in sync with selected value when not actively typing
  useEffect(() => {
    if (!isEditing) {
      setSearchText(selectedDisplayName);
    }
  }, [selectedDisplayName, isEditing]);

  // Filter cities by search text
  const filteredCities = useMemo(() => {
    if (!isEditing) return allCities;
    const q = searchText.trim().toLowerCase();
    if (!q) return allCities;
    return allCities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.state && c.state.toLowerCase().includes(q)) ||
        c.id.includes(q)
    );
  }, [allCities, searchText, isEditing]);

  // Close on outside click and preserve custom typed city or revert if empty
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (isEditing) {
          setIsEditing(false);
          const trimmed = searchText.trim();
          if (trimmed) {
            const match = allCities.find(
              (c) =>
                c.name.toLowerCase() === trimmed.toLowerCase() ||
                c.id.toLowerCase() === trimmed.toLowerCase()
            );
            if (match) {
              onChange?.(match.id);
              setSearchText(match.name);
            } else {
              // Custom city entered by user
              const customId = trimmed.toLowerCase().replace(/\s+/g, '-');
              onChange?.(customId);
              setSearchText(trimmed);
            }
          } else {
            onChange?.('');
            setSearchText('');
          }
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allCities, isEditing, searchText, onChange]);

  // Auto-scroll selected item into view when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current && !isEditing) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, isEditing]);

  const handleSelect = (city) => {
    if (!city || !city.id) {
      onChange?.('');
      setSearchText('');
    } else {
      onChange?.(city.id);
      setSearchText(city.name);
    }
    setIsEditing(false);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    setIsEditing(true);
    setHighlightIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      // If full text is selectedDisplayName, select all text so user can easily overwrite
      if (inputRef.current && searchText === selectedDisplayName) {
        inputRef.current.select();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsEditing(false);
      setSearchText(selectedDisplayName);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filteredCities.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredCities[highlightIndex]) {
        handleSelect(filteredCities[highlightIndex]);
      } else if (filteredCities.length > 0) {
        handleSelect(filteredCities[0]);
      } else if (searchText.trim()) {
        const trimmed = searchText.trim();
        const match = allCities.find(
          (c) =>
            c.name.toLowerCase() === trimmed.toLowerCase() ||
            c.id.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) {
          handleSelect(match);
        } else {
          const customId = trimmed.toLowerCase().replace(/\s+/g, '-');
          onChange?.(customId);
          setSearchText(trimmed);
          setIsEditing(false);
          setIsOpen(false);
          setHighlightIndex(-1);
        }
      }
    }
  };

  // Scroll highlighted item into view during arrow key navigation
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Searchable Input Trigger Box matching screenshot */}
      <div
        className={`w-full rounded-lg border bg-white px-3.5 py-1.5 text-xs sm:text-[13px] shadow-2xs transition h-[40px] flex items-center justify-between cursor-text ${
          error
            ? 'border-red-400 focus-within:ring-1 focus-within:ring-red-400'
            : isOpen
            ? 'border-[#0E2F5A] ring-1 ring-[#0E2F5A]'
            : 'border-slate-200 hover:border-slate-300 focus-within:ring-1 focus-within:ring-[#0E2F5A] focus-within:border-[#0E2F5A]'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            if (!isOpen) setIsOpen(true);
          }
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
          value={searchText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent text-slate-900 text-xs sm:text-[13px] font-normal focus:outline-none placeholder-slate-400 cursor-text py-0.5"
        />

        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
          {isEditing && searchText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchText('');
                setIsEditing(true);
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
              title="Clear"
            >
              ✕
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                  setIsEditing(false);
                  setSearchText(selectedDisplayName);
                } else {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }
              }
            }}
            className="text-slate-700 hover:text-slate-900 cursor-pointer p-0.5"
            aria-label="Toggle dropdown"
          >
            <Icon
              name="down"
              size={12}
              className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Popup List matching exact user screenshot */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-full mt-1 w-full bg-white rounded-lg border border-slate-300 shadow-xl z-50 max-h-72 overflow-y-auto thin-scrollbar py-1 animate-in fade-in zoom-in-95 duration-75"
        >
          {/* Default Unselected Option: Select city… */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            data-selected={!value ? 'true' : 'false'}
            onClick={() => handleSelect(null)}
            className={`w-full text-left px-3.5 py-1.5 text-xs sm:text-[13px] italic transition-colors cursor-pointer select-none block truncate border-b border-slate-100 ${
              !value
                ? 'bg-[#1A73E8] text-white font-medium not-italic'
                : 'text-slate-400 hover:bg-[#1A73E8] hover:text-white'
            }`}
          >
            Select city…
          </button>

          {/* Add custom city option if user typed text that does not exactly match */}
          {isEditing && searchText.trim() && !allCities.some(
            (c) => c.name.toLowerCase() === searchText.trim().toLowerCase()
          ) && (
            <button
              type="button"
              onClick={() => {
                const trimmed = searchText.trim();
                const customId = trimmed.toLowerCase().replace(/\s+/g, '-');
                onChange?.(customId);
                setSearchText(trimmed);
                setIsEditing(false);
                setIsOpen(false);
                setHighlightIndex(-1);
              }}
              className="w-full text-left px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-[#0E2F5A] bg-amber-50 hover:bg-[#1A73E8] hover:text-white border-b border-amber-200/60 flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base font-bold leading-none text-amber-600">+</span>
                <span>Add &ldquo;{searchText.trim()}&rdquo; as city</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0 ml-2">
                New
              </span>
            </button>
          )}

          {filteredCities.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-slate-400 text-center">
              No matching city found. Click above to add as custom city.
            </div>
          ) : (
            filteredCities.map((c, idx) => {
              const isSelected =
                selectedCityObj?.id === c.id ||
                String(value).trim().toLowerCase() === String(c.id).toLowerCase() ||
                String(value).trim().toLowerCase() === String(c.name).toLowerCase();

              const isHighlighted = highlightIndex === idx;

              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-index={idx}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-3.5 py-1.5 text-xs sm:text-[13px] font-normal transition-colors cursor-pointer select-none block truncate ${
                    isSelected || isHighlighted
                      ? 'bg-[#1A73E8] text-white'
                      : 'text-slate-800 hover:bg-[#1A73E8] hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default FormCityDropdown;
