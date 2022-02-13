---
title: pr-release
description: Use Pull Requests to generate npm + github releases and changelogs
---

- No special config file
- Generates Github Action Templates out of the box
- Easy to extend but also easy to ignore

## Quick Start


1. Generate a [Personal Access Token](/env/#personal-access-token) and [NPM token](/env/#npm-token)
2. Add them to your [project's environment settings](/env/#environment-settings)
3. Create a branch called `next` and set it as the default branch for the repo
4. Create a branch called `main`
5. Make both `next` and `main` protected branches
6. Create a feature branch
7. On the feature branch Run `npx pr-release actions-yml`
8. Commit changes to your project and push to the feature branch 
9. Create a PR for the feature branch, then merge that PR into `next`
10. A release PR should automatically generate
11. You now have an automated release pipeline