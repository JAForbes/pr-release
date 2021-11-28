---
title: pr-release
description: Use Pull Requests to generate npm + github releases and changelogs
---

pr-release
==========

Use Pull Requests to generate npm + github releases and changelogs

- No special config file
- Generates Github Action Templates out of the box
- Easy to extend but also easy to ignore

## Quick Start

1. Run `npx prr-release actions-yml`
2. Commit changes to your project and push
3. Generate a [Personal Access Token](./env#personal-access-token) and [NPM token](./env#npm-token)
4. Add them to your [project's environment settings](./env#environment-settings)
5. You now have an automated release pipeline