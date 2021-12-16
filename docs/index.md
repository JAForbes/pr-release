---
title: pr-release
description: Use Pull Requests to generate npm + github releases and changelogs
---

## How it works?

1. 🤓 You push some code on a branch `feature-branch-1`.
2. 🚀 **pr-release** creates a pull request for your feature targeting the `next` branch.
3. 🤓 You merge the pull request into `next`
4. 🚀 **pr-release** creates a pull request targeting the `main` branch.
5. 🤓 You repeat step 1 and 3 a few times to build up a release candidate.
6. 🚀 **pr-release** repeats step 2 and 4.
7. 🤓 You merge the release PR into `main`
8. 🚀 **pr-release** 

    - 🚢 Updates or creates a changelog
    - ✅ Automatically increments the semver and applies a git tag
    - 🐙 Creates a Github release
    - 📋 Outputs all the release metadata to a file so you can use it
    - 🎉 Updates the version in your package.json
    - 😲 And more!!!

## Why

Release automation makes it easier for teams to ship more often.  Existing solutions require you to store your metadata about your release in a special file, or to use a special GUI.  pr-release uses the metadata that is already available in a github pull request.  It makes it easier to extend the workflow you are already using.

## Tell me more


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

- `major`   Signals a feature branch (causes breaking changes)
- `minor`   Signals a feature branch (causes minor changes)
- `patch`   Signals a feature branch (is a safe patch upgrade)

The PR description will also have generated markdown sections.  `pr-release` will use these sections to generate the changelog and other metadata.

## Where do I start?

Check out the [Quick Start](./quick-start/) Guide

## Can I help?

Contributions are welcome!  Checkout out the (very early) [contributing notes](https://github.com/JAForbes/pr-release/blob/next/lib/contributing.md) and [create an issue](https://github.com/JAForbes/pr-release/issues/new) if you have any ideas.