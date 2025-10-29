import React, {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

import toolbarStyles from './PageToolbar.module.css';
import searchStyles from './PageSearch.module.css';

type BreakpointQuery = string;

type PageToolbarSearchRenderProps = {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  variant: 'desktop' | 'mobile';
  close: () => void;
  isMobile: boolean;
};

type BaseDivProps = React.HTMLAttributes<HTMLDivElement>;

export type PageToolbarProps = BaseDivProps & {
  primary?: ReactNode;
  filters?: ReactNode;
  search?:
    | ReactElement<PageToolbarSearchProps>
    | ((props: PageToolbarSearchRenderProps) => ReactElement | null);
  searchToggleAriaLabels?: {
    open: string;
    close: string;
  };
  filtersAriaLabel?: string;
  filtersRole?: React.AriaRole;
};

export type PageToolbarSearchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type' | 'size'
> & {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  clearAriaLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'desktop' | 'mobile';
  inputRef?: React.MutableRefObject<HTMLInputElement | null> | ((node: HTMLInputElement | null) => void);
};

function useBreakpoint(query: BreakpointQuery) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    updateMatch();
    media.addEventListener('change', updateMatch);

    return () => {
      media.removeEventListener('change', updateMatch);
    };
  }, [query]);

  return matches;
}

function assignInputRef(
  providedRef: PageToolbarSearchProps['inputRef'],
  node: HTMLInputElement | null,
) {
  if (!providedRef) {
    return;
  }

  if (typeof providedRef === 'function') {
    providedRef(node);
    return;
  }

  // Mutable ref object
  // eslint-disable-next-line no-param-reassign
  (providedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
}

export function PageToolbarSearch({
  value,
  onChange,
  onClear,
  clearAriaLabel = 'Clear search',
  placeholder,
  ariaLabel,
  'aria-label': ariaLabelAttr,
  disabled = false,
  className,
  style,
  variant = 'desktop',
  inputRef,
  ...inputProps
}: PageToolbarSearchProps) {
  const wrapperClassName = useMemo(() => {
    if (!className) {
      return searchStyles.shell;
    }
    return `${searchStyles.shell} ${className}`;
  }, [className]);

  const handleInputRef = (node: HTMLInputElement | null) => assignInputRef(inputRef, node);

  return (
    <div
      className={wrapperClassName}
      data-variant={variant}
      data-disabled={disabled ? 'true' : undefined}
      style={style}
    >
      <FiSearch className={searchStyles.icon} aria-hidden />
      <input
        ref={handleInputRef}
        type="search"
        className={searchStyles.input}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? ariaLabelAttr ?? placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      {value && onClear ? (
        <button
          type="button"
          className={searchStyles.clearButton}
          onClick={() => {
            onClear();
          }}
          aria-label={clearAriaLabel}
        >
          <FiX aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function PageToolbar({
  primary,
  search,
  filters,
  className,
  searchToggleAriaLabels = { open: 'Show search', close: 'Hide search' },
  filtersAriaLabel,
  filtersRole,
  ...rest
}: PageToolbarProps) {
  const isCompact = useBreakpoint('(max-width: 720px)');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    if (!isCompact) {
      setIsMobileSearchOpen(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (isCompact && isMobileSearchOpen) {
      window.requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
  }, [isCompact, isMobileSearchOpen]);

  const variant: 'desktop' | 'mobile' = isCompact ? 'mobile' : 'desktop';
  const shouldRenderSearch = Boolean(search) && (!isCompact || isMobileSearchOpen);

  const renderedSearch = useMemo(() => {
    if (!shouldRenderSearch || !search) {
      return null;
    }

    const closeSearch = () => setIsMobileSearchOpen(false);

    if (typeof search === 'function') {
      return search({
        inputRef: searchInputRef,
        variant,
        close: closeSearch,
        isMobile: isCompact,
      });
    }

    if (isValidElement(search)) {
      return cloneElement(search, {
        inputRef: searchInputRef,
        variant,
      });
    }

    return search;
  }, [isCompact, search, shouldRenderSearch, variant]);

  const containerClassName = useMemo(() => {
    if (!className) {
      return toolbarStyles.toolbar;
    }
    return `${toolbarStyles.toolbar} ${className}`;
  }, [className]);

  return (
    <div className={containerClassName} data-compact={isCompact ? 'true' : undefined} {...rest}>
      {primary ? <div className={toolbarStyles.primaryArea}>{primary}</div> : null}
      {shouldRenderSearch ? <div className={toolbarStyles.searchArea}>{renderedSearch}</div> : null}
      {(filters || (search && isCompact)) ? (
        <div
          className={toolbarStyles.filtersArea}
          role={filtersRole ?? (filtersAriaLabel ? 'group' : undefined)}
          aria-label={filtersAriaLabel}
        >
          {search && isCompact ? (
            <button
              type="button"
              className={toolbarStyles.searchToggleButton}
              onClick={() => {
                setIsMobileSearchOpen((value) => !value);
              }}
              aria-label={isMobileSearchOpen ? searchToggleAriaLabels.close : searchToggleAriaLabels.open}
              data-active={isMobileSearchOpen ? 'true' : undefined}
            >
              <FiSearch aria-hidden />
            </button>
          ) : null}
          {filters}
        </div>
      ) : null}
    </div>
  );
}

export default PageToolbar;
