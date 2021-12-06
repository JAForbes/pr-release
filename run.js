/* globals process */
import { $, argv } from 'zx'

async function tf({}, ...args){
    // $.verbose = false
    await $`terraform -chdir=ops ${args}`
}

async function watch(){
    // Dump the latest release metadata for rending
    await $`node -r dotenv/config bin.js extract-changelog`

    // Run vite and build-docs in parallel
    // both will watch the file system and do their thing
    // if anything changes
    await Promise.all([
        $`npx nodemon -e js,css,html -w "scripts/*" scripts/build-docs.js`,
        $`npx vite`
    ])
}

const commands = { tf, watch }

{
    argv._ = process.argv.slice(2)
    const command = argv._.shift()
    const f = commands[command]
    if ( f ) f(argv, ...argv._)
}

// console.log(argv)