/// <reference types="node" />
import EventEmitter from "events";
import { CommandControllerEventsMap } from "./Command";
export default class CommandControllerEvent {
    ev: EventEmitter;
    on<T extends keyof CommandControllerEventsMap>(eventName: T, listener: (arg: CommandControllerEventsMap[T]) => void): void;
    off<T extends keyof CommandControllerEventsMap>(eventName: T, listener: (arg: CommandControllerEventsMap[T]) => void): void;
    removeAllListeners<T extends keyof CommandControllerEventsMap>(event: T): void;
    emit<T extends keyof CommandControllerEventsMap>(eventName: T, arg: CommandControllerEventsMap[T]): boolean;
}
