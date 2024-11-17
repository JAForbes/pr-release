// deno-lint-ignore-file no-explicit-any no-cond-assign no-regex-spaces
import * as semver from '@std/semver'
import * as L from 'npm:linkedom'

const markers = {
	changeSummary: {
		start: `<a name="changeSummary-start"></a>`,
		end: `<a name="changeSummary-end"></a>`,
	},
	changelog: {
		start: `<a name="changelog-start"></a>`,
		end: `<a name="changelog-end"></a>`,
	},
	contributors: {
		start: `<a name="contributors-start"></a>`,
		end: `<a name="contributors-end"></a>`,
	},
	helpDocs: {
		start: `<a name="help-start"></a>`,
		end: `<a name="help-end"></a>`,
	},
}

export type Action =
	| { tag: 'get-argv'}
	| { tag: 'get-repository-name'}
	| { tag: 'get-package-json'; value: { owner: string; repo: string } }
	| {
		tag: 'get-latest-git-tag-version'
		value: { owner: string; repo: string }
	}
	| { tag: 'get-last-release'; value: { owner: string; repo: string } }
	| { tag: 'get-this-release'; value: { owner: string; repo: string } }
	| {
		tag: 'get-commit'
		value: { owner: string; repo: string; commit_sha: string }
	}
	| {
		tag: 'log'
		value: { args: any[]; level: 'verbose' | 'info' | 'error' }
	}
	| { tag: 'set-verbose'; value: boolean }
	| { tag: 'run-coroutine'; value: () => Generator }
	| { tag: 'get-branch-info'; value: { owner: string; repo: string } }
	| { tag: 'list-tags'; value: { owner: string; repo: string } }
	| { tag: 'all'; value: Generator<Action, any>[] }
	| {
		tag: 'compare-commits'
		value: {
			owner: string
			repo: string
			base: string
			head: string
		}
	}
	| {
		tag: 'get-recent-pulls-from-last-commit-date'
		value: { owner: string; repo: string; mostRecentTagDate: Date }
	}
	| {
		tag: 'get-recent-pulls-from-last-release'
		value: { owner: string; repo: string; lastRelease: PullInfo }
	}
	| {
		tag: 'create-pull-request'
		value: {
			owner: string
			repo: string
			head: string
			base: string
			title: string
			body: string
			labels: string[]
		}
	}
	| {
		tag: 'update-pull-request'
		value: {
			owner: string
			repo: string
			pull_number: number,
			title: string,
			body: string,
		}
	}

type ArgV = {
	_: string[]
	source: string
	target: string
	verbose: boolean
	compact: boolean
	minimizeSemverChange: boolean
	thanks: boolean
	contributors: boolean
}

type Package = { version: string }
type Label = { name: string }
export type BranchInfo = { labels: Label[] }
type PullInfo = {
	title: string
	body?: string
	user: { login: string }
	number: number
	labels: Label[]
}
export type DiffInfo = {
	data: {
		status: 'ahead' | 'behind' | 'diverged' | 'identical'
		files: DiffFileInfo[]
	}
}
type TagsResponse = {
	data: TagInfo[]
}
type TagInfo = {
	name: string
	commit: {
		sha: string
	}
}
type CommitInfo = {
	data: {
		committer: {
			date: Date
		}
	}
}
type DiffFileInfo = {}
type SemverSeverity = 'prerelease' | 'patch' | 'minor' | 'major'

// 🙈🙉🙊 https://stackoverflow.com/a/9310752
function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

function* getArgv(): Generator<Action, ArgV> {
	const out: ArgV = yield { tag: 'get-argv' }
	return out
}

function* getCommit(
	options: { owner: string; repo: string; commit_sha: string },
): Generator<Action, CommitInfo> {
	return yield { tag: 'get-commit', value: options }
}

function* getPackageJSONVersion(
	options: { owner: string; repo: string },
): Generator<Action, string> {
	const pkg: Package = yield { tag: 'get-package-json', value: options }

	return pkg.version
}

function* getLatestGitTagVersion(
	options: { owner: string; repo: string },
): Generator<Action, string | null> {
	const version: string | null = yield {
		tag: 'get-latest-git-tag-version',
		value: options,
	}
	return version
}

function* info(...args: any[]): Generator<Action, void> {
	yield { tag: 'log', value: { args, level: 'info' } }
}

function* verbose(...args: any[]): Generator<Action, void> {
	yield { tag: 'log', value: { args, level: 'verbose' } }
}

function* error(...args: any[]): Generator<Action, void> {
	yield { tag: 'log', value: { args, level: 'error' } }
}

function* getLastReleasePR(
	options: { owner: string; repo: string },
): Generator<Action, PullInfo | null> {
	const lastRelease: PullInfo | null = yield {
		tag: 'get-last-release',
		value: options,
	}
	return lastRelease
}

function* getThisReleasePR(
	options: { owner: string; repo: string },
): Generator<Action, PullInfo | null> {
	const thisRelease: PullInfo | null = yield {
		tag: 'get-this-release',
		value: options,
	}
	return thisRelease
}

function* listTags(
	options: { owner: string; repo: string },
): Generator<Action, TagsResponse> {
	const res: TagsResponse = yield { tag: 'list-tags', value: options }
	return res
}

function* getRecentPullRequestsFromLastCommitDate(
	options: { owner: string; repo: string; mostRecentTagDate: Date },
): Generator<Action, PullInfo[]> {
	const res: PullInfo[] = yield {
		tag: 'get-recent-pulls-from-last-commit-date',
		value: options,
	}
	return res
}

function* getRecentPullRequestsFromLastRelease(
	options: { owner: string; repo: string; lastRelease: PullInfo },
): Generator<Action, PullInfo[]> {
	const res: PullInfo[] = yield {
		tag: 'get-recent-pulls-from-last-release',
		value: options,
	}
	return res
}

function* updatePull(options: {
	owner: string
	repo: string
	pull_number: number,
	title: string,
	body: string,
}): Generator<Action, { data: PullInfo }> {
	const res: { data: PullInfo } = yield {
		tag: 'update-pull-request',
		value: options,
	}
	return res
}
			

function* createPull(options: {
	owner: string
	repo: string
	head: string
	base: string
	title: string
	body: string
	labels: string[]
}): Generator<Action, { data: PullInfo }> {
	const res: { data: PullInfo } = yield {
		tag: 'create-pull-request',
		value: options,
	}
	return res
}

function prSeverity(x: PullInfo): SemverSeverity {
	const prerelease = x.labels.find((x) => x.name == 'prerelease')
	const patch = x.labels.find((x) => x.name == 'patch')
	const minor = x.labels.find((x) => x.name == 'minor')
	const major = x.labels.find((x) => x.name == 'major')

	const severity = [major, minor, patch, prerelease]
		.filter(Boolean)
		.map((x) => x!.name)[0] ||
		'patch'

	return severity as SemverSeverity
}

function getNextVersion(
	recentBranches: PullInfo[],
	versionParsed: semver.SemVer,
	minimizeSemverChange: boolean,
): semver.SemVer {
	const severityIdx = Object.groupBy(recentBranches, (x) => prSeverity(x))

	const noPrereleaseBaseVersion: string = semver.format({
		...versionParsed,
		prerelease: [],
	})

	// cleans the input
	let nextVersionParsed = semver.parse(noPrereleaseBaseVersion)

	let levelOrder: SemverSeverity[] = [
		'major',
		'minor',
		'patch',
		'prerelease',
	]
	if (minimizeSemverChange) {
		levelOrder = ['patch', 'minor', 'major', 'prerelease']
	}
	outer: for (const level of levelOrder) {
		const n = severityIdx[level] ? severityIdx[level].length : 0
		for (let i = 0; i < n; i++) {
			nextVersionParsed = semver.increment(nextVersionParsed, level)

			if (minimizeSemverChange) {
				continue outer
			}
		}
	}
	const prerelease = versionParsed.prerelease
	const noVersionChange =
		semver.compare(nextVersionParsed, versionParsed) == 0
	if (prerelease) {
		nextVersionParsed = semver.increment(
			{ ...nextVersionParsed, prerelease: versionParsed.prerelease },
			'prerelease',
			{},
		)
	} else if (noVersionChange) {
		nextVersionParsed = semver.increment(nextVersionParsed, 'patch')
	}

	return nextVersionParsed
}

function* getRepositoryName(): Generator<Action, string> {
	const name: string = yield { tag: 'get-repository-name'}
	return name
}

function* getBranchInfo(
	options: { branch: string; owner: string; repo: string },
): Generator<Action, BranchInfo> {
	const info: BranchInfo = yield { tag: 'get-branch-info', value: options }
	return info
}

function* compareCommits(options: {
	owner: string
	repo: string
	base: string
	head: string
}): Generator<Action, DiffInfo> {
	return yield { tag: 'compare-commits', value: options }
}

function* inferVersion(
	options: { owner: string; repo: string },
): Generator<Action, { version: semver.SemVer; versionType: string }> {
	const versionTypes = {
		git: yield* getLatestGitTagVersion(options),
		npm: yield* getPackageJSONVersion(options),
		default: '0.0.0',
	}

	let version: semver.SemVer | null = null
	let versionType: string | null = null
	for (const [k, v] of Object.entries(versionTypes)) {
		const parsedSemver = v && semver.canParse(v) ? semver.parse(v) : null
		if (!parsedSemver) continue
		if (version) {
			const cmp = semver.compare(version, parsedSemver)
			if (cmp == -1) {
				version = parsedSemver
				versionType = k
			}
		} else if (parsedSemver) {
			version = parsedSemver
			versionType = k
		}
	}

	yield* verbose(`Using version type:`, versionType)
	yield* verbose(`Previous version set to`, version)

	return { version: version!, versionType: versionType! }
}

function stripHTML(x: string): string {
	return (L.parseHTML(`<body><markdown>${x}</markdown></body>`) as any)
		.document
		.querySelector('markdown').textContent
}

function changeDescription(
	x: PullInfo,
	options: { owner: string; repo: string },
) {
	const sentences: string[] = []
	let length = 0
	let stack = stripHTML(x.body || '')
		// strip html comments @see https://github.com/johno/strip-html-comments/blob/master/index.js#L8
		.split(/\n|\r\n/g)
		.flatMap((x) => x.split(/\.\s/g))
		.map((x) => x.trim())
		.map((x) => {
			// strip headers and todos
			if (
				x.startsWith('#') ||
				x.toLowerCase().startsWith('- [ ]') ||
				x.toLowerCase().startsWith('- []') ||
				x.toLowerCase().startsWith('- [x]')
			) {
				return ''
			}
			return x
		})
		.map((x) => x.replace(/^(\+|\*|\-) /, ''))
		.filter(Boolean)
		.map((x) => x.endsWith('.') || x.endsWith(':') ? x : x + '.')

	const headingIndex = stack.findIndex((x) => x.startsWith('#'))

	stack = headingIndex > 0 ? stack.slice(0, headingIndex) : stack

	let next: string | undefined
	while (next = stack.shift()) {
		length += next.length
		if (length > 160) break
		sentences.push(next)
	}

	return `
        #### [${x.title} (@${x.user.login})](https://github.com/${options.owner}/${options.repo}/pull/${x.number})

        ${sentences.join('  ').replace(/:\s+/g, ': ')}
    `
		.split('\n')
		.slice(1, -1)
		// deno-lint-ignore no-regex-spaces
		.map((x) => x.replace(/^        /, ''))
		.join('\n')
}

export function* pr() {
	const [owner, repo] = yield* getRepositoryName()
	const options = yield* getArgv()

	const { target, source, compact, minimizeSemverChange, thanks } = options

	let targetBranch: BranchInfo, sourceBranch: BranchInfo
	{
		const xs = [
			getBranchInfo({ owner, repo, branch: target }),
			getBranchInfo({ owner, repo, branch: source }),
		]
		const [t, s] = yield* all<BranchInfo>(xs)
		targetBranch = t
		sourceBranch = s

		if (!targetBranch && !sourceBranch) {
			throw new Error(
				`Could not find target(${target}) and source(${source}) branch.`,
			)
		} else if (!targetBranch) {
			throw new Error(`Could not find target(${target}) branch.`)
		} else if (!sourceBranch) {
			throw new Error(`Could not find source(${source}) branch.`)
		}

		yield* verbose('Target Exists', targetBranch)
		yield* verbose('Source Exists', sourceBranch)
	}

	checkDiff: {
		const diff = yield* caught(
			error,
			compareCommits({
				owner,
				repo,
				base: target,
				head: source,
			}),
		)

		if (!diff) {
			throw new Error(
				`Could not obtain diff information for target(${target} and source(${source})`,
			)
		}

		yield * verbose('diff', diff)
		if (diff.data.status == 'behind' || diff.data.status == 'diverged') {
			break checkDiff
		} else if (
			diff.data.status == 'identical' || diff.data.files.length == 0
		) {
			yield* info('No diff found, exiting with code zero.')
			return
		} else if (diff.data.status == 'ahead') {
			// throw new Error(`Inverted diff! Branches target(${target}) is ahead of source(${source})`)
			break checkDiff
		} else {
			yield* error(diff.data)
			throw new Error(`Unexpected branch state`)
		}
	}

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
	const lastRelease = yield* getLastReleasePR({ owner, repo })
	const tags = yield* listTags({ owner, repo })

	const mostRecentTag = tags.data
		.flatMap((x) => {
			try {
				let parsed = semver.parse(x.name)
				return { ...x, parsedSemver: parsed }
			} catch (_) {
				return []
			}
		})
		.sort((a, b) => semver.compare(a.parsedSemver, b.parsedSemver) * -1)[0]

	const mostRecentTagSha = mostRecentTag?.commit.sha
	const mostRecentTagCommitInfo = !mostRecentTagSha
		? null
		: yield* getCommit({
			owner,
			repo,
			commit_sha: mostRecentTagSha,
		})
	const mostRecentTagDate = mostRecentTagCommitInfo?.data.committer.date
	let thisRelease = yield* getThisReleasePR({ owner, repo })

	const recentBranches = !lastRelease && mostRecentTagDate
		? yield* getRecentPullRequestsFromLastCommitDate({
			owner,
			repo,
			mostRecentTagDate,
		})
		: lastRelease
		? yield* getRecentPullRequestsFromLastRelease({
			owner,
			repo,
			lastRelease,
		})
		: []

	yield* verbose('recentBranches', recentBranches)

	const { version } = yield* inferVersion({ owner, repo })

	function changeDescriptions(level: string, xs: PullInfo[]) {
		xs = xs || []
		return xs.length > 0
			? xs.map((x) => changeDescription(x, { owner, repo })).join('\n')
			: compact
			? ''
			: `No ${level} changes in this release.`
	}

	function changeSummary() {
		const s = recentBranches
			.map((x) => `- #${x.number}`)
			.join('\n')

		return `
            ${markers.changeSummary.start}

            ${s}

            ${markers.changeSummary.end}
        `
			.split('\n')
			.slice(1, -1)
			.map((x) => x.replace(/^            /, ''))
			.join('\n')
	}

	function changeLog() {
		const items: string[] = []
		for (const level of ['major', 'minor', 'patch'] as const) {
			const xs = severityIdx[level]
			const s = changeDescriptions(level, xs ?? [])

			if (compact && !s) continue

			items.push(
				`
                ### ${title(level)} Changes

                ${s}
                `
					.slice(1, -1)
					.replace(/^                /gm, ''),
			)
		}

		if (items.length) {
			return `
                ${markers.changelog.start}
                ${items.join('\n')}
                ${markers.changelog.end}
            `
				.slice(1, -1)
				.replace(/^                /gm, '')
		}

		return ''
	}

	const severityIdx = Object.groupBy(recentBranches, (x) => prSeverity(x))

	const title = (s: string) => s[0].toUpperCase() + s.slice(1)

	const nextVersion = getNextVersion(
		recentBranches,
		version,
		minimizeSemverChange,
	)

	const defaultTitle = `Release - v${nextVersion}`

	const thankYouMessage = () => [
		`Thank you to the following contributors for helping make **${repo}** better.`,
		`Many thanks to all the wonderful contributors who helped make this release possible.`,
		`Thanks goes to the contributors for their time, effort and hard work.`,
	]

	function contributors() {
		return `
            ${markers.contributors.start}

            ${thanks ? thankYouMessage() : ''}

            ${
			[...new Set(recentBranches.map((x) => `- @${x.user.login}`))].join(
				'\n',
			)
		}

            ${markers.contributors.end}
        `
			.slice(1, -1)
			.replace(/^            /gm, '')
	}

	function defaultBody() {
		const section_header = `
            # Release v${nextVersion}

            ${changeSummary()}
        `

		const section_changelog = `
            ## Changelog

            ${changeLog()}
        `

		const section_contributors = options.contributors ? '' : `
            ## Contributors

            ${contributors()}
        `

		const defaultBody = (section_header +
			section_changelog +
			section_contributors)
			.split('\n')
			.map((x) => x.replace(/^            /, ''))
			.join('\n')

		return defaultBody
	}

	const oldVersion = thisRelease
		? thisRelease.title.split(/v|\s/).find((x) => semver.canParse(x))
		: null

	function updateTitle(version: semver.SemVer) {
		return thisRelease!.title.replace(
			new RegExp(escapeRegExp(oldVersion!), 'g'),
			semver.format(version),
		)
	}

	function updateBody() {
		let lines = thisRelease!.body!.split(/\r\n|\n/)
		const outputs: string[] = []

		while (lines.length) {
			const line = lines.shift()!

			if (line.includes(markers.changeSummary.start)) {
				outputs.push(changeSummary())
				const i = lines.indexOf(markers.changeSummary.end)
				if (i < 0) {
					throw new Error('Malformed.  Unable to update PR body.')
				}
				lines = lines.slice(i + 1)
			} else if (line.includes(markers.changelog.start)) {
				outputs.push(changeLog())
				const i = lines.indexOf(markers.changelog.end)
				if (i < 0) {
					throw new Error('Malformed.  Unable to update PR body.')
				}
				lines = lines.slice(i + 1)
			} else if (line.includes(markers.contributors.start)) {
				outputs.push(contributors())
				const i = lines.indexOf(markers.contributors.end)
				if (i < 0) {
					throw new Error('Malformed.  Unable to update PR body.')
				}
				lines = lines.slice(i + 1)
			} else {
				outputs.push(line)
			}
		}

		const output = outputs.join('\n')

		return output.replace(
			new RegExp(escapeRegExp(oldVersion!), 'g'),
			semver.format(nextVersion),
		)
	}

	let labels: string[]
	{
		labels = recentBranches
			.flatMap((x) => x.labels)
			.map((x) => x.name)

		labels = [...new Set(labels)]
	}
	yield* verbose('about to POST/PUT a release pr')

	if (!thisRelease) {
		yield* verbose('posting release', {
			owner,
			repo,
			head: source,
			base: target,
			title: defaultTitle,
			labels,
		})

		const x = yield* createPull({
			owner,
			repo,
			head: source,
			base: target,
			title: defaultTitle,
			body: defaultBody(),
			labels,
		})

		thisRelease = x.data
	} else {
		const pull_number = thisRelease.number
		options.verbose && console.log('patching release', {
			owner,
			repo,
			head: source,
			base: target,
			title: defaultTitle,
			pull_number,
			labels,
		})
		const title = updateTitle(nextVersion)
		const body = updateBody()

		options.verbose && console.log('about to patch', {
			owner,
			repo,
			pull_number,
		})

		yield * updatePull({
			owner,
			repo,
			pull_number,
			title,
			body,
		})
	}
}

function* caught<Caught = unknown, Data = unknown>(
	errorCallback: (err: unknown) => Generator<Action, Caught>,
	effect: Generator<Action, Data>,
): Generator<Action, Caught | Data> {
	try {
		return yield* effect
	} catch (e) {
		return yield* errorCallback(e)
	}
}

function* all<T>(effects: Generator<Action, any>[]): Generator<Action, T[]> {
	const x: T[] = yield { tag: 'all', value: effects }
	return x
}

export function* main(): Generator<Action, void> {
	const { source, target } = yield* getArgv()

	yield* info('hey', 'cool')
}
