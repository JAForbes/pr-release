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


## API

### `pr`

Generates or updates a release pull request representing the pending release.

Any branches merged targeting the `--source` branch will be included in the release notes and changelog.

All labels on all incoming branches will be aggregated in the release pr labels.  E.g. if you have a `bug` branch, an `ops` branch, a `security` branch etc the release PR will include all those labels.

You can edit the PR and as long as you don't mess with some hidden anchor tags in the description `pr-release` will update around your changes.

