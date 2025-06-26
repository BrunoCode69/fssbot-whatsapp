import { Router } from "express";
import { BotServer } from "../../bot/BotServer";
export declare enum RouterMethod {
    PATCH = "patch",
    POST = "post",
    GET = "get"
}
export declare function apiV1(botServer: BotServer): Router;
