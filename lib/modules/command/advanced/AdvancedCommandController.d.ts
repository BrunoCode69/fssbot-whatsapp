import type { AdvancedCommandData } from './AdvancedCommandData';
import type { AdvancedCommandContext } from './AdvancedCommandContext';
import type { AdvancedCommandStartOptions } from './AdvancedCommandStart';
import type { Message } from '../../../messages';
import NodeCache from 'node-cache';
import AdvancedCommand from './AdvancedCommand';
export default class AdvancedCommandController {
    clientId: string;
    cache: NodeCache;
    commands: Record<string, AdvancedCommand>;
    constructor(clientId: string);
    prepareCommand<T extends object>(command: AdvancedCommand<T>): AdvancedCommand<T>;
    createCommand<T extends object>(commandData: Partial<AdvancedCommandData<T>> & {
        context: T;
    }): AdvancedCommand<T>;
    setCommands(...commands: AdvancedCommand[]): void;
    addCommand<T extends object = object>(command: AdvancedCommand<T>): void;
    addCommands(...commands: AdvancedCommand[]): void;
    removeCommand(command: AdvancedCommand | string): boolean;
    removeCommands(...commands: AdvancedCommand[]): void;
    getCommand<T extends object = object>(id: string): AdvancedCommand<T> | undefined;
    getCommands(): AdvancedCommand[];
    hasCommand(id: string): boolean;
    execCommand<T extends object = object>(commandId: string, message: Message, options?: Partial<AdvancedCommandStartOptions<T>>): Promise<void>;
    saveContext<T extends object>(command: AdvancedCommand<T>, context: AdvancedCommandContext<T>): Promise<void> | void;
    clearContext<T extends object>(command: AdvancedCommand<T>, chatId: string): Promise<void> | void;
    getContext<T extends object>(command: AdvancedCommand, chatId: string): Promise<AdvancedCommandContext<T> | undefined> | (AdvancedCommandContext<T> | undefined);
    getCacheKey(commandId: string, chatId: string): string;
}
