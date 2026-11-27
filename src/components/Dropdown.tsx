// Adapted from zDeck's Dropdown (MIT, Zane Helton); see Dropdown.LICENSE.
import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Shared text dropdown for choosing a value. Mirrors the inspector's icon
 * disclosure: a bordered trigger with a value and a menu of checked rows.
 */
export function Dropdown({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ above: false, maxHeight: 280 });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((option) => option.value === value) ?? options[0];
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open || !root.current || !menu.current) return;
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect();
      let top = 4, bottom = window.innerHeight - 4;
      for (let parent = root.current!.parentElement; parent; parent = parent.parentElement) {
        if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) continue;
        const bounds = parent.getBoundingClientRect();
        top = Math.max(top, bounds.top + 4); bottom = Math.min(bottom, bounds.bottom - 4);
      }
      const below = bottom - rect.bottom - 4, above = rect.top - top - 4;
      const flip = below < Math.min(280, menu.current!.scrollHeight) && above > below;
      setPlacement({ above: flip, maxHeight: Math.max(48, Math.min(280, flip ? above : below)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <div
      className="dropdown" ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        if (!open && !disabled && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      <button
        ref={trigger} type="button" className="dropdown-trigger"
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        aria-label={`${label}: ${current?.label ?? ""}`} aria-description={current?.description} disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="dropdown-label">{label}</span>
        <span className="dropdown-value">{current?.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menu} id={id} className={`dropdown-menu${placement.above ? " is-above" : ""}`} style={{ maxHeight: placement.maxHeight }} role="menu" aria-label={label}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const rows = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? []);
            const index = rows.indexOf(document.activeElement as HTMLElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1
              : (index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
            rows[next]?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.value} type="button" role="menuitemradio" tabIndex={-1}
              aria-checked={option.value === value} aria-label={option.label} aria-description={option.description}
              disabled={option.disabled}
              onClick={() => { if (!option.disabled) { onChange(option.value); close(); } }}
            >
              <span className="dropdown-option-copy"><span className="dropdown-option-label">{option.label}</span>{option.description ? <span className="dropdown-option-description">{option.description}</span> : null}</span>
              <span className="dropdown-check" aria-hidden="true">{option.value === value ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
