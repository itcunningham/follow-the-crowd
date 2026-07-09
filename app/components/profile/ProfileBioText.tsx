"use client";

import { useLayoutEffect, useRef, useState } from "react";

export default function ProfileBioText({ bio }: { bio: string }) {
  const text = bio.trim();
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = bioRef.current;

    if (!el || expanded) {
      return;
    }

    function measureOverflow() {
      const node = bioRef.current;

      if (!node) {
        return;
      }

      setShowToggle(node.scrollHeight > node.clientHeight + 1);
    }

    measureOverflow();
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [bio, expanded]);

  if (!text) {
    return null;
  }

  const canToggle = showToggle || expanded;

  return (
    <div className="mt-4">
      <p
        ref={bioRef}
        className={`whitespace-pre-wrap text-sm leading-relaxed text-ftc-text-secondary ${
          expanded ? "" : "line-clamp-4"
        }`}
      >
        {text}
      </p>
      {canToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-xs font-semibold text-ftc-primary transition hover:text-ftc-primary-dim"
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
