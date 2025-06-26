import type { AdvancedCommandContext } from "./AdvancedCommandContext";
import type { AdvancedCommandNextOptions } from "./AdvancedCommandNext";
import type { AdvancedCommandStopOptions } from "./AdvancedCommandStop";
export declare type AdvancedCommandJob<T extends object> = {
    context: AdvancedCommandContext<T>;
    saveTaskContext: AdvancedCommandSaveJob<T>;
    nextTask: AdvancedCommandNextJob<T>;
    stopTask: AdvancedCommandStopJob;
};
export declare type AdvancedCommandSaveJob<T extends object> = (data: T) => Promise<void> | void;
export declare type AdvancedCommandNextJob<T extends object> = (options?: Partial<AdvancedCommandNextOptions<T>>) => Promise<void> | void;
export declare type AdvancedCommandStopJob = (options?: Partial<AdvancedCommandStopOptions>) => Promise<void> | void;
