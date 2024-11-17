// deno-lint-ignore-file no-explicit-any require-await
import * as main from './main.ts'

function State({ owner='owner', repo='repo', argv={ verbose: true } }={}){

    async function handle(action: main.Action){
        switch (action.tag) {
            case 'get-repository-name': return [owner, repo]
            case 'get-argv': return argv
            case 'get-branch-info': return { labels: [] }
            case 'compare-commits': {
                return { data: { status: 'identical' } }
            }
            case 'all': {

                const promises = action.value.map( async it => {
                    let done = false
                    let next: any;
                    while (!done) {

                        const res = it.next(next)
                        done = res.done!
                        const value = res.value as main.Action

                        if(!done) {
                            next = await handle(value)
                        } else {
                            return value
                        }
                    }
                })
                return Promise.all(promises)
            }
            case 'log': {
                if (action.value.level === 'verbose') {
                    
                    if(argv.verbose) {
                        console.log(...action.value.args)
                    }
                    return
                }
                return console[action.value.level](...action.value.args)
            }
        }
    }

    return {
        handle
    }
}

Deno.test('prr', async () => {

    const state = State()

    let it = main.pr()
    let res = it.next()
    while (!res.done) {
        res = it.next(await state.handle(res.value!))
    }
})

// import test from 'tape'
// import * as prr from '../lib/index.js'

// test('getNextVersion', (t) => {
// 	const minor = { labels: [{ name: 'minor' }] }
// 	const patch = { labels: [{ name: 'patch' }] }
// 	const major = { labels: [{ name: 'major' }] }
// 	const prerelease = { labels: [{ name: 'prerelease' }] }
// 	const none = { labels: [] }
// 	const repeat = (n, x) => Array(n).fill(x)

// 	const tests = [
// 		{
// 			recentBranches: [
// 				...repeat(30, patch),
// 				...repeat(6, minor),
// 				...repeat(1, major),
// 				...repeat(1, none),
// 				...repeat(0, prerelease),
// 			],
// 			version: '1.0.0',
// 			minimized: '2.0.0',
// 			maximized: '2.6.31',
// 			id: 'single-major',
// 			comment:
// 				'For minimized a single major leads to no patch or minor inclusion',
// 		},
// 		{
// 			recentBranches: [
// 				...repeat(30, patch),
// 				...repeat(6, minor),
// 				...repeat(0, major),
// 				...repeat(1, none),
// 				...repeat(5, prerelease),
// 			],
// 			version: '1.0.0',
// 			minimized: '1.1.1-0',
// 			maximized: '1.6.32-4',
// 			id: 'prerelease-info-retained',
// 			comment:
// 				'Even in minimized, prerelease information retained (despite reverse semver inc order)',
// 		},
// 		{
// 			recentBranches: [
// 				...repeat(0, patch),
// 				...repeat(6, minor),
// 				...repeat(0, major),
// 				...repeat(0, none),
// 				...repeat(0, prerelease),
// 			],
// 			version: '1.0.0-4',
// 			minimized: '1.1.1-0',
// 			maximized: '1.6.1-0',
// 			id: 'existing-prerelease',
// 			comment:
// 				'If existing version is prerelease, prerelease is retained even if no PRs explicitly marked as prerelease',
// 		},
// 		{
// 			recentBranches: [
// 				...repeat(30, patch),
// 				...repeat(6, minor),
// 				...repeat(0, major),
// 				...repeat(1, none),
// 				...repeat(0, prerelease),
// 			],
// 			version: '1.0.0',
// 			minimized: '1.1.0',
// 			maximized: '1.6.31',
// 			id: 'one-minor-bump',
// 			comment:
// 				'At least one minor = +0.1.0 and no patch for minimized, but maximized shows the full change scope',
// 		},
// 		{
// 			recentBranches: [
// 				...repeat(0, patch),
// 				...repeat(0, minor),
// 				...repeat(0, major),
// 				...repeat(0, none),
// 				...repeat(0, prerelease),
// 			],
// 			version: '1.0.0',
// 			minimized: '1.0.1',
// 			maximized: '1.0.1',
// 			id: 'unique-version',
// 			comment:
// 				'prr always at least increments patch to avoid version collisions',
// 		},
// 		{
// 			recentBranches: [
// 				...repeat(1, patch),
// 				...repeat(0, minor),
// 				...repeat(0, major),
// 				...repeat(0, none),
// 				...repeat(0, prerelease),
// 			],
// 			version: '1.0.0',
// 			minimized: '1.0.1',
// 			maximized: '1.0.1',
// 			id: 'no-unneeded-bump',
// 			comment:
// 				"If version is already different, it doesn't increment unnecessarily",
// 		},
// 	]

// 	for (let data of tests) {
// 		global.activeTest = data.id
// 		const [minimized, maximized] = [true, false]
// 			.map((minimizeSemverChange) =>
// 				prr.getNextVersion({
// 					recentBranches: data.recentBranches,
// 					version: data.version,
// 					minimizeSemverChange,
// 				})
// 			)

// 		const comment = data.id + ': ' + (data.comment ? `${data.comment}: ` : '')
// 		t.equal(minimized, data.minimized, comment + 'minimized')
// 		t.equal(maximized, data.maximized, comment + 'maximized')
// 	}

// 	t.end()
// })
