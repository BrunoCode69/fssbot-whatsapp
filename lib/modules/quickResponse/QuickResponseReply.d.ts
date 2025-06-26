import type { QuickResponsePattern } from "./QuickResponsePattern";
import type Message from "../../messages/Message";
/** Resposta da resposta rápida */
export declare type QuickResponseReply = string | Message | CustomQuickResponseReply;
/** Resposta customizada da resposta rápida */
export declare type CustomQuickResponseReply = (message: Message, pattern: QuickResponsePattern) => any;
