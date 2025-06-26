"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Address_1 = __importDefault(require("../models/Address"));
const BaseService_1 = __importDefault(require("./BaseService"));
/** Serviço para obter os dados de uma localização. */
class AddressService extends BaseService_1.default {
    /**
     * Obtem os dados de uma localização.
     * @param latitude - Latitude da localização.
     * @param longitude - Longitude da localização.
     * @returns Dados da localização.
     */
    static async getByLocation(latitude, longitude) {
        const { data } = await this.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const loc = new Address_1.default();
        if (!(data === null || data === void 0 ? void 0 : data.address))
            return loc;
        loc.data = data;
        //? Lendo país da localização
        if (data.address.country)
            loc.country = data.address.country;
        //? Lendo estado da localização
        if (data.address.state)
            loc.state = data.address.state;
        //? Lendo cidade da localização
        if (data.address.city)
            loc.city = data.address.city;
        else if (data.address.city_district)
            loc.city = data.address.city_district;
        else if (data.address.town)
            loc.city = data.address.town;
        //? Lendo bairro da localização
        if (data.address.suburb)
            loc.neighborhood = data.address.suburb;
        //? Lendo rua da localização
        if (data.address.road)
            loc.street = data.address.road;
        //? Lendo CEP da localização
        if (data.address.postcode)
            loc.zipcode = data.address.postcode;
        //? Lendo complemento da localização
        if (data.display_name)
            loc.complement = data.display_name;
        return loc;
    }
}
exports.default = AddressService;
//# sourceMappingURL=AddressService.js.map