const fs = require('util').promisify(require('fs'));
const axios = require('axios');
const { Octokit } = require('@octokit/rest');
const filename = "./packages.json"

const getOwnerRepo = (pkg) => {
    const parts = pkg.repo.split('/');
    return {
        owner: parts[parts.length-2],
        repo: parts[parts.length-1],
    };
}

module.exports = class Packages {
    constructor() {
        const token = process.env.GIT_TOKEN;
        if (!token) {
            throw new Error('export GIT_TOKEN environment variable');
        }
        this.gitClient = new Octokit({
            auth: token,
        });
    }

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

        const releases = await this.gitClient.repos.listReleases(getOwnerRepo(pkg));
        const versions = releases.map(r => r.tag_name);

        return {
            name: name,
            versions,
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