#!/usr/bin/env node
/* globals console, process */
import { Buffer } from 'buffer'
import { chalk, argv, $ } from 'zx'
import dotenv from 'dotenv'
import { Octokit } from 'octokit'
import semver from 'semver'

dotenv.config()

argv.verbose = argv.verbose || argv.v
$.verbose = argv.verbose

/**
 * @typedef { import("octokit").Octokit } Octokit
 */

/** @type {Octokit} */
let octokit;


let user;

let source = argv.source || 'next'
let target = argv.target || 'main'

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

async function getVersionFromReleasePR(x){
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
async function preflight(){
    await debose( async () => {
        if( !process.env.GITHUB_REPOSITORY ) throw new Error('GITHUB_REPOSITORY is required')
        if( !process.env.GITHUB_TOKEN ) throw new Error('GITHUB_TOKEN is required')
    
        octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
        let response = await octokit.rest.users.getAuthenticated()
        
        if( response.status != 200) throw new Error('Could not verify the validity of your GITHUB_TOKEN')
        user = response.data
        verbose('Authed as', user)
    })
}
async function plan(){ console.log('plan') }
async function apply(){ console.log('apply') }
// async function version(){ console.log('version') }
// async function commit(){ console.log('commit') }
// async function contributors(){ console.log('contributors') }

// async function changelog(){ console.log('changelog') }
// async function breaking(){ console.log('breaking') }
// async function enhancements(){ console.log('enhancements') }
// async function fixes(){ console.log('fixes') }
async function show(){ console.log('show') }

async function pr(x){ 
    if(x.dry) console.log('Performing dry run')
    
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
            process.exitCode = 0
            // return;
        } else if (diff.data.status == 'ahead' ) {
            throw new Error(`Inverted diff! Branches target(${target}) is ahead of source(${source})`)
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


    let lastRelease; {
        lastRelease = await octokit.rest.search.issuesAndPullRequests({
            q: `is:pr is:merged base:${source} head:${target} repo:${owner}/${repo}`
            ,sort: 'updated'
            ,order: 'desc'
            ,per_page: 1
            ,page: 1
        })
        lastRelease = lastRelease.data.items[0]
    }

    let thisRelease; {
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
    }

    let recentBranches; {

        let mergedAfter = lastRelease ? ` merged:>${lastRelease.closed_at}` : ``
        let q = `is:pr is:merged base:${source} repo:${owner}/${repo}${mergedAfter}`
        verbose('Searching for recent branches', q)
        recentBranches = 
            await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
                q
                ,sort: 'updated'
                ,order: 'desc'
            })

    }

    if( recentBranches.length == 0 ){
        console.error('No releasable changes found, exitting with code zero.')
        process.exitCode = 0
        // return
    }

    
    verbose('recentBranches', recentBranches)

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
            if( cmp == 1 ) version = v
        } else if (v) {
            version = v
            versionType = k
        }
    }

    verbose(`Using version type:`, versionType)
    verbose(`Previous version set to`, version)

    function severity(x){
        
        let patch = x.labels.find( x => x.name == 'patch' )
        let minor = x.labels.find( x => x.name == 'minor' )
        let major = x.labels.find( x => x.name == 'major' )

        return major || minor || patch || 'patch'
    }

    function changeSummary(xs){
        return xs
            .map( x => `- #${x.number}` )
            .join('\n')
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
            x.body
            .split(/\n|\r\n/g)
            .flatMap( x => x.split(/\.\s/g))
            .map( x => x.trim() )
            .filter(Boolean)
            .map( x => x.endsWith('.') ? x : x + '.' )

        stack =
            stack.slice(0, stack.findIndex( x => x.startsWith('#')))

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

    function changeLog(){
        return `
            ${changeSummary(recentBranches)}

            ## Changelog

            ### Major Changes

            ${changeDescriptions('major', severityIdx.major)}

            ### Minor Changes

            ${changeDescriptions('minor', severityIdx.minor)}

            ### Patches

            ${changeDescriptions('patch', severityIdx.patch)}
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

    function defaultBody(){

        let defaultBody = `
            # Release v${nextVersion}

            ${changeLog(recentBranches)}

            ## Contributors

            Thank you to the following contributors for helping make **${repo}** better:

            ${[...new Set(recentBranches.map( x => `- @${x.user.login}` ))].join('\n')}
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
    function updateBody(thisRelease, body){
        return body.replace(new RegExp(oldVersion, 'g'), nextVersion)
    }

    if( !thisRelease ) {
        await octokit.rest.pulls.create({
            owner
            ,repo
            ,head: source
            ,base: target
            ,title: defaultTitle
            ,body: defaultBody
        });
    } else {
        await octokit.rest.pulls.update({
            owner
            ,repo
            ,pull_number: thisRelease.number
            ,title: updateTitle(thisRelease, nextVersion)
            ,body: updateBody(thisRelease, defaultBody())
        });
    }
}
async function parse(){ console.log('parse') }

/**
 * - NoRelease
 * - PendingRelease
 * - Releasing
 * - FailedRelease
 */
// function state(){
    
// }

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

  {magenta plan}

    {blue -d --dir}            (Optional) Write out plan to directory instead of stdout.

  {magenta apply}
                        Apply changes to the repository including:

                        • Updating the changelog
                        • Merging the release PR
                        • Generating a github release

    {blue --dry-run}

                        (optional) Describe what actions will happen without actually performing them.

  {magenta show}

    {magenta version}

    {magenta commit}

    {magenta contributors}

    {magenta changelog}

        {magenta breaking}

        {magenta enhancements}

        {magenta fixes}

  {magenta pr}

                    Updates or creates the release PR.
                    Should run on every relevant merge event.

    {blue --dry-run}

                    (optional) Describe what actions will happen without actually performing them.

  {magenta parse}

                    Gathers information about the repository that other commands would
                    use.  Helpful for debugging {green pr-release}'s view of the world.
`

let [subcommand] = argv._

let subcommands = {
    plan, apply, show, pr, parse
}

let preflights = {
    plan, apply, pr, parse
}


async function main(){

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

main()
