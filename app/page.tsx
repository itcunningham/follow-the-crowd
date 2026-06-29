"use client";

import { useState } from "react";

type EventForm = {
  eventName: string;
  venue: string;
  city: string;
  eventType: string;
  genre: string;
  date: string;
  capacity: string;
  budget: string;
};

const initialForm: EventForm = {
  eventName: "",
  venue: "",
  city: "",
  eventType: "",
  genre: "",
  date: "",
  capacity: "",
  budget: "",
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [form, setForm] = useState<EventForm>(initialForm);

  function updateField(key: keyof EventForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
              FC
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Follow The Crowd
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-zinc-600 sm:flex">
            <button
              type="button"
              onClick={() => scrollTo("create-event")}
              className="transition hover:text-zinc-900"
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={() => scrollTo("learn-more")}
              className="transition hover:text-zinc-900"
            >
              Platform
            </button>
          </nav>
          <button
            type="button"
            onClick={() => scrollTo("create-event")}
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Get started
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-6 inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              AI-powered event planning &amp; crowd intelligence
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl sm:leading-[1.08]">
              Plan Better Events with AI.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Follow The Crowd helps promoters discover venues, optimise events,
              predict attendance and plan successful shows.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollTo("create-event")}
                className="w-full rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
              >
                Generate Event Plan
              </button>
              <button
                type="button"
                onClick={() => scrollTo("learn-more")}
                className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Preview strip */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
              <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                <span className="ml-3 text-xs text-zinc-400">
                  followthecrowd.app / dashboard
                </span>
              </div>
              <div className="grid gap-px bg-zinc-100 sm:grid-cols-3">
                {[
                  { label: "Predicted attendance", value: "842", delta: "+12%" },
                  { label: "Venue match score", value: "94", delta: "Excellent" },
                  { label: "Budget efficiency", value: "£4.2k", delta: "On track" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white px-6 py-5">
                    <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">{stat.delta}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learn more */}
      <section id="learn-more" className="border-b border-zinc-200/80 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to fill the room
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">
              Built for promoters, DJs, venues, artists, festivals and event
              organisers who need smarter decisions — not more spreadsheets.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                title: "Venue discovery",
                description:
                  "Surface the right spaces based on capacity, genre, location and audience profile.",
              },
              {
                title: "Crowd intelligence",
                description:
                  "Understand demand signals and predict turnout before you commit to a date.",
              },
              {
                title: "Event optimisation",
                description:
                  "Refine lineups, pricing and marketing with AI recommendations tailored to your brief.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold shadow-sm ring-1 ring-zinc-200">
                  ✦
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
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
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Create an Event
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">
              Share the details of your show and we&apos;ll build an intelligent
              plan around it.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Event Name"
                  placeholder="Summer Sessions 2026"
                  value={form.eventName}
                  onChange={(v) => updateField("eventName", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Venue"
                  placeholder="Printworks"
                  value={form.venue}
                  onChange={(v) => updateField("venue", v)}
                />
                <Field
                  label="City"
                  placeholder="Manchester"
                  value={form.city}
                  onChange={(v) => updateField("city", v)}
                />
                <Field
                  label="Event Type"
                  placeholder="Club night, festival, live show…"
                  value={form.eventType}
                  onChange={(v) => updateField("eventType", v)}
                />
                <Field
                  label="Genre"
                  placeholder="House, techno, hip-hop…"
                  value={form.genre}
                  onChange={(v) => updateField("genre", v)}
                />
                <Field
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(v) => updateField("date", v)}
                />
                <Field
                  label="Expected Capacity"
                  placeholder="500"
                  value={form.capacity}
                  onChange={(v) => updateField("capacity", v)}
                />
                <Field
                  label="Budget"
                  placeholder="£10,000"
                  value={form.budget}
                  onChange={(v) => updateField("budget", v)}
                  className="sm:col-span-2"
                />
              </div>

              <button
                type="button"
                className="mt-8 w-full rounded-xl bg-zinc-900 px-6 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
              >
                Generate AI Event Plan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
              FC
            </div>
            <span className="text-sm font-medium text-zinc-900">
              Follow The Crowd
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            AI event planning for the live industry.
          </p>
        </div>
      </footer>
    </div>
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
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5"
      />
    </label>
  );
}
