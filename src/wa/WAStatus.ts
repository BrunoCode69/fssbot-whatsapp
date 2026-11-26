export type WAPresence = "composing" | "recording" | "available" | "unavailable" | "paused";

import ChatStatus from "../modules/chat/ChatStatus";

export const WAStatus: Record<ChatStatus, WAPresence> = {
  [ChatStatus.Typing]: "composing",
  [ChatStatus.Recording]: "recording",
  [ChatStatus.Online]: "available",
  [ChatStatus.Offline]: "unavailable",
  [ChatStatus.Paused]: "paused",
};
