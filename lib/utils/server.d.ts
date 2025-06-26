/// <reference types="express-serve-static-core" />
import { Response } from 'express';
import { BotServer, BotServerOptions } from '../bot/BotServer';
export declare namespace ServerRequest {
    type Request = Express.Request & {
        botServer: BotServer;
    };
    type Body<M extends RequestMethod = any, K extends string = string, A extends any = any> = {
        method: M;
        key: K;
        args: A[];
    };
    enum RequestMethod {
        EMIT = "emit",
        SET = "set",
        POST = "post"
    }
    function ping(url: string): Promise<void>;
    function send(url: string, body: Body): Promise<void>;
    function generate<M extends RequestMethod = any, K extends string = string, A extends any = any>(method: M, key: K, ...args: A[]): Body<M, K, A>;
}
export declare namespace ServerResponse {
    type Body<M extends string = string, D extends any = any> = {
        status: number;
        message: M;
        data: D;
    };
    function send(response: Response, body: Body, options: BotServerOptions): Response<any, Record<string, any>> | undefined;
    function generate<M extends string, D extends any>(status: string | number, message: M, data: D): Body<M, D>;
    function generateError(err: any, status?: number | string, message?: string): Body<string, {
        error: string;
        stack: string;
    }>;
}
