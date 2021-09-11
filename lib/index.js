#!/usr/bin/env node

import { chalk, argv, fetch, $ } from 'zx'
import dotenv from 'dotenv'
import { Octokit } from 'octokit'

dotenv.config()

argv.verbose = argv.verbose || argv.v
$.verbose = argv.verbose

let user;

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
    
        let kit = new Octokit({ auth: process.env.GITHUB_TOKEN })
        let response = await kit.rest.users.getAuthenticated()
        
        if( response.status != 200) throw new Error('Could not verify the validity of your GITHUB_TOKEN')
        user = response.data

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
async function pr(){ console.log('pr') }
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

  {magenta plan}

    {blue -d --dir}            (Optional) Write out plan to directory

  {magenta apply}
                        Apply changes to the repository including:

                        • Updating the changelog
                        • Merging the release PR
                        • Generating a github release

  {magenta show}

    {magenta version}

    {magenta commit}

    {magenta contributors}

    {magenta changelog}

        {magenta breaking}

        {magenta enhancements}

        {magenta fixes}

  {magenta pr}

                    Updates the release PR or creates one if it does
                    not already exist.
                    Should run on every merge event for all branches.


    {blue --next <branch>}           
    
                    (default=next) Specify the branch that is considered the staging branch.

  {magenta parse}
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
            await f(argv._, argv)
        } catch (e) {
            console.error(e)
            process.exitCode = 1
        }
    }
}

main()
