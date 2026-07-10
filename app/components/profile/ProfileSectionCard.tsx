"use client";

export default function ProfileSectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ftc-border-subtle bg-ftc-surface p-4 sm:p-5">
      <h2 className="ftc-profile-section-label">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
