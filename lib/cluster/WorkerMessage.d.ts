import IClient from '../client/IClient';
import IBot from '../bot/IBot';
/** Tag da mensagem do worker */
export declare enum WorkerMessageTag {
    Void = "",
    Error = "error",
    Func = "func",
    Result = "result",
    Event = "event",
    Patch = "patch"
}
/** Data da mensagem do worker */
export declare type WorkerMessageData = {
    reason: string;
} | {
    name: string;
    arg: any;
} | {
    name: keyof IClient<IBot>;
    args: any[];
} | {
    result: any;
} | {
    key: keyof IClient<IBot>;
    value: any;
} | any;
/** Mensagem do worker */
export default class WorkerMessage {
    /** Identificador único da mensagem */
    uid: string;
    /** ID do cliente da mensagem */
    clientId: string;
    /** É de um cliente principal */
    isMain: boolean;
    /** É uma mensagem para o processo principal */
    isPrimary: boolean;
    /** ID da mensagem */
    id: string;
    /** Tag da mensagem */
    tag: WorkerMessageTag;
    /** Data da mensagem */
    data: WorkerMessageData;
    /** Auto cancela a mensagem acaso demore */
    autoCancel: boolean;
    constructor(tag?: WorkerMessageTag, data?: WorkerMessageData, autoCancel?: boolean);
    getData(): {
        reason: any;
        result?: undefined;
        name?: undefined;
        arg?: undefined;
        args?: undefined;
        key?: undefined;
        value?: undefined;
    } | {
        result: any;
        reason?: undefined;
        name?: undefined;
        arg?: undefined;
        args?: undefined;
        key?: undefined;
        value?: undefined;
    } | {
        name: any;
        arg: any;
        reason?: undefined;
        result?: undefined;
        args?: undefined;
        key?: undefined;
        value?: undefined;
    } | {
        name: any;
        args: any;
        reason?: undefined;
        result?: undefined;
        arg?: undefined;
        key?: undefined;
        value?: undefined;
    } | {
        key: any;
        value: any;
        reason?: undefined;
        result?: undefined;
        name?: undefined;
        arg?: undefined;
        args?: undefined;
    } | {
        reason?: undefined;
        result?: undefined;
        name?: undefined;
        arg?: undefined;
        args?: undefined;
        key?: undefined;
        value?: undefined;
    };
    clone(data?: Partial<WorkerMessage>): WorkerMessage;
    apply(data: Partial<WorkerMessage>): this;
    toJSON(): any;
    static fromJSON(data: any): WorkerMessage;
}
