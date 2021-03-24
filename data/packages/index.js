const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
const filename = "./data/data.json"

const MAX_RELEASES_PER_PAGE = 50;

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
        return Object.keys(data).reduce((acc, cur) => {
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

        const repo = await this.gitClient.repos.get({ 
            ...getOwnerRepo(pkg),
        });

        const releases = await this.gitClient.repos.listReleases({ 
            ...getOwnerRepo(pkg),
            per_page: MAX_RELEASES_PER_PAGE,
        });
        const versions = releases.data.map(r => r.tag_name);

        return {
            name: name,
            versions,
            ...pkg,
        };
    }

    async download(name, version = 'latest') {
        const pkg = this.getByName(name);

        let ref = 'master'
        if (pkg.versions.length) {

        }

        const template = this.gitClient.repos.getContent({
            ...getOwnerRepo(pkg),
            ref: 
        })
    }

    async addStar(name) {
        const pkg = await this.getByName(name);
        pkg.stars++;
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
