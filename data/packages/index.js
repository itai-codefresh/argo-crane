const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
const YAML = require('yaml');
const _ = require('lodash');

const FILENAME = './data/data.json';
const CHANGE_LOG_PATH = '/CHANGELOG.md';
const MAX_RELEASES_PER_PAGE = 50;

const getOwnerRepo = (pkg) => {
    const parts = pkg.repo.split('/');
    return {
        owner: parts[parts.length-2],
        repo: parts[parts.length-1],
    };
}

const parseParameters = (template, exampleValuesStr) => {
    const tpl = YAML.parse(template);

    const parameters = _.get(tpl, 'spec.templates', []).reduce((acc, cur) => {
        return _.get(cur, 'inputs.parameters', []).reduce((__, _cur) => {
            acc.push(_cur);
            return acc;
        }, acc);
    }, []);

    _.get(tpl, 'spec.arguments.parameters', []).forEach((p) => {
        const param = parameters.find(_p => _p.name === p.name);
        if (!param) { return; }
        
        param.default = p.value;
    });

    let exampleValues = {};
    try {
        exampleValues = YAML.parse(exampleValuesStr);
    } catch (err) {}

    _.forEach(exampleValues, (value, name) => {
        const param = parameters.find(p => p.name === name);
        param.example = value;
    });

    return parameters;
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
        const pkgs = [];
        return Object.keys(data).reduce((acc, cur) => {
            return acc.then(async () => {
                pkgs.push(await this.getByName(cur));
                return pkgs;
            });
        }, Promise.resolve());
    }

    async getByName(name, version) {
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

        let ref = version;
        if (!version)  {
            ref = pkg.defaultBranch;
        }

        const [template, changelog, exampleValues] = await Promise.all([
            this._getFile(pkg, ref, pkg.path),
            this._getFile(pkg, ref, CHANGE_LOG_PATH),
            this._getFile(pkg, ref, pkg.examplesPath),
        ]);

        const parameters = parseParameters(template, exampleValues);

        delete pkg.examplesPath;

        return {
            ...pkg,
            name: name,
            versions,
            defaultBranch: repo.data.default_branch,
            template,
            parameters,
            changelog,
        };
    }

    async _getFile(pkg, ref, path) {
        try {
            const res = await this.gitClient.repos.getContent({
                ...getOwnerRepo(pkg),
                path,
                ref,
            });
            return Buffer.from(res.data.content, 'base64').toString('utf-8');
        } catch (err) {
            return '';
        }
    }

    async download(name, version) {
        const pkg = await this.getByName(name, version);
        pkg.weeklyDownloads++;
        await this.savePackage(pkg);

        return pkg.template;
    }

    async addStar(name) {
        const pkg = await this.getByName(name);
        pkg.stars++;
        return this.savePackage(pkg);
    }

    async savePackage(pkg) {
        pkg = _.cloneDeep(pkg);
        const data = await this._readAll();
        const {name} = pkg;

        delete pkg.name;
        delete pkg.defaultBranch;
        delete pkg.template;
        delete pkg.versions;
        delete pkg.parameters;
        delete pkg.changelog;
        
        data[name] = pkg;
        const str = JSON.stringify(data);
        return fs.writeFile(FILENAME, str);
    }

    async _readAll() {
        const str = await fs.readFile(FILENAME);
        return JSON.parse(str);
    }
}
