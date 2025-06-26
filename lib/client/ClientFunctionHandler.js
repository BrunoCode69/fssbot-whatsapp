"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ClientFunctionHandler {
    constructor(client, functions) {
        this.client = client;
        this.functions = functions;
        /** Todas funções */
        this.awaiting = [];
    }
    async exec(row, func, ...args) {
        await this.await(row);
        const getResult = async (count = 0, error = undefined) => {
            try {
                if (count >= this.client.config.maxRequests)
                    return [undefined, error];
                await this.client.awaitConnectionOpen();
                return [await func.bind(this.client.bot)(...args), undefined];
            }
            catch (error) {
                await new Promise((res) => setTimeout(res, this.client.config.requestsDelay));
                return await getResult(count + 1, error);
            }
        };
        const [result, error] = await getResult();
        this.functions[row].shift();
        this.resolve(row);
        if (error) {
            throw error;
        }
        return result;
    }
    async await(row) {
        await new Promise((resolve) => this.addAwaiting(resolve));
        await new Promise((resolve) => this.add(row, resolve));
    }
    add(row, func) {
        this.functions[row].push(func);
        if (this.functions[row].length == 1) {
            this.resolve(row);
        }
    }
    addAwaiting(func) {
        this.awaiting.push(func);
        if (this.awaiting.length == 1) {
            this.resolveAwaiting();
        }
    }
    async resolve(row) {
        if (this.functions[row].length <= 0)
            return;
        const func = this.functions[row][0];
        if (func) {
            await func();
        }
    }
    async resolveAwaiting() {
        if (this.awaiting.length <= 0)
            return;
        const func = this.awaiting[0];
        if (func) {
            await func();
        }
        this.awaiting.shift();
        if (this.awaiting.length > 0) {
            this.resolveAwaiting();
        }
    }
}
exports.default = ClientFunctionHandler;
//# sourceMappingURL=ClientFunctionHandler.js.map