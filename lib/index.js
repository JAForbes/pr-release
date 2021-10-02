/* globals console, process */
import { Buffer } from 'buffer'
import path from 'path'
import { chalk, argv, $, fs } from 'zx'
import dotenv from 'dotenv'
import { Octokit as OriginalOctokit } from 'octokit'
import { throttling } from '@octokit/plugin-throttling'
import semver from 'semver'

let Octokit = OriginalOctokit.plugin(throttling)

dotenv.config()

argv.verbose = argv.verbose || argv.v
$.verbose = argv.verbose

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
    

    tag = tag.find( x => semver.valid(x.name) )
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

async function actionsYML(){
    await fs.mkdir('./.github/workflows', { recursive: true })

    let templates = [
        'pr.yml',
        'merge.yml'
    ]

    for( let file of templates ) {
        let x = await fs.readFile(`./templates/${file}`, 'utf8')
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

    let [a,b] = 
        await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
            q: `is:pr is:merged base:${target} head:${source} repo:${owner}/${repo}`
            ,sort: 'updated'
            ,order: 'desc'
            ,per_page: 2
            ,page: 1
        })

    let recentBranches = 
        await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
            q: `merged:>${a.closed_at} and merged:<${b.closed_at} base:${source} is:pr is:merged repo:${owner}/${repo}`
            ,sort: 'updated'
            ,order: 'desc'
            ,per_page: 2
            ,page: 1
        })

    let lines = lastRelease.body.split('\n')

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
        body: lastRelease.body
        , changeSummary
        , changelog
        , contributors
        , contributorsBody
        , major
        , minor
        , patch
        , version
        , labels
        , pulls
    }


    if (options.out) {
        if (options.out === true) options.out = './.pr-release'

        await fs.rmdir(options.out, { recursive: true })
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

async function getRecentBranches({ owner, repo, lastRelease }){
    let recentBranches;

    let mergedAfter = lastRelease ? ` merged:>${lastRelease.closed_at}` : ``
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

    let out = await extractChangelog({})
    let { version } = out
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

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
            return;
        }
    }

    // eslint-disable-next-line no-unused-vars
    let sha = process.env.GITHUB_SHA || await getSha({ owner, repo }, target)

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

        if( untracked.length == 0 && changes !== 0 ) break commit;

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
            , message: options.message || 'Release Artifacts for v'+version
            , tree: tree.data.sha
            , parents: [base_tree]
        })

        // eslint-disable-next-line no-unused-vars
        sha = commit.data.sha

        await octokit.rest.git.updateRef({
            owner, repo, ref: `heads/${target}`, sha
        })
    }

    // Create the tag
    // may not need this, just create release instead
    // await octokit.rest.git.createRef({
    //     owner, repo, ref: `refs/tags/v${version}`, sha
    // })

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

    if( options.refresh || options.refreshClean ){
        await recreateSourceBranch({
            ...options, clean: !!options.refreshClean
        })
    }
}

async function inferVersion({ owner, repo, lastRelease }){
    let versionTypes = {
        git: await getGitTagVersion({ owner, repo })
        ,npm: await getPackageJSONVersion({ owner, repo })
        ,title: getVersionFromReleasePR(lastRelease)
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
/**
 * Generate or update a release PR.
 */
async function pr(){ 
    
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

    let thisRelease = await getThisRelease({ owner, repo })

    let recentBranches = await getRecentBranches({ owner, repo, lastRelease })

    if( recentBranches.length == 0 ){
        console.error('No releasable changes found, exitting with code zero.')
        // return
    }

    
    verbose('recentBranches', recentBranches)

    let { version } = await inferVersion({ owner, repo, lastRelease })

    function severity(x){
        
        let patch = x.labels.find( x => x.name == 'patch' )
        let minor = x.labels.find( x => x.name == 'minor' )
        let major = x.labels.find( x => x.name == 'major' )

        return [major, minor, patch]
            .filter(Boolean)
            .map( x => x.name )
            [0] 
            || 'patch'
    }

    function changeDescriptions(level, xs){
        xs = xs || []
        return xs.length > 0 
        ? xs.map( x => changeDescription(x) ).join('\n')
        : `No ${level} changes in this release.`
    }

    function changeDescription(x){
        
        let sentences = []
        let length = 0;
        let stack = 
            (x.body || '')
            .split(/\n|\r\n/g)
            .flatMap( x => x.split(/\.\s/g))
            .map( x => x.trim() )
            .filter(Boolean)
            .map( x => x.endsWith('.') ? x : x + '.' )

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

            ${sentences.join('  ')}
        `
        .split('\n')
        .slice(1,-1)
        .map( x => x.replace(/^            /, ''))
        .join('\n')
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

    function changeLog(){
        return `
            ${markers.changelog.start}

            ### Major Changes

            ${changeDescriptions('major', severityIdx.major)}

            ### Minor Changes

            ${changeDescriptions('minor', severityIdx.minor)}

            ### Patches

            ${changeDescriptions('patch', severityIdx.patch)}

            ${markers.changelog.end}
        `
        .split('\n')
        .slice(1,-1)
        .map( x => x.replace(/^            /, ''))
        .join('\n')
    }

    let severityIdx = groupBy( severity, recentBranches )

    // todo-james
    let nextVersion; {
        nextVersion = semver.clean(version)
        for(let level of ['patch', 'minor', 'major']){
            let n = severityIdx[level] ? severityIdx[level].length : 0
            for( let i = 0; i < n; i++ ) {
                nextVersion = semver.inc(nextVersion, level)
            }
        }
    }

    let defaultTitle = `Release - v${nextVersion}`

    function contributors(){
        return `
            ${markers.contributors.start}

            Thank you to the following contributors for helping make **${repo}** better:

            ${[...new Set(recentBranches.map( x => `- @${x.user.login}` ))].join('\n')}

            ${markers.contributors.end}
        `
        .split('\n')
        .map( x => x.replace(/^            /, '') )
        .join('\n')
    }
    function defaultBody(){

        let defaultBody = `
            # Release v${nextVersion}

            ${changeSummary()}

            ## Changelog

            ${changeLog()}

            ## Contributors

            ${contributors()}
        `
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
        return thisRelease.title.replace(oldVersion, version)
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
                output.push( changeLog() )
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

        return output.replace(new RegExp(oldVersion, 'g'), nextVersion)
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

    if( !thisRelease ) {
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
        await octokit.rest.pulls.update({
            owner
            ,repo
            ,pull_number: thisRelease.number
            ,title: updateTitle(thisRelease, nextVersion)
            ,body: updateBody(thisRelease, defaultBody())
        });
    }
    await octokit.rest.issues.addLabels({
        labels
        ,issue_number: thisRelease.number
        ,owner
        ,repo
    })
}

async function recreateSourceBranch(options){
    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')
    let x = await octokit.rest.git.getRef({
        owner, repo, ref: `heads/${target}`
    })
    let sourceSha = x.data.object.sha
    // create new branch based off ${target} named `${source}-candidate-${iso}`
    let candidateName = `${source}-candidate-${new Date().getTime()}`
    let archiveName = `${source}-archive-${new Date().getTime()}`

    await octokit.rest.git.createRef({
        owner, repo, ref: `refs/heads/${candidateName}`, sha: sourceSha
    })

    await octokit.rest.repos.renameBranch({
        owner, repo, branch: 'next', new_name: archiveName
    })

    await octokit.rest.repos.renameBranch({
        owner, repo, branch: candidateName, new_name: 'next'
    })

    // should happen automatically because it is pattern based
        // migrate protected rules, settings, patterns

    // update repo default branch
    await octokit.rest.repos.update({
        owner, repo, default_branch: 'next'
    })

    // check if this happens automatically
        // update all open PRs targeting old ${source} to target new ${source}

    let prs = 
        await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
            q: `is:pr is:open base:${source} repo:${owner}/${repo}`
        })

    for( let pr of prs ) {
        await octokit.rest.pulls.update({
            owner, repo, pull_number: pr.number, base: 'next'
        })
    }

    if (true || options.clean) {
        // delete archive branch
        await octokit.rest.git.deleteRef({
            owner, repo, ref: `heads/${archiveName}`
        })
    }
}

async function changelog(options){
    let x = await extractChangelog({})


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
}

let help=
chalk`{green pr-release} 

version: v0.0.0

{green pr-release} {magenta subcommand} {blue --options}

subcommands:

  {blue global flags}

    {blue --source <branch>}

                        (default=next) Specify the branch that is considered the staging branch.

    {blue --target <branch>}

                        (default=main) Specify the branch that is considered the production branch.

  {magenta pr}

                        Updates or creates the release PR.  Should run on every relevant merge event.

  {magenta merge}

                        Commits updated changelog and creates new npm/github/etc release.
                        Should run on every relevant merge event.

    {blue --refresh} 
    {blue --refresh-clean}

                        Recreate the source branch from the current target branch ref.
                        Automatically migrates open PRs, and updates the default branch on the repository.

                        {blue --refresh-clean} will also delete the old source branch while {blue --refresh}
                        will simply rename it as <source>-archive-<timestamp>

  {magenta actions-yml}

                        Scaffold Github actions yml files
`

let [subcommand] = argv._

let subcommands = {
    pr
    , merge
    , 'actions-yml': actionsYML
    , 'extract-changelog': extractChangelog
    , changelog
    , recreateSourceBranch
}

let preflights = {
    pr
    , merge
    , 'extract-changelog': extractChangelog
    , changelog
    , recreateSourceBranch
}


export async function main(){

    if (argv.help) {
        console.error(help)
    } else if( !subcommand ){
        console.error(help)
        process.exitCode = 1
    } else if ( !(subcommand in subcommands) ) {
        console.error(chalk.red`Unknown subcommand ${subcommand}`)
        console.error(help)
        process.exitCode = 1
    } else {
        let f = subcommands[subcommand]
        argv._.shift()
        try {
            if( preflights[subcommand] ) await preflight(argv._, argv)
            await f(argv, ...argv._)
        } catch (e) {
            console.error(e)
            process.exitCode = 1
        }
    }
}
