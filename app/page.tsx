"use client";

import Link from "next/link";
import { useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "./components/AppNavigation";
import FtcDatePicker from "./components/FtcDatePicker";
import OnboardingGuard from "./components/OnboardingGuard";
import VenueMap from "./components/VenueMap";
import { requestEventPlan } from "@/lib/client/generate-event-plan";
import { emptyEventBrief, type EventBrief, type Venue } from "@/lib/domain/event";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [form, setForm] = useState<EventBrief>(emptyEventBrief);
  const [result, setResult] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);

  function updateField(key: keyof EventBrief, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generateEventPlan() {
    setLoading(true);
    setResult("");
    setVenues([]);

    try {
      const data = await requestEventPlan(form);
      setResult(data.result);
      setVenues(data.venues ?? []);
    } catch {
      setResult("Unable to generate a plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingGuard>
    <div className={`min-h-full bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}>
      <AppNavigation />
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-ftc-border bg-ftc-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-ftc-primary/25 bg-ftc-surface text-xs font-bold tracking-wider text-ftc-primary">
              FTC
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-ftc-text">
              Follow The Crowd
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wider text-ftc-text-muted sm:flex">
            <button
              type="button"
              onClick={() => scrollTo("create-event")}
              className="transition hover:text-ftc-primary"
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={() => scrollTo("learn-more")}
              className="transition hover:text-ftc-primary"
            >
              Platform
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ftc-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(111,228,255,0.14),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,rgba(56,189,248,0.08),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_60%,rgba(37,99,235,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center rounded-full border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
              Crowd intel for Promoters
            </p>
            <h1 className="text-4xl font-bold uppercase tracking-tight text-ftc-text sm:text-6xl sm:leading-[1.05]">
              Plan Better Events with AI.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ftc-text-secondary sm:text-xl">
              Follow The Crowd reads the room before you lock the date — venue
              intel, crowd signals, and plans built for nights that actually hit.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollTo("create-event")}
                className="w-full rounded-xl border border-ftc-primary/45 bg-ftc-primary/10 px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-ftc-primary/80 transition hover:border-ftc-primary/55 hover:bg-ftc-primary/15 sm:w-auto"
              >
                Generate Event Plan
              </button>
              <Link
                href="/events"
                className="w-full rounded-xl border border-ftc-primary/30 bg-ftc-primary/10 px-6 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-ftc-primary/90 transition hover:border-ftc-primary/45 hover:bg-ftc-primary/12 sm:w-auto"
              >
                Plan an event
              </Link>
              <button
                type="button"
                onClick={() => scrollTo("learn-more")}
                className="w-full rounded-xl border border-ftc-border-strong bg-ftc-surface/60 px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-ftc-text-secondary shadow-sm transition hover:border-ftc-primary/35 hover:text-ftc-primary sm:w-auto"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Preview strip */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-ftc-border bg-ftc-bg-elevated shadow-ftc-card">
              <div className="flex items-center gap-2 border-b border-ftc-border bg-ftc-surface/80 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-ftc-primary/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-ftc-primary/70" />
                <span className="ml-3 min-w-0 truncate font-mono text-xs text-ftc-text-muted">
                  followthecrowd.app / backroom
                </span>
              </div>
              <div className="grid gap-px bg-ftc-surface-raised sm:grid-cols-3">
                {[
                  {
                    label: "Predicted pull",
                    value: "842",
                    delta: "+12% vs last drop",
                  },
                  {
                    label: "Venue match",
                    value: "94",
                    delta: "Warehouse ready",
                  },
                  {
                    label: "Budget burn",
                    value: "$4,200",
                    delta: "On track",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="bg-ftc-bg-elevated px-6 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-muted">
                      {stat.label}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-ftc-text">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs font-medium text-ftc-primary">
                      {stat.delta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn more */}
      <section
        id="learn-more"
        className="border-b border-ftc-border bg-[#0a0a0b] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold uppercase tracking-tight text-ftc-text sm:text-4xl">
              Built to fill warehouses, basements &amp; dancefloors
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ftc-text-secondary">
              For promoters, DJs, venues, artists, festivals and crews who move
              culture — not corporate decks.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Venue discovery",
                description:
                  "Find the right room — raw warehouse, basement club, or late-night spot — matched to your sound and crowd.",
              },
              {
                title: "Crowd intelligence",
                description:
                  "Read demand before you announce. Know who's coming, what they're into, and when the city is ready.",
              },
              {
                title: "Event optimisation",
                description:
                  "Dial in lineups, door price, and promo with AI tuned to underground economics — from $500 room hires to $50,000 festivals.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-ftc-border bg-ftc-bg-elevated/80 p-6 transition hover:border-ftc-primary/25"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-ftc-border bg-ftc-surface text-sm font-bold text-ftc-primary">
                  ✦
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-ftc-text">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ftc-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Create an Event */}
      <section id="create-event" className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold uppercase tracking-tight text-ftc-text sm:text-4xl">
              Create an Event
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ftc-text-secondary">
              Drop the details on your next night. We&apos;ll build a plan that
              respects the culture and the budget.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="rounded-2xl border border-ftc-border bg-ftc-bg-elevated p-6 shadow-ftc-card sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Event Name"
                  placeholder="Afterhours Vol. 3"
                  value={form.eventName}
                  onChange={(v) => updateField("eventName", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Venue"
                  placeholder="The Warehouse"
                  value={form.venue}
                  onChange={(v) => updateField("venue", v)}
                />
                <Field
                  label="City"
                  placeholder="Melbourne"
                  value={form.city}
                  onChange={(v) => updateField("city", v)}
                />
                <Field
                  label="Event Type"
                  placeholder="Warehouse rave, club night, afterparty…"
                  value={form.eventType}
                  onChange={(v) => updateField("eventType", v)}
                />
                <Field
                  label="Genre"
                  placeholder="Techno, house, bass, experimental…"
                  value={form.genre}
                  onChange={(v) => updateField("genre", v)}
                />
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
                    Date
                  </span>
                  <FtcDatePicker
                    value={form.date}
                    onChange={(value) => updateField("date", value)}
                    ariaLabel="Event date"
                  />
                </label>
                <Field
                  label="Expected Capacity"
                  placeholder="500"
                  value={form.capacity}
                  onChange={(v) => updateField("capacity", v)}
                />
                <Field
                  label="Budget (AUS)"
                  placeholder="$10,000"
                  value={form.budget}
                  onChange={(v) => updateField("budget", v)}
                  className="sm:col-span-2"
                />
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-ftc-border">
                <div className="border-b border-ftc-border bg-ftc-surface/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-muted">
                    Venue map
                  </p>
                </div>
                <div className="h-[280px] sm:h-[320px]">
                  <VenueMap venues={venues} />
                </div>
              </div>

              <button
                type="button"
                onClick={generateEventPlan}
                disabled={loading}
                className="ftc-btn-primary mt-8 w-full px-6 py-4 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate AI Event Plan"}
              </button>

              {result ? (
                <div className="mt-6 rounded-xl border border-ftc-border bg-ftc-surface/80 p-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-muted">
                    Your event plan
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ftc-text">
                    {result}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ftc-border bg-[#0a0a0b] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-ftc-primary/25 bg-ftc-surface text-[10px] font-bold text-ftc-primary">
              FTC
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.1em] text-ftc-text">
              Follow The Crowd
            </span>
          </div>
          <p className="text-sm text-ftc-text-muted">
            Built in the scene. For the scene.
          </p>
        </div>
      </footer>
    </div>
    </OnboardingGuard>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="ftc-input px-3.5 py-2.5"
      />
    </label>
  );
}
