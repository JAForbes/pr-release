# pr-release

> 🚨 This repo does nothing right now, I'm just experimenting.  Do not use this.

## Quick Start

```bash
# Generate artifacts based on format of PR
# and output suggested as files to given path
npx pr-release plan -o ./.pr-release

tree ./.pr-release

.pr-release
├── changelog
│    ├── changelog.md               # complete changelog file
│    ├── entry.md                   # latest changelog entry
│    ├── bugs.md                    # bugs section
│    ├── enhancements.md            # enhancements section           
│    ├── breaking-changes.md        # breaking changes section
│    └── migration-guide.md         # migration guide for breaking changes
│
├── contributors.md                 # markdown list of contributors
├── commit.txt                      # Suggested commit message
├── version.txt                     # Suggested semver version
└── data.json                       # Contains all information in other files as structured json
```


```bash
npx pr-release plan                 # Outputs to stdout changes that will be made
npx pr-release apply                # Creates a release

npm publish                         # Optionally publish to npm / etc
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

## Advanced customization

`pr-release` is designed to be as simple to use for the common case.  If you do not want to have `pr-release` manage everything you can
instead use it as a utility to generate release metadata and files that you can then assemble yourself.

This helps keep the common case easy and configuration free.  And the more advanced use cases still get the full power but just need
to string some commands together in CI.

E.g. instead of using `pr-release` apply to generate a commit, you can use `git commit -m "${pr-release show commit}"` and add any other changes to the commit you like there.

Same goes for the changelog.  You can let pr-release generate and manage the changelog.  Or instead, you can pluck specifiy entries via `pr-release show changelog <entry>` or by dumping all metadata to an output directory via `pr-release plan -o <dir>`.


## API

### `plan`

### `apply`

### `show version`

Outputs the version `pr-release` thinks the upcoming release should be.

### `show contributors`  

Outputs the contributor `pr-release` thinks contributed to this release

### `show commit`  

Outputs a suggested commit message based on the PR title and version