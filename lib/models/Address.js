"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
class Address {
    constructor(data = {}) {
        this.country = "";
        this.state = "";
        this.city = "";
        this.neighborhood = "";
        this.street = "";
        this.zipcode = "";
        this.complement = "";
        this.data = {};
        (0, utils_1.injectJSON)(data, this);
    }
}
exports.default = Address;
//# sourceMappingURL=Address.js.map