"use client";

import type { ReactNode } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import MessagesInboxComposeButton from "@/app/components/dm/MessagesInboxComposeButton";
import MessagesInboxSearchBar from "@/app/components/dm/MessagesInboxSearchBar";

type InboxTab = "dm" | "group";

function InboxTabButton({
  active,
  label,
  mobileLabel,
  unreadCount = 0,
  showUnreadBadge = true,
  onClick,
}: {
  active: boolean;
  label: string;
  mobileLabel?: string;
  unreadCount?: number;
  showUnreadBadge?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={!onClick}
      className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm transition sm:gap-2 sm:px-4 ${
        active ? "ftc-tab-pill-active" : "ftc-tab-pill-inactive"
      } ${onClick ? "" : "cursor-default"}`}
    >
      <span className="min-w-0 truncate">
        <span className="sm:hidden">{mobileLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      {showUnreadBadge && unreadCount > 0 ? (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none ${
            active ? "bg-ftc-bg text-ftc-primary" : "bg-ftc-primary text-ftc-bg"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export default function MessagesInboxLayout({
  activeTab,
  searchQuery = "",
  onSearchChange,
  onCompose,
  onSelectTab,
  dmUnreadCount = 0,
  groupUnreadCount = 0,
  children,
}: {
  activeTab: InboxTab;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onCompose?: () => void;
  onSelectTab?: (tab: InboxTab) => void;
  dmUnreadCount?: number;
  groupUnreadCount?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
    >
      <AppNavigation />
      <header className="sticky top-0 z-10 border-b border-ftc-border-subtle bg-ftc-bg/95 px-4 py-3 backdrop-blur-md sm:px-6 md:top-12">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-ftc-text">Messages</h1>
          {onCompose ? (
            <MessagesInboxComposeButton onClick={onCompose} />
          ) : null}
        </div>

        <div className="mt-3">
          <MessagesInboxSearchBar
            value={searchQuery}
            onChange={onSearchChange ?? (() => {})}
          />
        </div>

        <div className="ftc-tab-pill mt-3" role="tablist" aria-label="Message categories">
          <InboxTabButton
            active={activeTab === "dm"}
            label="Messages"
            unreadCount={dmUnreadCount}
            onClick={onSelectTab ? () => onSelectTab("dm") : undefined}
          />
          <InboxTabButton
            active={activeTab === "group"}
            label="Group Chats"
            mobileLabel="Groups"
            unreadCount={groupUnreadCount}
            onClick={onSelectTab ? () => onSelectTab("group") : undefined}
          />
        </div>
      </header>

      <div className="flex-1 px-4 py-3 sm:px-6">{children}</div>
    </div>
  );
}
