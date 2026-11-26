import axios from "axios";
export default class BaseService {
    static get(path: string, body?: any): Promise<axios.AxiosResponse<any, any>>;
    static post(path: string, body?: any): Promise<axios.AxiosResponse<any, any>>;
    static patch(path: string, body?: any): Promise<axios.AxiosResponse<any, any>>;
}
