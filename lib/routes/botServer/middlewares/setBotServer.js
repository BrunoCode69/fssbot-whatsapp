"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (botServer) => {
    return (req, res, next) => {
        Object.defineProperty(req, "botServer", {
            get() {
                return botServer;
            },
            set(value) {
                botServer = value;
            },
        });
        return next();
    };
};
//# sourceMappingURL=setBotServer.js.map