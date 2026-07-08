import type { CrewChatUnlockState } from "@/lib/events/crewChatUnlock";

export type CrewChatEventActions = {
  isUnlocked: boolean;
  canPlannerStart: boolean;
  acceptedDjCount: number;
  showStartCrewChatAction: boolean;
  showEventGroupChatAction: boolean;
  showCrewChatHelpUi: boolean;
  crewChatHelpActionLabel: string;
};

export function computeCrewChatEventActions(input: {
  unlock: CrewChatUnlockState | null;
  isOwner: boolean;
  isPlanner: boolean;
  eventIsCancelled: boolean;
  hasAcceptedBooking: boolean;
}): CrewChatEventActions {
  const { unlock, isOwner, isPlanner, eventIsCancelled, hasAcceptedBooking } = input;
  const isUnlocked = unlock?.isUnlocked === true;
  const canPlannerStart = unlock?.canPlannerStart === true;
  const acceptedDjCount = unlock?.acceptedDjCount ?? 0;
  const crewChatStartedAt = unlock?.crewChatStartedAt ?? null;

  const showStartCrewChatAction =
    isOwner && isPlanner && !eventIsCancelled && canPlannerStart;

  const showEventGroupChatAction =
    !showStartCrewChatAction &&
    !eventIsCancelled &&
    isUnlocked &&
    crewChatStartedAt !== null &&
    !canPlannerStart &&
    acceptedDjCount >= 1 &&
    ((isOwner && isPlanner) || hasAcceptedBooking);

  const showCrewChatHelpUi = showStartCrewChatAction;

  return {
    isUnlocked,
    canPlannerStart,
    acceptedDjCount,
    showStartCrewChatAction,
    showEventGroupChatAction,
    showCrewChatHelpUi,
    crewChatHelpActionLabel: showStartCrewChatAction ? "Start group chat" : "Group chat",
  };
}
