import resolve from '@rollup/plugin-node-resolve'
import common from '@rollup/plugin-commonjs'

export default {
    input: './lib/index.js'
    ,plugins: [
        resolve(),
        common()
    ]
    ,external: ['zx', 'octokit']
    ,output: {
        file: './dist/pr-release.cjs'
        ,format: 'cjs'
    }
}