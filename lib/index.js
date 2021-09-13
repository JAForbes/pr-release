#!/usr/bin/env node
/* globals console, process */

import { chalk, argv, $ } from 'zx'
import dotenv from 'dotenv'
import { Octokit } from 'octokit'

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
async function version(){ console.log('version') }
async function commit(){ console.log('commit') }
async function contributors(){ console.log('contributors') }

async function changelog(){ console.log('changelog') }
async function breaking(){ console.log('breaking') }
async function enhancements(){ console.log('enhancements') }
async function fixes(){ console.log('fixes') }
async function show(){ console.log('show') }
async function pr(x){ 
    if(x.dry) console.log('Performing dry run')
    
    // check if a branch exists for candidate
        // error if not

    // check if a branch exists for production
        // error if not

    let [owner,repo] = process.env.GITHUB_REPOSITORY.split('/')

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
        

    {

        let diff = await octokit.rest.repos.compareCommits({
            owner
            ,repo
            ,base: source
            ,head: target
        })
        .catch(error)

        if( !diff ) {
            throw new Error(`Could not obtain diff information for target(${target} and source(${source})`)
        }

        verbose('diff',diff)
        if( diff.data.status == 'identical' ) {
            info('No diff found, exiting with code zero.')
            process.exitCode = 0
            return;
        }
        
    }

    // check if a pr exists for next -> main
        // goto :create if not
        // goto :update if so
    
    // :create if not
        // infer starting version from package.json in main
        // infer new version from metadata on branches
        // update title to suffix by the version number
        // default title prefix to Release
        // create description
        // Summary of severity of release
        // Summary of changes
        // Start changelog
        // End changelog
        // POST PR
    // :update if so
        // infer starting version from package.json in main
        // infer new version from metadata on branches
        // extract version from title and replace, leave prefix as is
        // identify description sections
        // update severity summary 
        // update changelog
        // PUT PR
}
async function parse(){ console.log('parse') }

/**
 * - NoRelease
 * - PendingRelease
 * - Releasing
 * - FailedRelease
 */
function state(){
    
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
