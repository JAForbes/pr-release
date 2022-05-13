---
title: FAQ
description: Frequently Asked Questions
---

## FAQ

### How does auto-versioning work?

**pr-release** generates a PR that represents a release candidate.  This PR has a heading that includes an auto generated release version.

That version is a `semver.inc(currentRelease.version, 'patch')` by default for every branch that was merged into `next` since the last release.

The semver increment level defaults to `patch` but can be set to `major`, `minor`, `patch` or `prerelease` by putting a corresponding label on the feature branch PR.

**pr-release** is especially careful with pre-releases.  If the last release was a `prerelease` then the next release will also default to a semver `prerelease`.  This makes it hard to accidentally publish to the stable channel without being explicit.

**pr-release** infers the current version by checking multiple sources (package.json, release PR header, git tag, prior release) and always takes the highest found version as the authoritative one.  So if you want to override the generated version, just manually update the release PR title to be a normal non-semver prerelease and merge.  From then on, versions will not be prerelease incremented.

### The auto generated versions looks weird...

By default pr-release tries to capture the full scope/risk of a release by including every patch/minor/major increment.  This is especially useful for versioning applications and gauging the scope/risk of a release at a glance.

For libraries you may want to use the `--minimize-semver-changes` option which makes the minimum necessary change to the semver to still satisfy semver range comparisons.

For example, if the previous version was `2.0.4` and the release candidate has 6 patches, 3 minors and 0 majors.  The next version would be calculated as `2.1.0` as there was at least 1 minor.  1 minor constitutes a minor version update and no other version information is required, that is why the patch section is zeroed out.  Additionally a minor jump from `2.1.0` or `2.6.0` is still a minor update, so it is not necessary to include the amount of minor jumps.

With the default settings the version would be calculated as `2.6.7` as it is a simple addition of semver increment levels to the base version.

### How do I configure my Github actions to use `pr-release`?

Run `npx pr-release actions-yml`.  It will generate all the yml files you need to use all the features of `pr-release`.

From there you can edit the generated files to tailor specific behavior as required.

### How do I update package.json to include the version

When running `npx pr-release merge` pass along `--commit`.  If you have a `package.json` `pr-release` will automatically update the version in that file to match the release version.

Note `--commit` will also commit all other changes in the working directory via the Github API.  This allows you to run custom build steps to e.g. build documentation and have them included on the target branch but not the source branch.

And this works with protected branches enabled.

### How do I publish to npm

After running `npx pr-release merge --commit` run `npm publish`.  `npm` will use the `version` in package.json that `pr-release` updated.

Note, you must have an `NPM_TOKEN` available in CI.  You can generate an NPM Token by following [these instructions](https://docs.npmjs.com/cli/v7/commands/npm-token).  You'll need to then follow [these instructions](https://docs.github.com/en/actions/reference/encrypted-secrets) to add the secret to your Github Actions workflows.

### What environment variables do I need to make this work?

If you are running `pr-release` within Github Actions, you do not need to configure environment variables except `GH_TOKEN` (and optionally `NPM_TOKEN`) because we use variables that Github provides out of the box.

But, if you are running `pr-release` locally or in some other context, you will need to provide the following:


```.env
GH_TOKEN="..."
GITHUB_REPOSITORY="..."
GITHUB_SHA="..."
GITHUB_REF="..."
```

`GH_TOKEN` is necessary for pr-release to do any of the work it does.  By design `pr-release` never uses `git` to make changes to the repo.  This is so `pr-release` can operate outside of the normal branch protection rules provided by github, and to give you the best possible auditing experience.  We do not use the default token provided by github actions because it will be restricted to branch protection rules.  You will need to generate a token of an admin account on your repository so that pr-release can generate release artifacts on the main protected branch.

If `GITHUB_REPOSITORY` is not provided, pr-release will exit.  Even if you are running locally in a `.git` context, we will never sniff the output of `git remote -v`.  By making repository selection explicit, it is possible for forks to to still target the correct repository, or to have management repositories that manage releases across an entire company.

If `GITHUB_SHA` is not specified, `pr-release` will make an API call to identify the relevant sha for the given command.  If the relevant sha is not inferrable, `pr-release` will exit with a non zero code. 

`GITHUB_REF` is used to identify if there is already a pull request for the current branch.  This is especially useful for automatically generating feature branches on push.

### Why GH_TOKEN instead of GITHUB_TOKEN?

pr-release automatically ensures that post a merge of a release branch that `main` is an exact copy of `next`.

In git parlance, pr-release guarantees that `main` has the same ref and history as main by ensuring the merge of `next` into `main` is a fast forward.

This way, if changes are applied to the `next` branch, such as versioning, or generating changelogs, they always appear on the branch that represents "production".

This requires the ability for pr-release to circumvent normal push rules, so an admin environment variable is required.

The default `GITHUB_TOKEN` passed in to CI will not have the ability to circumvent push rules, instead an admin personal access token is used.  We use the name `GH_TOKEN` because user defined github secrets cannot be prefixed with `GITHUB_`.

If you are using pr-release outside of github actions then `GITHUB_TOKEN` is the correct environment variable to use.  `GH_TOKEN` is just used in the `.github/workflows/*.yml` config files.  The actual pr-release source code uses `GITHUB_TOKEN` behind the scenes.


### How do I do concurrent release channels?

Have a target branch for each channel e.g. `v1` and a release candidate branch like `v1-next`:

```
# Generate/update a release PR for v1 channel
npx pr-release pr --source v1-next --target v1

# Generate/update a release PR for v2 channel
npx pr-release pr --source v2-next --target v2
```