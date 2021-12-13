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

## Where do I start?

Check out the [Quick Start](./quick-start/) Guide

## Can I help?

Contributions are welcome!  Checkout out the (very early) [contributing notes](https://github.com/JAForbes/pr-release/blob/next/lib/contributing.md) and [create an issue](https://github.com/JAForbes/pr-release/issues/new) if you have any ideas.