"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icons";

type ModalProps = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  wide?: boolean;
};

export function Modal({
  children,
  title,
  eyebrow,
  onClose,
  wide = false,
}: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className={`modal-card${wide ? " modal-card--wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            aria-label="Close dialog"
            className="icon-button"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
