import resolve from '@rollup/plugin-node-resolve'
export default {
    input: './lib/index.js'
    ,plugins: [
        resolve()
    ]
    ,external: ['zx']
    ,output: {
        file: './dist/pr-release.cjs'
        ,format: 'cjs'
    }
}