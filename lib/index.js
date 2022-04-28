/* globals console, process */
import { Buffer } from 'buffer'
import path from 'path'
import { URL } from 'url'
import { chalk, argv as _argv, $, fs } from 'zx'
import dotenv from 'dotenv'
import { Octokit as OriginalOctokit } from 'octokit'
import { throttling } from '@octokit/plugin-throttling'
import semver from 'semver'
import Module from 'module'
import * as L from 'linkedom'

let require = Module.createRequire(import.meta.url)
let pkg = require('../package.json')
let Octokit = OriginalOctokit.plugin(throttling)

dotenv.config()
let argv = { ..._argv }
argv.verbose = argv.verbose || argv.v
$.verbose = argv.verbose

let __dirname = 
    path.dirname(new URL('', import.meta.url).pathname);

let repoPath = 
    filepath => path.resolve(__dirname, '..', filepath);

// 🙈🙉🙊 https://stackoverflow.com/a/9310752
function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * @typedef { import("octokit").Octokit } Octokit
 */

/** @type {Octokit} */
let octokit;

let source = argv.source || 'next'
let target = argv.target || 'main'

let markers = {
    changeSummary: {
        start: `<a name="changeSummary-start"></a>`
        ,end: `<a name="changeSummary-end"></a>`
    }
    ,changelog: {
        start: `<a name="changelog-start"></a>`
        ,end: `<a name="changelog-end"></a>`
    }
    ,contributors: {
        start: `<a name="contributors-start"></a>`
        ,end: `<a name="contributors-end"></a>`
    }
    ,helpDocs: {
        start: `<a name="help-start"></a>`
        ,end: `<a name="help-end"></a>`
    }
}

function groupBy(f, xs){
    let idx = {}
    for(let x of xs){
        let key = f(x)

        key in idx 
            ? idx[key].push(x)
            : idx[key] = [x]
    }
    return idx
}

function getVersionFromReleasePR(x){
    return [x]
        .filter(Boolean)
        .map( x => x.title )
        .flatMap( x => x.split('-') )
        .map( x => x.trim() )
        .find( x => semver.valid(x))
}

async function getPackageJSONVersion({ owner, repo }){
    let f; try {
        f = await octokit.rest.repos.getContent(
            { owner, repo, path: 'package.json' }
        )
        .catch( () => null )

        f = f.data
        f = f.content
    
        f = Buffer.from(f, 'base64').toString('utf8')
        f = JSON.parse(f)
        f = f.version
        f = 'v'+f
    } catch (err) {
        error(err)
    }
    return f
}

async function getGitTagVersion({ owner, repo }){
    let tag = await octokit.rest.repos.listTags({
        owner
        ,repo
    })

    tag = tag.data
    

    tag = tag.filter( x => semver.valid(x.name) ).sort(
        (a,b) => -semver.compare(a.name, b.name)
    )
    tag = tag[0]
    if(!tag) return null;
    tag = tag.name
    return tag
}

function info(...args){
    console.log(...args)
}

function verbose(...args){
    if($.verbose) console.log(...args)
}

function error(...args){
    process.exitCode = 1
    console.error(...args)
}

let debose = async f => {
    $.verbose = argv.verbose || false

    try {
        return await f()
    } finally {
        $.verbose = argv.verbose
    }
}
const throttleOptions = {
    onRateLimit: (retryAfter, options, octokit) => {
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
    }
    ,onAbuseLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    },
}

async function preflight(){
    await debose( async () => {
        if( process.env.CI ) {
            octokit = new Octokit({ 
                auth: process.env.GITHUB_TOKEN 
                ,throttle: throttleOptions
            })
        } else {
            if( !process.env.GITHUB_REPOSITORY ) throw new Error('GITHUB_REPOSITORY is required')
            if( !process.env.GITHUB_TOKEN ) throw new Error('GITHUB_TOKEN is required')
            if( !process.env.GITHUB_REF ) {
                try {
                    process.env.GITHUB_REF = (await $`git branch --show-current`).stdout.trim()
                } catch (e) {
                    throw new Error('GITHUB_REF is required')
                }
            }
            octokit = new Octokit({ 
                auth: process.env.GITHUB_TOKEN
                ,throttle: throttleOptions
            })
            let response = await octokit.rest.users.getAuthenticated()

            if( response.status != 200) throw new Error('Could not verify the validity of your GITHUB_TOKEN')
            let user = response.data
            verbose('Authed as', user)
        }
    })
}

async function getSha({ owner, repo }, branch){
    let x = await octokit.rest.git.getRef({
        owner, repo, ref: `heads/${branch}`
    })
    return x.data.object.sha
}

let fakeChalk = { green: x => x, magenta: x => x, blue: x => x, red: x => x }
async function updateDocs(){
    let x = await fs.readFile('README.md', 'utf8')
    
    let lines = x.split('\n')

    let startI = lines.findIndex( x => x.includes(markers.helpDocs.start))
    let endI = lines.findIndex( x => x.includes(markers.helpDocs.end))

    if( startI < 0 || endI < 0 ) {
        verbose('No help markers found')
        return
    }

    let pre = lines.slice(0,startI+1).join('\n')
    let post = lines.slice(endI).join('\n')

    let newReadme = 
        pre 
        + '\n```\n'+help(fakeChalk) 
        + '\n```\n' 
        + post

    await fs.writeFile('README.md', newReadme, 'utf8')
}

function getNextVersion({ recentBranches, version }){
    let severityIdx = groupBy( x => prSeverity(x), recentBranches )

    // todo-james
    let nextVersion; {
        nextVersion = semver.clean(version)
        
        for(let level of ['major', 'minor', 'patch', 'prerelease']){
            let n = severityIdx[level] ? severityIdx[level].length : 0
            for( let i = 0; i < n; i++ ) {
                nextVersion = semver.inc(nextVersion, level)
            }
        }

        let prerelease = semver.prerelease(version, 'prerelease')
        if ( semver.compare(nextVersion,version) == 0 ) {
            let level = 
                prerelease
                    ? ['prerelease', ...prerelease]
                    : ['patch']

            nextVersion = semver.inc(nextVersion, ...level)
        } else if ( prerelease ) {
            nextVersion = semver.inc(nextVersion, 'prerelease', ...prerelease)
        }
    }

    return nextVersion
}

async function inferVersionExternal(){
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

    const lastRelease = await getLastRelease({ owner, repo })
    let recentBranches = 
        await getRecentBranchesFromLastRelease({ owner, repo, lastRelease })

    const currentVersion = await inferVersion({ owner, repo, lastRelease })

    const version = 
        await getNextVersion({ 
            recentBranches, version: currentVersion.version 
        })

    console.log('v'+version)
}

async function generateTemplates(){
    let xs = await fs.readdir('./.github/workflows')

    for( let x of xs ) { 
        let y = await fs.readFile(`./.github/workflows/${x}`, 'utf8')

        let z = y
        z=z.replace(/node bin\.js/gm, 'npx pr-release')
        z=z.replace(/\bnext\b/gm, '$source')
        z=z.replace(/\bmain\b/gm, '$target')
        z = z.replace(/(.*)#\s+prr:comment/gm, '#$1')
        z = z.replace(/(.*)#\s+prr:remove/gm, '')
        await fs.writeFile(repoPath(`./templates/${x}`), z)
    }
}

async function actionsYML(){
    await fs.mkdir('./.github/workflows', { recursive: true })

    let templates = [
        'pr.yml',
        'merge.yml',
        'rollback.yml'
    ]

    for( let file of templates ) {
        let x = await fs.readFile(repoPath(`./templates/${file}`), 'utf8')
        x = x.replace(/\$target/g, target)
        x = x.replace(/\$source/g, source)
        await fs.writeFile(`./.github/workflows/${file}`, x)
    }

}

/**
 * Pulls down last release PR description, extracts each section and outputs
 * them as files.
 * @param {*} options 
 */
async function extractChangelog(options){
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')
    let lastRelease = await getLastRelease({ owner, repo })

    let a,b; {
        let r = await octokit.rest.search.issuesAndPullRequests({
            q: `is:pr is:merged base:${target} head:${source} repo:${owner}/${repo}`
            ,sort: 'updated'
            ,order: 'desc'
            ,per_page: 2
            ,page: 1
        })

        r = r.data.items
        r = r.sort( (a,b) => a.number - b.number )

        let [_a,_b] = r
        a = _a
        b = _b
    }


    let recentBranches; {

        let firstEverRelease = a == null;
        let onlyOneRelease = b == null

        let q = firstEverRelease || onlyOneRelease
            ? `base:${source} is:pr is:merged repo:${owner}/${repo}`
            : `merged:${a.closed_at}..${b.closed_at} base:${source} is:pr is:merged repo:${owner}/${repo}`

        recentBranches = 
            await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
                q
                ,sort: 'updated'
                ,order: 'desc'
                ,per_page: 2
                ,page: 1
            })
    } 
    
    let openBranches = 
        lastRelease
        ? await getRecentBranchesFromLastRelease({ owner, repo, lastRelease })
        : []

    let lines = 
        lastRelease
        ? lastRelease.body.split('\n')
        : []

    let sections = {
        changeSummary: []
        ,changelog: []
        ,contributors: []
        ,null: []
    }

    let mode = null;
    for( let line of lines ) {

        if ( line == markers.changeSummary.start ) {
            mode = 'changeSummary'
        } else if ( line == markers.changeSummary.end ) {
            mode = null
        } else if ( line == markers.changelog.start ) {
            mode = 'changelog'
        } else if ( line == markers.changelog.end ) {
            mode = null
        } else if ( line == markers.contributors.start ) {
            mode = 'contributors'
        } else if ( line == markers.contributors.end ) {
            mode = null
        } else {
            sections[mode].push(line)
        }
    }

    let changeSummary = sections.changeSummary.join('\n')
    let changelog = sections.changelog.join('\n')
    let contributorsBody = sections.contributors.join('\n')

    mode = null
    lines = changelog.split('\n')

    sections = {
        major: []
        ,minor: []
        ,patch: []
        ,null: []
    }

    for( let line of lines ) {
        if( line == '### Major Changes' ) {
            mode = 'major'; continue;
        } else if ( line == '### Minor Changes' ) {
            mode = 'minor'; continue;
        } else if ( line == '### Patches' ) {
            mode = 'patch'; continue;
        } else {
            sections[mode].push(line)
        }
    }

    let major = sections.major.join('\n').trim()
    let minor = sections.minor.join('\n').trim()
    let patch = sections.patch.join('\n').trim()

    let { version } = 
        await inferVersion({ owner, repo, lastRelease })

    // this version is the published version + branch inferred versions
    // it ignores the version set in the PR description
    let nextVersion = 
        await getNextVersion({ recentBranches: openBranches, version })

    let contributors = 
        [...new Set(recentBranches.map( x => x.user.login))]

    let labels; {
        let xs 
        xs = recentBranches
        xs = xs.flatMap( x => x.labels )
        xs = xs.map( x => x.name )
        xs = [...new Set(xs)]
        xs = xs
        labels = xs
    }

    let pulls = recentBranches.map( x => x.number )

    let out = {
        body: lastRelease ? lastRelease.body : ''
        , changeSummary
        , changelog
        , contributors
        , contributorsBody
        , major
        , minor
        , patch
        , version
        , nextVersion
        , labels
        , pulls
    }


    if (options.out) {
        if (options.out === true) options.out = './.pr-release'

        await fs.rm(options.out, { recursive: true }).catch(() => {})
        await fs.mkdir(options.out, { recursive: true })

        await fs.writeFile(
            `${options.out}/body.md`, out.body
        )

        await fs.writeFile(
            `${options.out}/changelog.md`, out.changelog
        )

        await fs.writeFile(
            `${options.out}/patch.md`, out.patch
        )

        await fs.writeFile(
            `${options.out}/minor.md`, out.minor
        )

        await fs.writeFile(
            `${options.out}/major.md`, out.major
        )

        await fs.writeFile(
            `${options.out}/version`, out.version
        )

        await fs.writeFile(
            `${options.out}/nextVersion`, out.nextVersion
        )

        await fs.writeFile(
            `${options.out}/changeSummary.md`, out.changeSummary
        )

        await fs.writeFile(
            `${options.out}/contributors.md`, out.contributorsBody
        )

        await fs.writeFile(
            `${options.out}/contributors.md`, JSON.stringify(out.contributors)
        )

        await fs.writeFile(
            `${options.out}/labels.json`, JSON.stringify(out.labels)
        )

        await fs.writeFile(
            `${options.out}/pulls.json`, JSON.stringify(out.pulls)
        )
        
        await fs.writeFile(
            `${options.out}/metadata`
            , JSON.stringify(out, null, 2)
        )
    }

    return out
}

async function getLastRelease({ owner, repo }){
    let lastRelease;
    lastRelease = await octokit.rest.search.issuesAndPullRequests({
        q: `is:pr is:merged base:${target} head:${source} repo:${owner}/${repo}`
        ,sort: 'updated'
        ,order: 'desc'
        ,per_page: 1
        ,page: 1
    })
    lastRelease = lastRelease.data.items[0]
    return lastRelease
}

async function getThisRelease({ owner, repo }){
    let thisRelease;
    let q = `is:pr is:open base:${target} head:${source} repo:${owner}/${repo}`
    verbose('Searching for latest open release', q)
    thisRelease = await octokit.rest.search.issuesAndPullRequests({
        q
        ,sort: 'updated'
        ,order: 'desc'
        ,per_page: 1
        ,page: 1
    })
    thisRelease = thisRelease.data.items[0]
    return thisRelease
}

async function getRecentBranchesFromLastRelease({ owner, repo, lastRelease }){
    return getRecentBranchesFromLastCommitDate({ 
        owner
        , repo
        , lastCommitDate: lastRelease ? lastRelease.closed_at : null 
    })
}

async function getRecentBranchesFromLastCommitDate({ 
    owner
    , repo
    , mostRecentTagDate 
}){
    let recentBranches;

    let mergedAfter = mostRecentTagDate ? ` merged:>${mostRecentTagDate}` : ``
    let q = `is:pr is:merged base:${source} repo:${owner}/${repo}${mergedAfter}`
    verbose('Searching for recent branches', q)
    recentBranches = 
        await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
            q
            ,sort: 'updated'
            ,order: 'desc'
        })

    return recentBranches
}

/**
 * On merge of the PR 
 * 
 * - Create a github release
 * - Tag the ref with a version
 * - Update language manifests like:
 * 
 * Doesn't generate changelog or anything, that is a separate command.
 * But you can commit changes as part of the release via --commit
 * 
 *  - package.json
 */
async function merge(options){
    // We've already merged, so first thing is to figure out what version that release represented.
    // So we need to get the most recently merged release.
    // There may not be one, and if there is, there may already be a tag for that release

    const changelogOut = typeof options.changelog == 'string' ? { out: options.changelog } : {}

    let out = options.changelog 
        ? await changelog({ ...changelogOut })
        : await extractChangelog({})

    let { version } = out
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

    let sourceSHA = 
        await getSha({ owner, repo }, source)

    let isAncestor =
        !await $`git fetch --all && git merge-base --is-ancestor ${`origin/${source}`} ${`origin/${target}`}`.exitCode

    if (!isAncestor && !options.force) {
        return error(`${source} is not an ancestor of ${target}.  Re-run with --force to enable a fast-forward release.`)
    }


    verbose({ isAncestor })

    if( isAncestor ) {
        // Add merge commit to source before add other stuff to source
        // So we can update target as a fast forward at the end
        let targetSHA = 
            await getSha({ owner, repo }, target)

        await octokit.rest.git.updateRef({
            owner, repo, ref: `heads/${source}`, sha: targetSHA
        })
        verbose('Updated',source,'to target sha', targetSHA)
    }

    let lastRelease = await getLastRelease({ owner, repo })

    verbose('lastRelease', lastRelease)

    /* Find if we already have a tag for this version */ {
        
        let allTags = await octokit.paginate(octokit.rest.repos.listTags, {
            owner
            ,repo
        })

        let found = allTags.find( x => x.name == `v`+ version )

        if( found ) {
            info( 'Version tag', version, 'already exists, exiting with code zero.')
            return null;
        }
    }

    // eslint-disable-next-line no-unused-vars
    
    // If there are some artifacts in the working tree
    // We should commit them to this release
    // We use the github API so we can make changes to
    // protected branches post merge.
    commit: if (options.commit){
        
        if( await fs.stat('package.json').catch( () => null ) ) {
            await $`npm version --no-verify --no-commit-hooks --no-git-tag-version ${version}`.exitCode
        }

        // todo-james make this a standalone command
        // be helpful to be able to commit in CI 
        // outside of normal pr-release usage
        let changes = await $`git diff --quiet`.exitCode

        let untracked = (await $`git ls-files --others --exclude-standard`)
            .stdout.trim().split('\n').filter(Boolean)

        if( untracked.length == 0 && changes == 0 ) break commit;

        changes = await $`git diff --name-only`
        changes = `${changes}`.trim()
        changes = [...new Set(changes.split('\n').concat(untracked))]

        changes = changes.map( async x => {
            let content = await fs.readFile(x)
            content = content.toString('utf8')
            let type = 'blob'
            let mode = "100644"
            
            return { content, type, mode, path: x }
        })

        changes = await Promise.all(changes)

        let base_tree = (
            await octokit.rest.git.getRef({ owner, repo, ref: `heads/${source}` })
        )
        .data.object.sha

        let tree = await octokit.rest.git.createTree({
            owner
            ,repo
            ,tree: changes
            ,base_tree
        })

        let commit = await octokit.rest.git.createCommit({
            owner
            , repo
            , message: (options.message || 'Release Artifacts for v'+version)
                +`\n\n [skip ci]`
            , tree: tree.data.sha
            , parents: [base_tree]
        })

        // eslint-disable-next-line no-unused-vars
        sourceSHA = commit.data.sha

        await octokit.rest.git.updateRef({
            owner, repo, ref: `heads/${source}`, sha: sourceSHA
        })


        // now we need to rewind target to just before the merge happened
        // if, and only the merge was a squash or a rebase
        // if, it was a normal merge commit/ff we can just update the ref
        // of target to source
        // so lets detect if it was a fast forward, we can just check the SHA
        // of target, if it != originalSourceSHA

        if (isAncestor){
            verbose('Attempting fast forward of',target,'to source sha', sourceSHA)
            await octokit.rest.git.updateRef({
                owner, repo, ref: `heads/${target}`, sha: sourceSHA
            })
        } else {
            verbose('Attempting repair of target branch as it is not not an ancestor.')
            await repairTarget({ force: options.force, clean: options.clean })
        }
    }

    await octokit.rest.repos.createRelease({
        owner
        ,repo
        ,tag_name: `v${version}`
        ,name: `v${version}`
        ,target_commitish: target
        ,body: out.body
        // extract from PR have a release notes marker section
        // ,draft
        // ,prerelease
    });

    return null;
}

async function inferVersion({ owner, repo, lastRelease }){
    let versionTypes = {
        git: await getGitTagVersion({ owner, repo })
        ,npm: await getPackageJSONVersion({ owner, repo })
        ,title: lastRelease && getVersionFromReleasePR(lastRelease)
        ,default: '0.0.0'
    }

    let version;
    let versionType;
    for( let [k,v] of Object.entries(versionTypes) ){
        v = versionTypes[k] = semver.valid(v)
        if( !v ) continue;
        if( version ) {
            let cmp = semver.compare(version, v)
            if( cmp == -1 ) {
                version = v
                versionType = k
            }
        } else if (v) {
            version = v
            versionType = k
        }
    }

    verbose(`Using version type:`, versionType)
    verbose(`Previous version set to`, version)

    return { version, versionType }
}

function stripHTML(x){
    return L.parseHTML(`<body><markdown>${x}</markdown></body>`).document.querySelector('markdown').textContent
}
function changeDescription(x, { owner, repo }){

    L;
    let sentences = []
    let length = 0;
    let stack = 
    stripHTML(x.body || '')
        // strip html comments @see https://github.com/johno/strip-html-comments/blob/master/index.js#L8
        .split(/\n|\r\n/g)
        .flatMap( x => x.split(/\.\s/g))
        .map( x => x.trim() )
        .map( x => {
            // strip headers and todos
            if( 
                x.startsWith('#') 
                || x.toLowerCase().startsWith('- [ ]') 
                || x.toLowerCase().startsWith('- []') 
                || x.toLowerCase().startsWith('- [x]') 
            ) {
                return ''
            }
            return x
        })
        .map( x => x.replace(/^(\+|\*|\-) /, ''))
        .filter(Boolean)
        .map( x => x.endsWith('.') || x.endsWith(':') ? x : x + '.' )

    let headingIndex = stack.findIndex( x => x.startsWith('#') )

    stack =
        headingIndex > 0
        ? stack.slice(0, headingIndex)
        : stack

    let next;
    while( next = stack.shift() ) {
        length += next.length
        if( length > 160 ) break;
        sentences.push(next)
    }

    return `
        #### [${x.title} (@${x.user.login})](https://github.com/${owner}/${repo}/pull/${x.number})

        ${sentences.join('  ').replace(/:\s+/g, ': ')}
    `
    .split('\n')
    .slice(1,-1)
    .map( x => x.replace(/^        /, ''))
    .join('\n')
}

function prSeverity(x){

    let prerelease = x.labels.find( x => x.name == 'prerelease' )
    let patch = x.labels.find( x => x.name == 'patch' )
    let minor = x.labels.find( x => x.name == 'minor' )
    let major = x.labels.find( x => x.name == 'major' )

    return [major, minor, patch, prerelease]
        .filter(Boolean)
        .map( x => x.name )
        [0] 
        || 'patch'
}

/**
 * Generate or update a release PR.
 */
async function pr(options){ 
    
    // check if a branch exists for candidate
        // error if not

    // check if a branch exists for production
        // error if not

    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')
    // let owner = 'harth-systems', repo = 'odin';

    let targetBranch, sourceBranch; {
        let xs = [
            octokit.rest.repos.getBranch({
                owner
                ,repo
                ,branch: target,
            })
            .catch( error )
            ,
            octokit.rest.repos.getBranch({
                owner
                ,repo
                ,branch: source,
            })
            .catch( error )
        ]
        xs = await Promise.all(xs)

        let [t,s] = xs
        targetBranch = t
        sourceBranch = s

        if( !targetBranch && !sourceBranch ) {
            throw new Error(`Could not find target(${target}) and source(${source}) branch.`)
        } else if (!targetBranch) {
            throw new Error(`Could not find target(${target}) branch.`)
        }  else if (!sourceBranch) {
            throw new Error(`Could not find source(${source}) branch.`)
        }
        
        verbose('Target Exists', targetBranch)
        verbose('Source Exists', sourceBranch)
    }

    // check if next -> main has a diff
        // exit 0 if not
        

    do {
        let diff = await octokit.rest.repos.compareCommits({
            owner
            ,repo
            ,base: target
            ,head: source
        })
        .catch(error)

        if( !diff ) {
            throw new Error(`Could not obtain diff information for target(${target} and source(${source})`)
        }

        verbose('diff',diff)
        if ( diff.data.status == 'behind' || diff.data.status == 'diverged' ) {
            break;
        } else if( diff.data.status == 'identical' || diff.data.files.length == 0 ) {
            info('No diff found, exiting with code zero.')
            return;
        } else if (diff.data.status == 'ahead' ) {
            // throw new Error(`Inverted diff! Branches target(${target}) is ahead of source(${source})`)
            break;
        } else {
            error(diff.data)
            throw new Error(`Unexpected branch state`)
        }
        
    } while(0)

    // At this point a diff exists, a PR is required.
    //
    // In order to generate the next version and the PR body
    // we need to look at the branches that were merged into
    // source that have not been merged into target.
    // there's a few ways you could do this, one is time based
    // e.g. get all the merged branches merged after the last
    // release was merged
    // but that doesn't account well for repos that handle
    // multi concurrent releases, so we need to also
    // check that those branches were targeting our source
    // branch
    // so we need to find if there's ever been a previous release
    // for this source branch, if so, we segment branches since then
    // otherwise we segment branches since inception


    let lastRelease = await getLastRelease({ owner, repo })

    const tags = await octokit.rest.repos.listTags({
        owner
        , repo
    });
    const mostRecentTag = 
        tags.data
        .sort( (a,b) => semver.compare(a.name, b.name) * -1 ).slice(0,1)
    
    const mostRecentTagSha = mostRecentTag.map( x => x.commit.sha )
    
    const mostRecentTagDate = await mostRecentTagSha.map( async commit_sha => {
        const ref = await octokit.rest.git.getCommit({
            owner
            ,repo
            ,commit_sha,
        })

        return ref.data.committer.date
    })
    [0]

    let thisRelease = await getThisRelease({ owner, repo })

    let recentBranches = 
        !lastRelease && mostRecentTagDate
        ? await getRecentBranchesFromLastCommitDate({ 
            owner, repo, mostRecentTagDate 
        })
        : await getRecentBranchesFromLastRelease({ owner, repo, lastRelease })

    if( recentBranches.length == 0 ){
        console.error('No releasable changes found, exiting with code zero.')
        return
    }

    verbose('recentBranches', recentBranches)

    let { version } = await inferVersion({ owner, repo, lastRelease })

    function changeDescriptions(level, xs){
        xs = xs || []
        return xs.length > 0 
        ? xs.map( x => changeDescription(x, { owner, repo }) ).join('\n')
        : options.compact ? '' : `No ${level} changes in this release.`
    }

    function changeSummary(){
        let s = recentBranches
            .map( x => `- #${x.number}` )
            .join('\n')

        return `
            ${markers.changeSummary.start}

            ${s}

            ${markers.changeSummary.end}
        `
        .split('\n')
        .slice(1,-1)
        .map( x => x.replace(/^            /, ''))
        .join('\n')
    }

    let title = s => s[0].toUpperCase() + s.slice(1)

    function changeLog(){

        let items = []
        for ( let level of ['major', 'minor', 'patch']) {
            let xs = severityIdx[level]
            let s = changeDescriptions(level, xs, options)

            if (options.compact && !s) continue;

            items.push(
                `
                ### ${title(level)} Changes

                ${s}
                `
                .slice(1,-1)
                .replace(/^                /gm, '')
            )
        }

        if ( items.length ) {
            return `
                ${markers.changelog.start}
                ${ items.join('\n') }
                ${markers.changelog.end}
            `
            .slice(1,-1)
            .replace(/^                /gm, '')
        }

        return ''
    }

    let severityIdx = groupBy( x => prSeverity(x), recentBranches )

    let nextVersion = getNextVersion({ recentBranches, version })

    let defaultTitle = `Release - v${nextVersion}`

    let thankYouMessage = () => 
        [ `Thank you to the following contributors for helping make **${repo}** better.`
        , `Many thanks to all wonderful contributors who helped make this release possible.`
        , `Thanks goes to the contributors for their time, effort and hard work.`
        ]

    function contributors(){
        return `
            ${markers.contributors.start}

            ${options.thanks ? thankYouMessage() : ''}

            ${[...new Set(recentBranches.map( x => `- @${x.user.login}` ))].join('\n')}

            ${markers.contributors.end}
        `
        .slice(1,-1)
        .replace(/^            /gm, '')
    }
    function defaultBody(){

        let section_header =`
            # Release v${nextVersion}

            ${changeSummary()}
        `

        let section_changelog = `
            ## Changelog

            ${changeLog(options)}
        `

        let section_contributors = options.contributors ? '' : `
            ## Contributors

            ${contributors()}
        `

        
        let defaultBody = 
        (section_header
        + section_changelog
        + section_contributors)
        .split('\n')
        .map( x => x.replace(/^            /, '') )
        .join('\n')

        return defaultBody
    }

    let oldVersion =
        thisRelease
        ? thisRelease.title.split(/v|\s/).find( x => semver.valid(x) )
        : null

    function updateTitle(thisRelease, version){
        return thisRelease.title.replace(escapeRegExp(oldVersion), version)
    }

    function updateBody(){
        if( !thisRelease.body ) return defaultBody()
        let lines = thisRelease.body.split(/\r\n|\n/)
        let output = []
        
        while (lines.length) {
            let line = lines.shift()

            if( line.includes(markers.changeSummary.start) ){
                output.push( changeSummary(recentBranches) )
                let i = lines.indexOf(markers.changeSummary.end)
                if( i < 0 ) throw new Error('Malformed.  Unable to update PR body.')
                lines = lines.slice(i+1)
            } else if( line.includes(markers.changelog.start) ){
                output.push( changeLog(options) )
                let i = lines.indexOf(markers.changelog.end)
                if( i < 0 ) throw new Error('Malformed.  Unable to update PR body.')
                lines = lines.slice(i+1)
            } else if( line.includes(markers.contributors.start) ){
                output.push( contributors() )
                let i = lines.indexOf(markers.contributors.end)
                if( i < 0 ) throw new Error('Malformed.  Unable to update PR body.')
                lines = lines.slice(i+1)
            } else {
                output.push(line)
            }
        }

        output = output.join('\n')

        return output.replace(new RegExp(escapeRegExp(oldVersion), 'g'), nextVersion)
    }

    let labels; {
        let xs 
        xs = recentBranches
        xs = xs.flatMap( x => x.labels )
        xs = xs.map( x => x.name )
        xs = [...new Set(xs)]
        xs = xs
        labels = xs
    }

    options.verbose && console.log('about to POST/PUT a release pr')
    if( !thisRelease ) {
        options.verbose && console.log('posting release', {
            owner
            ,repo
            ,head: source
            ,base: target
            ,title: defaultTitle
            // ,body: defaultBody()
            ,labels
        })
        let x = await octokit.rest.pulls.create({
            owner
            ,repo
            ,head: source
            ,base: target
            ,title: defaultTitle
            ,body: defaultBody()
            ,labels
        });
        thisRelease = x.data
    } else {
        let pull_number = thisRelease.number
        options.verbose && console.log('patching release', {
            owner
            ,repo
            ,head: source
            ,base: target
            ,title: defaultTitle
            // ,body: defaultBody()
            ,pull_number
            ,labels
        })
        let title = updateTitle(thisRelease, nextVersion)
        let body = updateBody(thisRelease, defaultBody())

        options.verbose && console.log('about to patch', {
            owner
            ,repo
            ,pull_number
        })

        await octokit.rest.pulls.update({
            owner
            ,repo
            ,pull_number
            ,title
            ,body
        });
    }

    if( labels.length ) {
        options.verbose && console.log('adding labels', {
            owner
            ,repo
            ,head: source
            ,base: target
            ,title: defaultTitle
            // ,body: defaultBody()
            ,labels
        })
        await octokit.rest.issues.addLabels({
            labels
            ,issue_number: thisRelease.number
            ,owner
            ,repo
        })
    }
}

async function changelog(options){
    let x = await extractChangelog({})

    if( x.changelog + x.changeSummary + x.contributorsBody == '' ) {
        verbose('No changes to log.  Exiting.')
        return x
    }

    let body = `
    # Release v${x.version}
    ${x.contributorsBody}
    ${x.changelog.trim()}
    `
    // .replace(/^      /gm, '')
    .replace(/    /gm, '')

    if (!options.out) options.out = 'changelog.md'
    
    await fs.mkdir(path.dirname(options.out), { recursive: true })
    
    let exists = await fs.stat(options.out).catch(() => null)
    if ( exists ) {
        let existing = await fs.readFile(options.out, 'utf8')
        
        await fs.writeFile(options.out, body += existing)
    } else {
        await fs.writeFile(options.out, body )
    }

    return x
}

// If the target branch has diverged from the source we create an archive of the old target
// and force reset the sha of the current target to the source sha so they are the same
// if options.clean is active, we delete the archive branch if everything worked successfully
async function repairTarget(options){
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')
    let new_name = `${target}-archive-${Date.now()}`

    let newTargetSHA = await getSha({ owner, repo }, source)
    let oldTargetSHA = await getSha({ owner, repo }, target)


    // Create a copy of the existing target branch
    await octokit.rest.git.createRef({
        owner
        ,repo
        ,ref: `refs/heads/${new_name}`
        ,sha: oldTargetSHA
    })

    await octokit.rest.git.updateRef({
        owner
        ,repo
        ,ref: `heads/${target}`
        ,sha: newTargetSHA
        ,force: true
    })

    if (options.clean) {
        // delete archive branch
        await octokit.rest.git.deleteRef({
            owner, repo, ref: `heads/${new_name}`
        })
    }
}

async function diffChanges({ base, head, ignore=[] }){
    await $`git fetch`
    let x = await $`git diff --raw ${base} ${head} ${ignore.map( x => `:(exclude)${x}`)}`
    x = x.stdout
    // let example = `
    // :100644 000000 82447c4 0000000 D        .vscode/launch.json
    // :100644 100755 c1ae457 c1ae457 M        changelog.md
    // :100644 100644 3e7135e 4497c93 M        lib/index.js
    // :100644 100644 f10d357 f10d357 R100     rollup.config.js        rollup.config.js2
    // `
    // x = example
    
    x = x
    .trim()
    .split('\n')
    .filter(Boolean)
    .map( x => x.trim().split(/\s+/))
    .map(async ([
        oldMode, newMode, oldSha, newSha, type, filename, ...rest 
    ]) => {
        oldMode = oldMode.slice(1)

        
        if ( type != 'D' ) {
            newSha = (await $`git rev-parse ${newSha}`).stdout.trim()
        }
        
        type = type[0]
        let oldFilename = {};
        if( type == 'R' ) {
            oldFilename = { oldFilename: filename }
            filename = rest[0]
        }
        return { 
            oldMode, newMode, oldSha, newSha, type, filename, ...oldFilename 
        }
    })
    x = await Promise.all(x)

    let changes = x.flatMap( x => {
        if( x.type == 'D' ) {
            return [
                { sha: null, type: 'blob', mode: x.newMode, path: x.filename }
            ]
        } else if ( x.type == 'A' || x.type == 'C' ) {
            return [
                { sha: x.newSha, type: 'blob', mode: x.newMode, path: x.filename }
            ]
        } else if ( x.type == 'R' ) {
            return [
                { sha: null, type: 'blob', mode: x.newMode, path: x.oldFilename }
                ,
                { sha: x.newSha, type: 'blob', mode: x.newMode, path: x.filename }
            ]
        } else if ( x.type == 'M' ) {
            return [
                { sha: x.newSha, type: 'blob', mode: x.newMode, path: x.filename }
            ]
        } else {
            throw new Error('Cannot rollback as changeset includes change type of ' + x.type)
        }
    })

    if( changes.length < 1 ) {
        throw new Error(`There are no changes between ${base} and ${head} to diff.`)
    }

    return changes
}

/**
 *  1. Performs a git revert to a previous release
 *  2. Automatically applies that revert to main/next
 *  3. Automatically creates a PR to reintroduce the reverted changes
 * 
 * The revert, is almost like git revert, except we use the github API
 * to generate a new commit that includes all the differences between
 * the two versions except for any files matching the globs specified
 * via --ignore
 *
 */
async function rollback({ version, ignore=null }){
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

    ignore = ignore || ''
    ignore = [].concat(ignore)

    let currentReleaseTag;
    if(!version) {
        let x = await octokit.rest.repos.listReleases({
            owner, repo, per_page: 3, page: 1
        })
        x = x.data
        let [lastRelease, rollbackRelease] = 
            x.sort( (a,b) => semver.compare(a.tag_name, b.tag_name) * -1 )
        // find previous version
        rollbackRelease; lastRelease;
        if(!rollbackRelease) return error('There is no previous release to rollback to.')

        version = rollbackRelease.tag_name
        currentReleaseTag = lastRelease.tag_name
    } else if (version) {

        let x = await octokit.rest.repos.getReleaseByTag({
            owner
            ,repo
            ,tag: version,
        }).catch( () => null )

        if(!x) return error('Could not find an existing release for version',version)

        {
            let x = await octokit.rest.repos.listReleases({
                owner, repo, per_page: 1, page: 1
            })
            x = x.data
            if( x.length == 0) error('There is no release to rollback from')
            currentReleaseTag = x[0].tag_name
        }
    }

    let rollbackTagSHA; {
        let x = await octokit.rest.git.getRef({
            owner, repo, ref: `tags/${version}`
        })

        rollbackTagSHA = x.data.object.sha
    }

    let targetSHA = await getSha({ owner, repo }, target)
    let sourceSHA = await getSha({ owner, repo }, source)
    
    // back up source if special
    if( sourceSHA != targetSHA ) {
        let sourceArchiveName = `${source}-archive-${Date.now()}`
        // create backup of main
        await octokit.rest.git.createRef({
            owner
            ,repo
            ,ref: `refs/heads/${sourceArchiveName}`
            ,sha: sourceSHA
        })
    }

    let revertSHA; {
        let changes = 
            await diffChanges({ base: targetSHA, head: rollbackTagSHA, ignore })
    
        let base_tree = (
            await octokit.rest.git.getRef({ owner, repo, ref: `heads/${target}` })
        )
        .data.object.sha
    
        let tree = await octokit.rest.git.createTree({
            owner
            ,repo
            ,tree: changes
            ,base_tree
        })
    
        let commit = await octokit.rest.git.createCommit({
            owner
            , repo
            , message: 'Rollback to '+version
                +`\n\n [skip ci]`
            , tree: tree.data.sha
            , parents: [base_tree]
        })

        // forward target to new target state
        await octokit.rest.git.updateRef({
            owner
            ,repo
            ,ref: `heads/${target}`
            ,sha: commit.data.sha
        })

        // forward source to new target state
        await octokit.rest.git.updateRef({
            owner
            ,repo
            ,ref: `heads/${source}`
            ,sha: commit.data.sha
        })

        let prerelease = semver.prerelease(currentReleaseTag, 'prerelease')
        let level = 
            prerelease
            ? ['prerelease', ...prerelease]
            : ['patch']

        let newReleaseTag = semver.inc(currentReleaseTag, ...level)

        await octokit.rest.repos.createRelease({
            owner
            ,repo
            ,tag_name: `v${newReleaseTag}`
            ,name: `v${newReleaseTag} - Rollback of ${currentReleaseTag}`
            ,target_commitish: target
            ,body: `${currentReleaseTag} was rolled back.`
        });

        revertSHA = commit.data.sha
    }

    'Open a PR to re-apply rolled back changes'; {
        let rollbackPRName = `prr/reinstate-${currentReleaseTag}-${Date.now()}`
        await octokit.rest.git.createRef({
            owner
            ,repo
            ,ref: `refs/heads/${rollbackPRName}`
            ,sha: revertSHA
        })

        let changes = 
            await diffChanges({ base: rollbackTagSHA, head: targetSHA, ignore })
    
        let base_tree = (
            await octokit.rest.git.getRef({ owner, repo, ref: `heads/${rollbackPRName}` })
        )
        .data.object.sha
    
        let tree = await octokit.rest.git.createTree({
            owner
            ,repo
            ,tree: changes
            ,base_tree
        })
    
        let commit = await octokit.rest.git.createCommit({
            owner
            , repo
            , message: 'Reinstate rolled back changes from '+currentReleaseTag
            , tree: tree.data.sha
            , parents: [base_tree]
        })

        // forward target to new target state
        await octokit.rest.git.updateRef({
            owner
            ,repo
            ,ref: `heads/${rollbackPRName}`
            ,sha: commit.data.sha
        })

        await octokit.rest.pulls.create({
            owner
            , repo
            , head: rollbackPRName
            , base: source
            , title: `Reinstate rolled back changes from ${currentReleaseTag}`
            , body: `
            This PR contains all changes after ${version} through to the latest release ${currentReleaseTag}.

            These changes were previously removed from ${source} and ${target}.  You can re-instate them by merging this PR.

            However, this branch was likely rolled back for a reason.  You can use this branch to explore any reported bugs and fix them before re-instating these changes.

            Because your ${source} and ${target} branches have been scrubbed clean of these changes you can continue to work on other unrelated changes and release them while errors in this changeset are investigated.
            `
            .replace(/^            /gm, '')
        })
    }

    return null
}

async function featurePR(){
    // Ensure there is not a PR for the current branch
    // Ensure the current branch is targeting $source
    // If so, create a PR automatically
    // If drafts are available, use them
    
    
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')
    let branch = process.env.GITHUB_REF.replace('refs/heads/', '')

    if( [source, target].includes(branch) ){
        return;
    }

    // todo-james make optional
    if( branch.split('/').length == 1 ) {
        return;
    }

    let changes = (await $`git fetch --all && git diff origin/next --name-only`).stdout.trim().split('\n')
    if( changes.length == 0 ) return;

    let useDraft; {

        let repo2 = await octokit.rest.repos.get({
            owner, repo
        })
        repo2 = repo2.data
    
        let user = await octokit.rest.users.getByUsername({
            username: owner
        })
        user = user.data
    
        let org, plan; {
            if(user.type == 'Organization'){
                org = await octokit.rest.orgs.get({
                    org: owner
                })
                org = org.data
                plan = org.plan
            }
        }
    
        useDraft = 
            !repo2.private || plan.name == 'team'
    }

    let [existing] = 
        await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
            q: `head:${branch} base:${source} is:pr is:open repo:${owner}/${repo}`
            ,sort: 'updated'
            ,order: 'desc'
            ,per_page: 1
            ,page: 1
        })
        useDraft;

    let commitSubject; {
        try {
            commitSubject = (await $`git show -s --format=%s HEAD`)
            .stdout.trim()
        } catch (e) {
            commitSubject = branch
        }
    }

    if(!existing) {
        await octokit.rest.pulls.create({
            owner
            ,repo
            ,title: commitSubject
            ,head: branch
            ,base: source
            ,draft: useDraft
        })
    }

    return;
}

// todo-james document?
async function updateRef(options, branch=options.branch, sha=options.sha){
    // c5012a1f1affc11147373305a37f932810d2337a
    
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

    if(!branch && !sha) {
        console.error('You must provide branch and sha')
    }

    await $`git fetch`
    await $`git rev-parse ${sha}`
    await $`git rev-parse ${branch}`

    await octokit.rest.git.updateRef({
        owner, repo, ref: `heads/${branch}`, sha: sha, force: options.force
    })
}

// Can't rely on just npm info because GITHUB_REPOSITORY
// is the source of truth, not the cwd.
async function inferPreReleaseExternal({ 
    preid='next'
    , 'package-path': packagePath='package.json'
    , publish=false
    , apply=publish
}={}){

    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

    let x = await octokit.rest.repos.getContent({
        owner, repo, path: packagePath
    })
    x = x.data.content
    x = Buffer.from(x, 'base64').toString()
    x = JSON.parse(x)

    x = (await $`npm info ${x.name} --json`).stdout
    x = JSON.parse(x)

    x = x['dist-tags']
    x = x[preid]

    let existingPreReleaseVersion = x

    let lastRelease = await getLastRelease({ owner, repo })
    
    let openBranches = 
        lastRelease
        ? await getRecentBranchesFromLastRelease({ owner, repo, lastRelease })
        : []

    let { version } = 
        await inferVersion({ owner, repo, lastRelease })

    let nextVersion = 
        await getNextVersion({ recentBranches: openBranches, version })

    
    if(!semver.prerelease(nextVersion)){
        x = nextVersion+'-'+preid+'.0'
    } else {
        x = semver.inc(nextVersion, 'prerelease')
    }

    if ( existingPreReleaseVersion ) {
        if( semver.compare(x,existingPreReleaseVersion) == 0) {
            verbose('prerelease version already exists incrementing...')
            x=semver.inc(x, 'prerelease')
        } else if (semver.compare(x,existingPreReleaseVersion) == -1) {
            verbose('prerelease version is < an existing prerelease version')
            verbose('using published prerelease version as base...')
            x = semver.inc(existingPreReleaseVersion, 'prerelease')
        }
    }
    
    if ( apply ) {
        await $`npm version ${x} --no-verify --no-commit-hooks --no-git-tag-version`
    }
    if (publish) {
        let tag = typeof publish == 'string' ? publish : preid
        await $`npm publish --tag=${tag}`
    }

    if(!apply) {
        console.log(x)
    }
}

let help = ({ green, blue, magenta, red }) => 
`${green(`pr-release`)} 

version: ${pkg.version}

${green(`pr-release`)} ${magenta(`subcommand`)} ${blue(`--options`)}

subcommands:

  ${blue(`global flags`)}

    ${blue(`--source <branch>`)}

                        (default=next) Specify the branch that is considered the staging branch.

    ${blue(`--target <branch>`)}

                        (default=main) Specify the branch that is considered the production branch.

  ${magenta(`pr`)}

                        Updates or creates the release PR.  Should run on every relevant merge event.

    ${blue(`--compact`)}

                        Less ceremonial changelog output.

    ${blue(`--no-contributors`)}

                        Do not include contributor information in PR description or changelog

    ${blue(`--no-thanks`)}

                        Do not thank contributors in changelog or release PR

  ${magenta(`merge`)}

                        Commits updated changelog and creates new npm/github/etc release.
                        Should run on every relevant merge event.

    ${blue(`--force`)}

                        Will repair the target branch if a fast forward update is not possible.  
                        Otherwise will simply error that the branches have diverged or exit with
                        code zero if everything is fine.

    ${blue(`--clean`)}

                        By default --force will archive the old target branch under an alias.
                        Use --clean to remove the archived old target branch once the process has
                        completed successfully.

    ${blue(`--changelog`)} ${magenta('filepath')}

                        Generate/update the markdown changelog.  

                        ${magenta('filepath')} defaults to changelog.md

  ${magenta(`actions-yml`)}

                        Scaffold Github actions yml files

  ${magenta(`rollback`)}

                        Updates the --source and --target branch to a previous
                        release point but retains version information and any
                        other excluded files (e.g. package.json/lock).

                        Unlike git revert we do not apply changes that undoes
                        the current change, we rewind time to that point 
                        in time and then re-apply specific changes like git tags
                        and manifest files.

                        The previous version of history is kept in a new branch
                        which is called rollback-<old-version-slug>-<new-version-slug>
                        where the slug is replacing special characters with underscores.

                        This branch will then automatically have a PR created targeting
                        the --source branch that if merged would generate a release PR that would 
                        reinstate the state prior to rolling back.

                        This is a perfect place to identify fixes for the issue that triggered
                        a rollback in the first place.

    ${blue(`--version=<tag>`)}

                        The version, git ref or SHA to rollback too.  The version
                        must exist in the --source history.  If not provided 
                        the version will be inferred to be the last release.
                        We identify releases by searching through the github releases
                        API response.

    ${blue(`--ignore <glob>`)}

                        Specify files that should not be rolled back.  Any files matching these globs
                        will be re-applied to the rollback commit.  This is useful for 
                        maintaining version updates in manifest files such as package.json.

  ${magenta(`infer-version`)}

                        Outputs the version pr-release estimates the next release should be.
                        This is the same function used to generate the versions in the title
                        header and body but as a standalone command.

  ${red(`Advanced Commands`)}
  ${red(`-----------------`)}

  ${magenta(`repair-target`)}

                        Generate a new target branch from the source sha.  Helpful
                        if your target branch has a different history to the source
                        branch (e.g. an accidental squash into target).

    ${blue(`--force`)}

                        Will only repair the target branch with a --force flag.  Otherwise
                        will simply error that the branches have diverged or exit with
                        code zero if everything is fine.

    ${blue(`--clean`)}

                        By default will archive the old target branch.  Use --clean
                        to remove the old target branch.

${magenta(`infer-prerelease`)}

                        Outputs the version pr-release estimates the next release should be.
                        This is the same function used to generate the versions in the title
                        header and body but as a standalone command.


    ${blue(`--preid=next`)}

                        Specifies the prerelease format, e.g. --preid=alpha results in v1.0.0-alpha.0

    ${blue(`--package-path=package.json`)}

                        To support monorepos that have package.json at child directory paths

    ${blue(`--apply`)}

                        Applies inferred version to package.json in CI, to enable publishing.

    ${blue(`--publish=<tag>`)}

                        Publish the prerelease version to npm (implies --apply)

                        ${blue(`--publish`)} will publish to the same release channel as preid (defaults to next)

                        ${blue(`--publish=alpha`)} will publish to the specified channel, in this case alpha
`

let [subcommand] = argv._

let subcommands = {
    pr
    , merge
    , 'actions-yml': actionsYML
    , 'extract-changelog': extractChangelog
    , changelog
    , 'feature-pr': featurePR
    , 'repair-target': repairTarget
    , rollback
    , 'update-ref': updateRef
    , 'generate-templates': generateTemplates
    , 'update-docs': updateDocs
    , 'infer-version': inferVersionExternal
    , 'infer-prerelease': inferPreReleaseExternal
}

let preflights = {
    pr
    , merge
    , 'extract-changelog': extractChangelog
    , changelog
    , 'feature-pr': featurePR
    , 'repair-target': repairTarget
    , rollback
    , 'update-ref': updateRef
    , 'infer-version': inferVersionExternal
    , 'infer-prerelease': inferPreReleaseExternal
}


export async function main(){

    if (argv.help) {
        console.error(help(chalk))
    } else if( !subcommand ){
        console.error(help(chalk))
        process.exitCode = 1
    } else if ( !(subcommand in subcommands) ) {
        console.error(chalk.red`Unknown subcommand ${subcommand}`)
        console.error(help(chalk))
        process.exitCode = 1
    } else {
        let f = subcommands[subcommand]
        argv._.shift()
        try {
            if( preflights[subcommand] ) await preflight(argv._, argv)

            argv = { contributors: true, thanks: true, ...argv }

            await f(argv, ...argv._)
        } catch (e) {
            console.error(e)
            process.exitCode = 1
        }
    }
}
