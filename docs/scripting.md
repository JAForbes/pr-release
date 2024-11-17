---
title: Scripting
description: Release scripting with pr-release
executeCodeBlocks: true
---

### Full metadata object

`npx pr-release extract-changelog` dumps a bunch of files to a directory called
`.pr-release`. There is a file for each key piece of information **pr-release**
generates or infers.

```bash
tree .pr-release
```

This documentation is generated from a markdown file. The script that builds the
documenation injects a `prr` object which is the output of
`.pr-release/metadata`.

```bash
cat .pr-release/metadata | head
```

You can use these files when scripting the build of your own release
documentation and pipelines. For example, you can inject the PR release title
into your browser bundle for analytics. Or you can prefix a bundle with the
github release tag before the tag has actually created in git or github.

You can explore it in your browser REPL too as `window.prr`.

More useful for release scripts is the individual files that contain the content
of individual properties.

E.g. `.pr-release/version` contains the current version of the project in
production.

```bash
cat .pr-release/version
```
