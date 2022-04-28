
# Release v0.18.8

### Patch Changes

#### [Use nextVersion not inferred version for publish (@JAForbes)](https://github.com/JAForbes/pr-release/pull/318)

# Release v0.18.7

### Patch Changes

#### [Fix version number inference (@JAForbes)](https://github.com/JAForbes/pr-release/pull/314)

# Release v0.18.4

### Patch Changes

#### [Remove unnecessary (and incorrect) replace (@JAForbes)](https://github.com/JAForbes/pr-release/pull/303)


#### [Fix spread bug leading to vnull (@JAForbes)](https://github.com/JAForbes/pr-release/pull/300)

# Release v0.18.3

### Patch Changes

#### [Fix customizable --changelog output (@JAForbes)](https://github.com/JAForbes/pr-release/pull/295)

# Release v0.18.2

### Patch Changes

#### [Strip headers and todos from change descriptions (@JAForbes)](https://github.com/JAForbes/pr-release/pull/290)

Fixes #289.

# Release v0.18.1

### Patch Changes

#### [Better handling of html comments (@JAForbes)](https://github.com/JAForbes/pr-release/pull/286)

And GH Flavoured MD todos.  Fixes #286.

# Release v0.18.0

### Minor Changes

#### [Safely generate prerelease semver id and publish (@JAForbes)](https://github.com/JAForbes/pr-release/pull/283)

Handle a preid already being published.  Handle no existing version of that preid.  Handle the existing version being > than the proposed version.

# Release v0.17.20

### Patch Changes

#### [Remove scary warning message (@JAForbes)](https://github.com/JAForbes/pr-release/pull/279)

# Release v0.17.20

### Patch Changes

#### [Remove scary warning message (@JAForbes)](https://github.com/JAForbes/pr-release/pull/279)

# Release v0.17.19

### Patch Changes

#### [Reinstate early exit (@JAForbes)](https://github.com/JAForbes/pr-release/pull/272)

Fixes #271.

# Release v0.17.18

### Patch Changes

#### [Improve change descriptions (@JAForbes)](https://github.com/JAForbes/pr-release/pull/269)

Better handling of headings and lists when summarizing PR descriptions for changelog entries.

# Release v0.17.17

### Patch Changes

#### [Globally install wrangler in CI (@JAForbes)](https://github.com/JAForbes/pr-release/pull/266)

Got a strange error when publishing the docs.  `npx @cloudflare/wrangler publish` errors out with `You have not installed wrangler`.

# Release v0.17.16

### Patch Changes

#### [Let repairTarget assume admin token (@JAForbes)](https://github.com/JAForbes/pr-release/pull/263)

Fixes #262.

# Release v0.17.11

### Patch Changes

#### [Allow failures when publishing prerelease (@JAForbes)](https://github.com/JAForbes/pr-release/pull/250)

Maybe that version, or CI job already ran.
#### [Escape version replacing (@JAForbes)](https://github.com/JAForbes/pr-release/pull/251)

Fixes #248.

# Release v0.17.9

### Patch Changes

#### [Improve prerelease handling (@JAForbes)](https://github.com/JAForbes/pr-release/pull/246)

Retain prerelease name.

# Release v0.17.8

### Patch Changes

#### [Better handling of prerelease auto versioning (@JAForbes)](https://github.com/JAForbes/pr-release/pull/244)

# Release v0.17.7

### Patch Changes

#### [Fix crash when there is only one release (@JAForbes)](https://github.com/JAForbes/pr-release/pull/241)

# Release v0.17.6

### Patch Changes

#### [Handle first PR pt.2 (@JAForbes)](https://github.com/JAForbes/pr-release/pull/239)

Handle another case where a prior release is assumed to exist.

# Release v0.17.5

### Patch Changes

#### [Handle the case where there is no prior release (@JAForbes)](https://github.com/JAForbes/pr-release/pull/237)

When identifying which branches belong to a release, we construct a github search query which finds branches dated after the previous release.

# Release v0.17.4

### Patch Changes

#### [Make bin shebang more reliable (@JAForbes)](https://github.com/JAForbes/pr-release/pull/235)

# Release v0.17.3

### Patch Changes

#### [Use resolved path for actions-yml (@JAForbes)](https://github.com/JAForbes/pr-release/pull/232)

Fixes #231.

# Release v0.17.2

### Patch Changes

#### [Remove unused feature from docs (@JAForbes)](https://github.com/JAForbes/pr-release/pull/229)

The auto feature PR generation has a flaw that it would need an auth token for every contributor.  So it has been removed.

# Release v0.17.1

### Patch Changes

#### [Remove feature PR from CI and documentation (@JAForbes)](https://github.com/JAForbes/pr-release/pull/227)

Fixes #225.

# Release v0.15.0

### Minor Changes

#### [Pre-process comments in templates (@JAForbes)](https://github.com/JAForbes/pr-release/pull/205)

Fixes #194.

# Release v0.14.0

### Minor Changes

#### [Publish a pre-release on every push to next (@JAForbes)](https://github.com/JAForbes/pr-release/pull/203)


   
### Patch Changes

#### [Fix publish auth (@JAForbes)](https://github.com/JAForbes/pr-release/pull/204)


#### [Fix bash vars not portable across run lines (@JAForbes)](https://github.com/JAForbes/pr-release/pull/200)

# Release v0.13.1

### Patch Changes

#### [Add some debugging to our yml (@JAForbes)](https://github.com/JAForbes/pr-release/pull/198)

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
