export type WAPresence = "composing" | "recording" | "available" | "unavailable" | "paused";
import ChatStatus from "../modules/chat/ChatStatus";
export declare const WAStatus: Record<ChatStatus, WAPresence>;
