"use client";

export default function ProfileTextBlock({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ftc-text-secondary">{text}</p>
  );
}
