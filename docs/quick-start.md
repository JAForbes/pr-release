---
title: pr-release
description: Use Pull Requests to generate npm + github releases and changelogs
---

- No special config file
- Generates Github Action Templates out of the box
- Easy to extend but also easy to ignore

## Quick Start


1. Create a branch called `next` and set it as the default branch for the repo
2. Create a branch called `main`
3. Make both `next` and `main` protected branches
4. Run `npx pr-release actions-yml`
5. Commit changes to your project and push to `next`, then merge `next` into `main`
6. Generate a [Personal Access Token](/env/#personal-access-token) and [NPM token](/env/#npm-token)
7. Add them to your [project's environment settings](/env/#environment-settings)
8. You now have an automated release pipeline