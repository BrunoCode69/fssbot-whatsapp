import { NextFunction, Request, Response } from "express";
import { BotServer } from "../../../bot/BotServer";
declare const _default: (botServer: BotServer) => (req: Request, res: Response, next: NextFunction) => void;
export default _default;
