# Contributing

## Core

### To run the CLI locally for development

1. Create a .env file and add the required env variables
2. `node -r dotenv/config bin.js` to run the CLI
3. There is a provided `launch.json` which is compatible with VS Code's debugger
4. Use `--verbose` for verbose logging.

### Guidelines

> This is some very early high level thoughts, not rules. But straying from this
> should come with good reason.

#### Gather information, then perform effects

In any commands that perform changes to a repositories state, try to gather all
information required at the start of the command and only execute side effects
at the end. Unfortuntely we can't atomically update Github's state, so to
de-risk we should provide as much up front warning and checks as possible even
at the cost of runtime performance. With releases, the stakes are too high not
to take every precaution.

#### Use git as a lookup database only, never switch branches, or perform git based effects

**pr-release** deliberately does not script against `git`, it scripts against
the github API. **pr-release** is designed to work with abstractions that sit
above git. Sometimes it may be tempting to use `git checkout` or `git commit`,
but that can lead to flaky scripts and a poor development experience. If you
want to debug **pr-release** locally and you have unstaged changes, or if
**pr-release** tries to switch branches on you, things will break. You may also
pause a script or abort it half way through execution and if you are using
stateful git commands it can turn into a bit of a mess because the next time you
run the script it will be running from a different git state as before.

Yes, github API calls are stateful as well. But they are stateful in a separate
context to where **pr-release** is running. And they are stateful in a shared,
centralized location that all developers can see. This may sound worse, but
**pr-release** should always account for remote github state changing in
unpredictable ways and by leaning into it we encourage **pr-release** to be
authored without assumptions about absolute control over git state. While your
script runs, some other dev might merge a PR, or run a different CI job in
parallel, this should always be okay wherever possible.

## Website / Docs

### To run the website with HMR

```bash
node run.js watch
```

Any edits to JS / HTML / CSS should automatically be visible in the browser.
