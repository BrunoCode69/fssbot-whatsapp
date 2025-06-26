import IClient from './IClient';
import IBot from '../bot/IBot';
export default class ClientFunctionHandler<B extends IBot, T extends string> {
    client: IClient<B>;
    functions: Record<T, Function[]>;
    /** Todas funções */
    awaiting: Function[];
    constructor(client: IClient<B>, functions: Record<T, Function[]>);
    exec<F extends (...args: any[]) => any>(row: T, func: F, ...args: Parameters<F>): Promise<Awaited<ReturnType<F>>>;
    await(row: T): Promise<void>;
    add(row: T, func: Function): void;
    addAwaiting(func: Function): void;
    resolve(row: T): Promise<void>;
    resolveAwaiting(): Promise<void>;
}
