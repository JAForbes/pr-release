/* globals console, process */
import { $, argv } from 'zx'

async function tf({}, ...args){
    // $.verbose = false
    await $`terraform -chdir=ops ${args}`
}

async function watch(){
    await Promise.all([
        $`npx nodemon scripts/build-docs.js`,
        // $`npx serve webdist`
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