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
            defaultBranch: repo.data.default_branch,
        };
    }

    async download(name, version) {
        const pkg = await this.getByName(name);

        let ref = version;
        if (!version)  {
            if (!pkg.versions.length) {
                // master branch
                ref = pkg.defaultBranch;
            } else {
                // latest release
                ref = pkg.versions[0];
            }
        }

        const res = await this.gitClient.repos.getContent({
            ...getOwnerRepo(pkg),
            path: pkg.path,
            ref,
        })

        pkg.downloads++;
        await this.savePackage(pkg);

        return Buffer.from(res.data.content, 'base64').toString('utf-8');
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
