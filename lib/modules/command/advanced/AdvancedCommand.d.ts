import type { AdvancedCommandNextOptions } from './AdvancedCommandNext';
import type { AdvancedCommandStopOptions } from './AdvancedCommandStop';
import type { PartialAdvancedCommandStartOptions } from './AdvancedCommandStart';
import type { AdvancedCommandData } from './AdvancedCommandData';
import type { AdvancedCommandTask } from './AdvancedCommandTask';
import type { AdvancedCommandOptions } from './AdvancedCommandOptions';
import type { AdvancedCommandContext } from './AdvancedCommandContext';
import type AdvancedCommandController from './AdvancedCommandController';
export default class AdvancedCommand<T extends object = object> {
    id: string;
    clientId: string;
    controller: AdvancedCommandController;
    initialContext: AdvancedCommandContext<T>;
    tasks: Record<string, AdvancedCommandTask<T>>;
    options: Partial<AdvancedCommandOptions>;
    constructor(data: AdvancedCommandData<T>);
    injectContext(data: Partial<AdvancedCommandData<T>>): void;
    saveContext(nowContext: AdvancedCommandContext<T>, data?: T): Promise<void>;
    addTask(id: string, task: AdvancedCommandTask<T>): void;
    start(options: PartialAdvancedCommandStartOptions<T>): Promise<void>;
    next(nowContext: AdvancedCommandContext<T>, options?: Partial<AdvancedCommandNextOptions<T>>): Promise<void>;
    stop(nowContext: AdvancedCommandContext<T>, options?: Partial<AdvancedCommandStopOptions>): Promise<void>;
}
