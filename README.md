# pr-release

> 🚨 This repo does nothing right now, I'm just experimenting.  Do not use this.

## Quick Start

```bash
# Generate a PR representing a release
npx pr-release pr --source next --target main
```

## What is it?

`pr-release` lets you manage your releases for applications and libraries with a simple branching workflow

```
feature-branch -> staging-branch -> production-branch
```

Typically the staging branch is called `next`, and the production-branch is called `main`.

`pr-release` will generate a release PR template any time a feature branch is merged into `next`.

You can edit that template to customize the generated changelog and release.  

Upon merging, `pr-release` will create a github release, changelog and prepare for an npm package publication.

## How do I customize it?

Mostly by using native github features like labels, the PR description and title and not much else.

The following labels will change how `pr-release` generates a release:

- `major`   Signals a feature branch causes breaking changes
- `minor`   Signals a feature branch causes minor changes
- `patch`   Signals a feature branch is a safe patch upgrade

The PR description will also have generated markdown sections.  `pr-release` will use these sections to generate the changelog and other metadata.

## FAQ

### How do I update package.json to include the version

When running `pr-release merge` pass along `--commit`.  If you have a `package.json` `pr-release` will automatically update the version in that file to match the release version.

Note `--commit` will also commit all other changes in the working directory via the Github API.  This allows you to run custom build steps to e.g. build documentation and have them included on the target branch but not the source branch.

And this works with protected branches enabled.

### How do I publish to npm

After running `pr-release merge --commit` run `npm publish`.  `npm` will use the `version` in package.json.

### What environment variables do I need to make this work?

Ironically, `pr-release` uses as much config available in the environment as possible to provide the best possible zero config experience for CI.

You should be able to run `npx pr-release all` and `pr-release` will infer intent from context in the environment variables.

If you are running `pr-release` within Github Actions, you do not need to configure environment variables at all because we only use variables that Github provides out of the box.
But, if you are running `pr-release` locally or in some other context, you will need to provide the following:


```.env
GITHUB_TOKEN="..."
GITHUB_REPOSITORY="..."
GITHUB_SHA="..."
GITHUB_REF="..."
```

`GITHUB_TOKEN` is necessary for pr-release to do any of the work it does.  By design `pr-release` never uses `git` to make changes to the repo.  This is so `pr-release` can operate outside of the normal branch protection rules provided by github, and to give you the best possible auditing experience.

If `GITHUB_REPOSITORY` is not provided, pr-release will exit.  Even if you are running locally in a `.git` context, we will never sniff the `git remote -v`.  By making repository selection explicit, it is possible for forks to to still target the correct repository, or to have management repositories that manage releases across an entire company.

If `GITHUB_SHA` is not specified, `pr-release` will make an API call to identify the relevant sha for the given command.  If the relevant sha is not inferrable, `pr-release` will exit with a non zero code. 

### How do I do concurrent release channels?

Have a target branch for each channel e.g. `v1` and a release candidate branch like `v1-next`:

```
# Generate/update a release PR for v1 channel
npx pr-release pr --source v1-next --target v1

# Generate/update a release PR for v2 channel
npx pr-release pr --source v2-next --target v2
```

### How do I opt out of `pr-release` for some changes.

Just add the label `prr:skip` to the generated release PR and pr-release will no longer update that PR.

For repeated/systemic opt-out consider using conditionals in your github workflow.

## API

### `pr`

Generates or updates a release pull request representing the pending release.

Any branches merged targeting the `--source` branch will be included in the release notes and changelog.

All labels on all incoming branches will be aggregated in the release pr labels.  E.g. if you have a `bug` branch, an `ops` branch, a `security` branch etc the release PR will include all those labels.

You can edit the PR and as long as you don't mess with some hidden anchor tags in the description `pr-release` will update around your changes.

