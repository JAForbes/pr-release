/* globals process */
import { $, argv } from 'zx'

async function watch() {
	// Dump the latest release metadata for rending
	await $`stat .pr-release || node -r dotenv/config bin.js extract-changelog --out`

	// Run vite and build-docs in parallel
	// both will watch the file system and do their thing
	// if anything changes
	await Promise.all([
		$`npx nodemon -e js,css,html,md -w "docs/*" -w "scripts/*" -- --unhandled-rejections=strict scripts/build-docs.js`,
		$`npx vite`,
	])
}

async function deploy() {
	await $`node -r dotenv/config bin.js extract-changelog --out`
	await $`node scripts/build-docs.js`
	await $`npm install @cloudflare/wrangler -g`
	await $`npx @cloudflare/wrangler publish`
}

const commands = { watch, deploy }

{
	argv._ = process.argv.slice(2)
	const command = argv._.shift()
	const f = commands[command]
	if (f) f(argv, ...argv._)
}
