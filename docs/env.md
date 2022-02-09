---
title: Environment Variables
description: How to set up your environment.
---

In order for **pr-release** to perform some operations you'll need to configure some environment variables on your github project.

You'll need to create the following two github secrets to use pr-release:

- `GH_TOKEN` a personal access token to manage branches, releases etc
- `NPM_TOKEN` an npm auth token to publish releases, optional

pr-release automatically ensures that post a merge of a release branch that `main` is an exact copy of `next`.

This way, if changes are applied to the `next` branch, such as versioning, or generating changelogs, they always appear on the branch that
represents "production".

This requires the ability for pr-release to circumvent normal push rules, so an admin environment variable is required.

## npm Token

How to set up an npm access token for publishing releases and pre-releases.

https://docs.npmjs.com/creating-and-viewing-access-tokens

## Personal Access Token

How to set up a Github Personal access token to allow **pr-release** to generate pull requests, github releases and manage branches.

https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

## Environment Settings

How to link your Github and NPM token to your projects CI pipeline

https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository