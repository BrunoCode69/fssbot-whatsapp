import Address from "../models/Address";
import BaseService from "./BaseService";
/** Serviço para obter os dados de uma localização. */
export default class AddressService extends BaseService {
    /**
     * Obtem os dados de uma localização.
     * @param latitude - Latitude da localização.
     * @param longitude - Longitude da localização.
     * @returns Dados da localização.
     */
    static getByLocation(latitude: number, longitude: number): Promise<Address>;
}
