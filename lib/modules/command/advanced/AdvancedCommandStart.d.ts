import type { AdvancedCommandContext } from "./AdvancedCommandContext";
export declare type AdvancedCommandStartOptions<T extends object> = {
    chatId: string;
    context: AdvancedCommandContext<T>;
    taskId: string;
};
export declare type PartialAdvancedCommandStartOptions<T extends object> = {
    chatId: string;
    context?: Partial<AdvancedCommandContext<T>>;
    taskId?: string;
};
