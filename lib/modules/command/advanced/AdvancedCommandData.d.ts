import type AdvancedCommand from "./AdvancedCommand";
import type AdvancedCommandController from "./AdvancedCommandController";
export declare type AdvancedCommandData<T extends object> = {
    context: T;
    controller: AdvancedCommandController;
} & Partial<AdvancedCommand<T>>;
