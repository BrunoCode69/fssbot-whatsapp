import type { Message } from "../../../messages";
export declare type AdvancedCommandContext<D extends object> = {
    clientId: string;
    commandId: string;
    taskId: string;
    isRun: boolean;
    attemptsMade: number;
    message: Message;
    chatId: string;
} & D;
