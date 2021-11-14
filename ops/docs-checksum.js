import {$} from "zx"
import * as G from "../scripts/generate-docs.js"

/**
 * This is used by terraform to know whether or not
 * the docs need to deployed.
 *
 * We simply cat all the files in pages/ and hash the stdout.
 */
async function main(){
	await G.generate({silent: true})
	$.verbose = false

	const proc = await nothrow($`find pages/ | xargs cat | openssl sha256`)
	const [,checksum] = proc.stdout.trim().split("(stdin)= ")
	console.log(JSON.stringify({checksum}))
}

main()
	.catch((e) => {
		console.error("Error", e)
		process.exit(1)
	})