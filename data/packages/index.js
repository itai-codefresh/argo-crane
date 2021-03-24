const fs = require('fs');
const { promisify } = require('util')
const axios = require('axios');
const filename = `${__dirname}/packages.json`
const writeFile=promisify(fs.writeFile)
const readFile=promisify(fs.readFile)
module.exports = class Packages {
    constructor() {}

    async getAll() {
        const data = await this._readAll();
        return Object.keys(data).reduce((prev,cur, idx, acc) => {
            const pkg = { name: cur, ...data[cur] };
            acc.push(pkg);
            return acc;
        }, []);
    }

    async getByName(name) {
        const data = await this._readAll();
        const pkg = data[name];
        if (!pkg) {
            throw new Error(`package: ${name} not found`);
        }
        return {
            name: name,
            ...pkg,
        };
    }

    async addStar(name) {
        const pkg = await this.getByName(name);
        pkg.stars++;
        return this.savePackage(pkg);
    }

    async addDownload(name) {
        const pkg = await this.getByName(name);
        pkg.downloads++;
        return this.savePackage(pkg);
    }

    async savePackage(pkg) {
        const data = await this._readAll();
        const {name} = pkg;
        delete pkg.name;
        data[name] = pkg;
        const str = JSON.stringify(data);
        return writeFile(filename, str);
    }

    async _readAll() {
        const str = await readFile(filename);
        return JSON.parse(str);
    }
}
