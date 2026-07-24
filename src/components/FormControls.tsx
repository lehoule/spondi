"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icons";

export function RangeField({
  id,
  label,
  value,
  onChange,
  lowLabel = "None",
  highLabel = "Worst",
  icon,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="range-field">
      <div className="range-field__header">
        <label htmlFor={id}>
          {icon}
          {label}
        </label>
        <output htmlFor={id}>{value}</output>
      </div>
      <input
        aria-valuetext={`${value} out of 10`}
        id={id}
        max="10"
        min="0"
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-value": `${value * 10}%` } as React.CSSProperties}
        type="range"
        value={value}
      />
      <div className="range-field__anchors" aria-hidden="true">
        <span>0 · {lowLabel}</span>
        <span>10 · {highLabel}</span>
      </div>
    </div>
  );
}

export function ChipGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(
      values.includes(option)
        ? values.filter((item) => item !== option)
        : [...values, option],
    );
  };

  return (
    <fieldset className="chip-field">
      <legend>{label}</legend>
      <div className="chip-list">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              aria-pressed={selected}
              className={`chip${selected ? " chip--selected" : ""}`}
              key={option}
              onClick={() => toggle(option)}
              type="button"
            >
              {selected ? <Icon name="check" size={15} /> : null}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SegmentGroup({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  name: string;
}) {
  return (
    <fieldset className="segment-field">
      <legend>{label}</legend>
      <div className="segment-list">
        {options.map((option) => (
          <label key={option.value}>
            <input
              checked={value === option.value}
              name={name}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
