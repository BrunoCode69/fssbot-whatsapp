"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyIsEquals = exports.readRecursiveDir = exports.getRompotVersion = exports.injectJSON = exports.replaceCommandTag = exports.getError = exports.getImageURL = exports.sleep = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const stream_1 = require("stream");
const https_1 = __importDefault(require("https"));
/**
 * * Aguarda um determinado tempo
 * @param timeout
 * @returns
 */
async function sleep(timeout = 1000) {
    const result = timeout - 2147483647;
    if (result > 0) {
        await new Promise((res) => setTimeout(res, 2147483647));
        await sleep(result);
    }
    else {
        await new Promise((res) => setTimeout(res, timeout));
    }
}
exports.sleep = sleep;
/**
 * * Obtem a imagem de uma url
 * @param uri URL
 * @returns
 */
async function getImageURL(uri) {
    if (!uri)
        return Buffer.from('');
    return new Promise((res, rej) => {
        try {
            https_1.default
                .request(uri, (response) => {
                const data = new stream_1.Transform();
                response.on('data', (chunk) => data.push(chunk));
                response.on('end', () => res(data.read()));
            })
                .end();
        }
        catch (_a) {
            res(Buffer.from(''));
        }
    });
}
exports.getImageURL = getImageURL;
/**
 * @param err Erro
 * @returns Retorna um erro
 */
function getError(err) {
    if (!(err instanceof Error)) {
        err = new Error(`${err}`);
    }
    return err;
}
exports.getError = getError;
/**
 * * Remove a Tag do texto
 * @param tag Tag do comando
 * @param text Texto do comando
 * @returns Texto sem a tag
 */
function replaceCommandTag(tag, text) {
    const indexOfTag = text.toLowerCase().indexOf(tag.toLowerCase());
    if (indexOfTag == -1)
        return text;
    return String(`${text}`)
        .slice(indexOfTag + tag.length)
        .trim();
}
exports.replaceCommandTag = replaceCommandTag;
/**
 * * Injeta valores de um objeto em outro
 * @param objectIn Objeto com novos valores
 * @param objectOut Objeto que receberá os novos valores
 * @param recursive Injeta dados recursivamente
 * @param force Força injetar dados
 * @returns Retorna o objeto com os novos valores
 */
function injectJSON(objectIn, objectOut, recursive = false, force = false) {
    if (typeof objectIn != 'object' || objectIn == null)
        return objectOut;
    Object.keys(objectIn).forEach((keyIn) => {
        const keyOut = keyIn;
        if (!(keyOut in objectOut) && !force)
            return;
        const typeOut = typeof objectOut[keyOut];
        const typeIn = typeof objectIn[keyIn];
        if (typeOut == typeIn) {
            if (typeOut == 'object' &&
                recursive &&
                !Array.isArray(objectOut[keyOut]) &&
                !Array.isArray(objectIn[keyIn])) {
                injectJSON(objectIn[keyIn], objectOut[keyOut]);
            }
            else {
                objectOut[keyOut] = objectIn[keyIn];
            }
        }
        else if (typeOut == 'string' && typeIn == 'number') {
            objectIn[keyIn] = String(objectIn[keyIn]);
        }
        else if (typeOut == 'number' && typeIn == 'string') {
            objectIn[keyIn] = Number(objectIn[keyIn]);
        }
        else if (force) {
            objectOut[keyOut] = objectIn[keyIn];
        }
        else if (typeOut == 'undefined') {
            objectOut[keyOut] = objectIn[keyIn];
        }
    });
    return objectOut;
}
exports.injectJSON = injectJSON;
/** Retorna a versão do Rompot */
function getRompotVersion() {
    var _a;
    try {
        return ((_a = require('../../package.json')) === null || _a === void 0 ? void 0 : _a.version) || '2.3.0';
    }
    catch (_b) {
        return '2.3.0';
    }
}
exports.getRompotVersion = getRompotVersion;
/** Lê um diretório recursivamente */
async function readRecursiveDir(dir, callback) {
    const files = [];
    const rtn = [];
    try {
        await Promise.all((0, fs_1.readdirSync)(dir).map(async (filename) => {
            const filepath = (0, path_1.resolve)(dir, filename);
            const stat = (0, fs_1.statSync)(filepath);
            const isFile = stat.isFile();
            if (!isFile) {
                files.push(...(await readRecursiveDir(filepath, callback)));
                return;
            }
            rtn.push(await callback(filepath, filename, (0, path_1.parse)(filename).ext));
        }));
    }
    catch (_a) { }
    return rtn;
}
exports.readRecursiveDir = readRecursiveDir;
/**
 * * Verifica se dois items são iguais.
 * @param a - Item A.
 * @param b - Item B.
 * @returns `true` se A for igual a B.
 */
function verifyIsEquals(a, b) {
    if (typeof a == 'object' && typeof b == 'object') {
        if (Array.isArray(a)) {
            if (!Array.isArray(b))
                return false;
            return !a.some((v, i) => !verifyIsEquals(v, b[i]));
        }
        return !Object.keys(a).some((k) => !verifyIsEquals(a[k], b[k]));
    }
    if (typeof a != typeof b)
        return false;
    if (a != b)
        return false;
    return true;
}
exports.verifyIsEquals = verifyIsEquals;
//# sourceMappingURL=Generic.js.map