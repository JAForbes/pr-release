import {$} from "zx"

/**
 * This is used by terraform to deploy
 *
 * It is inlinable into the terraform file.  But I've pulled it out incase
 * we want to add more checks/balances and in case we want to do
 * any notifications to gitter/etc post release.
 *
 */
async function main(){
	// $.verbose = false

	const B = process.env.TF_VAR_BUCKET
	const R = process.env.TF_VAR_AWS_REGION
	const id = process.env.TF_VAR_AWS_ACCESS_KEY_ID
	const secret = process.env.TF_VAR_AWS_SECRET_ACCESS_KEY

	const missingVars = ![B, R, id, secret].every(Boolean)
	if(missingVars.length) {
		throw new Error("Missing vars")
	}
	await $`
        AWS_ACCESS_KEY_ID=${id}\ 
        AWS_SECRET_ACCESS_KEY=${secret} \
        aws s3 sync ./pages s3://${B} \
        --region ${R} \
        --exact-timestamps
    `
}

main()
	.catch((e) => {
		console.error("Error", e)
		process.exit(1)
	})