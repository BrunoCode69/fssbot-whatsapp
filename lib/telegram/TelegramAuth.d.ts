/// <reference types="node" />
import IAuth from "../client/IAuth";
export default class TelegramAuth implements IAuth {
    #private;
    sessionsDir: string;
    botPhoneNumber?: string;
    autoCreateDir: boolean;
    fixFileName: (file?: string) => string | undefined;
    getStat(folder: string): import("fs").Stats | null;
    setBotToken(botToken: string): void;
    constructor(botToken: string, sessionsDir?: string, autoCreateDir?: boolean);
    prepare(): void;
    getSession(...paths: string[]): string;
    get(file: string): Promise<any>;
    set(file: string, data: any): Promise<void>;
    remove(file: string): Promise<void>;
    listAll(pattern?: string): Promise<string[]>;
}
