/// <reference types="node" />
import { AuthenticationState } from 'baileys';
import IAuth from '../client/IAuth';
export declare class MultiFileAuthState implements IAuth {
    folder: string;
    botPhoneNumber?: string;
    autoCreateDir: boolean;
    fixFileName: (file?: string) => string | undefined;
    getStat(folder: string): import("fs").Stats | null;
    constructor(folder: string, botPhoneNumber?: string, autoCreateDir?: boolean);
    prepare(): void;
    get(file: string): Promise<any>;
    set(file: string, data: any): Promise<void>;
    remove(file: string): Promise<void>;
    listAll(pattern?: string): Promise<string[]>;
}
export declare const getBaileysAuth: (auth: IAuth) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
