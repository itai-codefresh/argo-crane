const fs = require('util').promisify(require('fs'));
const axios = require('axios');
const filename = "./packages.json"

module.exports = class Packages {
    constructor() {}

    async getAll() {
        const data = await this._readAll();
        return Object.keys(data).reduce((cur, acc) => {
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
        return fs.writeFile(filename, str);
    }

    async _readAll() {
        const str = await fs.readFile(filename);
        return JSON.parse(str);
    }
}