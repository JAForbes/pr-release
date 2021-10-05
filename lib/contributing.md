# Contributing

> This is some very early high level thoughts, this project is way nascent to require contributors.

## Gather information, then perform effects

In any commands that perform changes to a repositories state, try to gather all information required at the start of the command and only execute side effects at the end.  Unfortuntely we can't atomically update Github's state, so to de-risk we should provide as much up front warning and checks as possible even at the cost of runtime performance.  With releases, the stakes are too high not to take every precaution.