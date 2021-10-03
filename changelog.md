
# Release v0.7.7

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Fake release (@JAForbes)](https://github.com/JAForbes/pr-release/pull/126)

This time we'll do a squash and see if prr automatically recovers.

# Release v0.7.6

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Fake release (@JAForbes)](https://github.com/JAForbes/pr-release/pull/124)

# Release v0.7.5

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Target SHA oversight (@JAForbes)](https://github.com/JAForbes/pr-release/pull/122)

# Release v0.7.4

Thank you to the following contributors for helping make **pr-release** better:



### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

No patch changes in this release.

# Release v0.7.4

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Add some debug logs and CI flags (@JAForbes)](https://github.com/JAForbes/pr-release/pull/119)

After debugging actions/checkout all day I realised I was configuring the wrong section of yml 🤦‍♂️.

# Release v0.7.2

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Use force in CI (@JAForbes)](https://github.com/JAForbes/pr-release/pull/114)

# Release v0.6.1

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Testing release still works with protected branch (@JAForbes)](https://github.com/JAForbes/pr-release/pull/106)

# Release v0.6.0

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

#### [Recover from diverted history (@JAForbes)](https://github.com/JAForbes/pr-release/pull/102)



### Patches

No patch changes in this release.

# Release v0.5.3

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Stop Github from complaining about empty addLabels call (@JAForbes)](https://github.com/JAForbes/pr-release/pull/99)


#### [Update docs to include feature-pr (@JAForbes)](https://github.com/JAForbes/pr-release/pull/96)


#### [Make dotenv a prod dependency (@JAForbes)](https://github.com/JAForbes/pr-release/pull/95)

# Release v0.5.0

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

#### [Automatically create feature branch PR (@JAForbes)](https://github.com/JAForbes/pr-release/pull/91)

Encourage developers to open draft pull requests as early as possible by automatically creating a draft pull request on push.

### Patches

#### [Remove prefix from GITHUB_REF when generating feature PR (@JAForbes)](https://github.com/JAForbes/pr-release/pull/94)

Was causing feature PR creation to run on main/next.
#### [Make feature-pr command accessible (@JAForbes)](https://github.com/JAForbes/pr-release/pull/92)

# Release v0.4.19

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Update docs (@JAForbes)](https://github.com/JAForbes/pr-release/pull/88)

Should have removed them in the last release.

# Release v0.4.18

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [💄 Clean up (@JAForbes)](https://github.com/JAForbes/pr-release/pull/86)

Now that refresh isn't needed, I've removed some debug calls and old flags.

# Release v0.4.17

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Fix git diff exit code (@JAForbes)](https://github.com/JAForbes/pr-release/pull/84)

# Release v0.4.11

Thank you to the following contributors for helping make **pr-release** better:

- @JAForbes

### Major Changes

No major changes in this release.

### Minor Changes

No minor changes in this release.

### Patches

#### [Include untracked files in release commit (@JAForbes)](https://github.com/JAForbes/pr-release/pull/71)

Changelog et al weren't included because `git diff --name-only` doesn't include untracked files.
