import { useMemo, useRef } from 'react';

import styles from './SegmentedControl.module.css';

const TONE_CLASS_MAP = {
  negative: styles.segmentedControlThumbNegative,
  positive: styles.segmentedControlThumbPositive,
  neutral: styles.segmentedControlThumbNeutral,
};

const normalizeTone = (tone) => {
  if (tone === 'negative' || tone === 'positive') {
    return tone;
  }
  return 'neutral';
};

export default function SegmentedControl({
  options,
  value,
  onChange,
  name,
  className = '',
  ariaLabel,
}) {
  const optionRefs = useRef([]);

  const { activeIndex, activeTone, optionCount, selectedValue } = useMemo(() => {
    const count = Array.isArray(options) ? options.length : 0;
    if (!count) {
      return { activeIndex: 0, activeTone: 'neutral', optionCount: 0, selectedValue: null };
    }

    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    const fallbackTone =
      options[currentIndex]?.tone ??
      options[0]?.tone ??
      'neutral';

    return {
      activeIndex: currentIndex,
      activeTone: normalizeTone(fallbackTone),
      optionCount: count,
      selectedValue: options[currentIndex]?.value ?? options[0]?.value ?? null,
    };
  }, [options, value]);

  const handleSelect = (nextValue) => {
    if (!onChange || nextValue === value) {
      return;
    }
    onChange(nextValue);
  };

  const focusOptionAt = (index) => {
    optionRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, currentIndex) => {
    if (!Array.isArray(options) || options.length === 0) {
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    const nextOption = options[nextIndex];
    if (!nextOption) {
      return;
    }

    event.preventDefault();
    handleSelect(nextOption.value);
    focusOptionAt(nextIndex);
  };

  const wrapperClassNames = [styles.segmentedControl];
  if (className) {
    wrapperClassNames.push(className);
  }

  const thumbClassNames = [styles.segmentedControlThumb];
  thumbClassNames.push(TONE_CLASS_MAP[normalizeTone(activeTone)]);

  const ariaProps = {};
  if (ariaLabel) {
    ariaProps['aria-label'] = ariaLabel;
  }

  return (
    <div
      className={wrapperClassNames.join(' ')}
      role="radiogroup"
      {...ariaProps}
    >
      <div className={styles.segmentedControlTrack}>
        {optionCount > 0 ? (
          <span
            className={thumbClassNames.join(' ')}
            style={{
              width: `${100 / optionCount}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
            aria-hidden
          />
        ) : null}

        {Array.isArray(options)
          ? options.map((option, index) => {
              const optionTone = normalizeTone(option.tone);
              const isActive = option.value === selectedValue;
              const optionClassNames = [
                styles.segmentedControlOption,
                styles[`segmentedControlOption${optionTone[0].toUpperCase()}${optionTone.slice(1)}`],
              ];
              if (isActive) {
                optionClassNames.push(styles.segmentedControlOptionActive);
              }
              const optionId = name ? `${name}-${option.value}` : undefined;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={optionClassNames.join(' ')}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  name={name}
                  id={optionId}
                >
                  {option.label}
                </button>
              );
            })
          : null}
      </div>
    </div>
  );
}
