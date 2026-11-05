"use client";

import { useRef, type KeyboardEvent } from "react";
import "./navigation.css";

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  id: string;
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % options.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    if (options[next].value !== value) onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div className={`segmented-control ${className}`}>
      <div role="tablist" aria-label={label} className="relative flex">
        <span
          aria-hidden="true"
          className="segment-indicator"
          style={{ width: `${100 / options.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        {options.map((option, index) => (
          <button
            key={option.value}
            ref={(node) => { buttons.current[index] = node; }}
            type="button"
            role="tab"
            id={`${id}-tab-${option.value}`}
            aria-selected={option.value === value}
            aria-controls={`${id}-panel`}
            tabIndex={option.value === value ? 0 : -1}
            onClick={() => { if (option.value !== value) onChange(option.value); }}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="segment-button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
