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

### How do I configure my Github actions to use `pr-release`?

Simply run `npx pr-release actions-yml`.  It will generate all the yml files you need to use all the features of `pr-release`.

From there you can edit the generated files to tailor specific behavior as required.

### How do I update package.json to include the version

When running `pr-release merge` pass along `--commit`.  If you have a `package.json` `pr-release` will automatically update the version in that file to match the release version.

Note `--commit` will also commit all other changes in the working directory via the Github API.  This allows you to run custom build steps to e.g. build documentation and have them included on the target branch but not the source branch.

And this works with protected branches enabled.

### How do I publish to npm

After running `pr-release merge --commit` run `npm publish`.  `npm` will use the `version` in package.json.

Note, you must have an `NPM_TOKEN` available in CI.  You can generate an NPM Token by following [these instructions](https://docs.npmjs.com/cli/v7/commands/npm-token).  You'll need to then follow [these instructions](https://docs.github.com/en/actions/reference/encrypted-secrets) to add the secret to your Github Actions workflows.

### What environment variables do I need to make this work?

If you are running `pr-release` within Github Actions, you do not need to configure environment variables except `GITHUB_TOKEN` because we use variables that Github provides out of the box.
But, if you are running `pr-release` locally or in some other context, you will need to provide the following:


```.env
GITHUB_TOKEN="..."
GITHUB_REPOSITORY="..."
GITHUB_SHA="..."
GITHUB_REF="..."
```

`GITHUB_TOKEN` is necessary for pr-release to do any of the work it does.  By design `pr-release` never uses `git` to make changes to the repo.  This is so `pr-release` can operate outside of the normal branch protection rules provided by github, and to give you the best possible auditing experience.  We do not use the default token provided by github actions because it will be restricted to branch protection rules.  You will need to generate a token of an admin account on your repository so that pr-release can generate release artifacts on the main protected branch.

If `GITHUB_REPOSITORY` is not provided, pr-release will exit.  Even if you are running locally in a `.git` context, we will never sniff the `git remote -v`.  By making repository selection explicit, it is possible for forks to to still target the correct repository, or to have management repositories that manage releases across an entire company.

If `GITHUB_SHA` is not specified, `pr-release` will make an API call to identify the relevant sha for the given command.  If the relevant sha is not inferrable, `pr-release` will exit with a non zero code. 

`GITHUB_REF` is used to identify if there is already a pull request for the current branch.  This is especially useful for automatically generating feature branches on push.

### How do I do concurrent release channels?

Have a target branch for each channel e.g. `v1` and a release candidate branch like `v1-next`:

```
# Generate/update a release PR for v1 channel
npx pr-release pr --source v1-next --target v1

# Generate/update a release PR for v2 channel
npx pr-release pr --source v2-next --target v2
```

## API

```
pr-release 

pr-release subcommand --options

subcommands:

  global flags

    --source <branch>

                        (default=next) Specify the branch that is considered the staging branch.

    --target <branch>

                        (default=main) Specify the branch that is considered the production branch.

  pr

                        Updates or creates the release PR.  Should run on every relevant merge event.

  merge

                        Commits updated changelog and creates new npm/github/etc release.
                        Should run on every relevant merge event.

  feature-pr

                        Generate a feature-pr for the current branch that targets
                        the source branch if the push event is not for the target
                        or source branch.

  Advanced Commands
  -----------------

  repair-target

                        Generate a new target branch from the source sha.  Helpful
                        if your target branch has a different history to the source
                        branch (e.g. an accidental squash into target).

    --force

                        Will only repair the target branch with a --force flag.  Otherwise
                        will simply error that the branches have diverged or exit with
                        code zero if everything is fine.

    --clean

                        By default will archive the old target branch.  Use --clean
                        to remove the old target branch.
```
