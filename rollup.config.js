import resolve from '@rollup/plugin-node-resolve'
import common from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

export default {
    input: './lib/index.js'
    ,plugins: [
        json(),
        resolve(),
        common(),
    ]
    ,external: ['zx', 'octokit']
    ,output: {
        file: './dist/pr-release.cjs'
        ,format: 'cjs'
    }
}