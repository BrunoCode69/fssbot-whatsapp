/// <reference types="node" />
import { Server } from 'http';
import { Logger } from 'pino';
import IBot from './IBot';
import { ServerRequest } from '../utils/server';
export declare type BotServerOptions = {
    serverId: string;
    server: Server;
    port: number;
    disableAutoStart?: boolean;
    pingInterval: number;
    maxPing: number;
    logger: Logger;
    version: 'apiV1';
};
export declare type BotWebhook = {
    id: string;
    url: string;
    ping: number;
};
export interface BotServerBase {
    options: BotServerOptions;
    webhooks: Record<string, BotWebhook>;
    sendAll(body: ServerRequest.Body): Promise<void>;
    pingWebhook(id: string): Promise<boolean>;
    registerWebhook(webhook: BotWebhook): void;
    removeWebhook(id: string): boolean;
}
export declare type BotServer<Bot extends IBot = IBot> = Bot & BotServerBase & {
    configEvents(): void;
    configRoutes(): Server;
};
export default function BotServer<Bot extends IBot = IBot>(bot: Bot, options?: Partial<BotServerOptions>): BotServer<Bot>;
export declare function generateBotServerBase(partialOptions?: Partial<BotServerOptions>): BotServerBase;
export declare function generateBotServerOptions(options: Partial<BotServerOptions>): BotServerOptions;
