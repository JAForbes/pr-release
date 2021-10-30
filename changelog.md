
# Release v0.12.0

### Minor Changes

#### [Customize level of contributor mentions (@JAForbes)](https://github.com/JAForbes/pr-release/pull/191)

Fixes #111 and #190.

# Release v0.11.0

### Minor Changes

#### [Automatically update CLI help in readme (@JAForbes)](https://github.com/JAForbes/pr-release/pull/187)

Ensure our docs stay in sync with the CLI help.

# Release v0.9.2

### Patch Changes

#### [Use compact option in pr yml (@JAForbes)](https://github.com/JAForbes/pr-release/pull/182)


#### [Use the new --changelog flag in merge command (@JAForbes)](https://github.com/JAForbes/pr-release/pull/180)

# Release v0.9.0

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Minor Changes

#### [Skip changelog generation when content is empty (@JAForbes)](https://github.com/JAForbes/pr-release/pull/174)

Fixes #149.
# Release v0.8.14

### Patches

#### [Increment semver when committing directly to next (@JAForbes)](https://github.com/JAForbes/pr-release/pull/168)

Previously, if you edited some markdown files and committed directly to next, the auto generated release PR would have the same semver version as main.

# Release v0.8.10

### Patches

#### [Fix description + exclude changelog from rollbacks (@JAForbes)](https://github.com/JAForbes/pr-release/pull/161)

# Release v0.8.0

### Minor Changes

#### [Rollbacks (@JAForbes)](https://github.com/JAForbes/pr-release/pull/130)

Safe, simple rollbacks.  Click a button and your main and next branch will automatically fast forward to a commit that reverts changes from a prior release.

# Release v0.5.3

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

- [Stop Github from complaining about empty addLabels call (@JAForbes)](https://github.com/JAForbes/pr-release/pull/99)
- [Update docs to include feature-pr (@JAForbes)](https://github.com/JAForbes/pr-release/pull/96)
- [Make dotenv a prod dependency (@JAForbes)](https://github.com/JAForbes/pr-release/pull/95)

# Release v0.5.0

### Minor Changes

#### [Automatically create feature branch PR (@JAForbes)](https://github.com/JAForbes/pr-release/pull/91)

Encourage developers to open draft pull requests as early as possible by automatically creating a draft pull request on push.

### Patches

#### [Remove prefix from GITHUB_REF when generating feature PR (@JAForbes)](https://github.com/JAForbes/pr-release/pull/94)

Was causing feature PR creation to run on main/next.

#### [Make feature-pr command accessible (@JAForbes)](https://github.com/JAForbes/pr-release/pull/92)

# Release v0.4.17

### Patches

#### [Fix git diff exit code (@JAForbes)](https://github.com/JAForbes/pr-release/pull/84)

# Release v0.4.11

### Patches

#### [Include untracked files in release commit (@JAForbes)](https://github.com/JAForbes/pr-release/pull/71)

Changelog et al weren't included because `git diff --name-only` doesn't include untracked files.
