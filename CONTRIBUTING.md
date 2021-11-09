# Contributing

## <a name="commit"></a> Pull Request Title Format

This project uses the [conventional commit format](https://www.conventionalcommits.org/en/v1.0.0/). Since PR's are squashed and merged, the pull request title is the commit message that is pushed to the main branch. As a result, pull request titles are linted to adhere to the format. This format leads to an easier to read commit history, and enables automatic semantic versioning and changelog generation.

```
<type>(<scope>)<!>: <short summary>
  │       │     |         │
  │       │     |         └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │     └─⫸ Breaking change indicator
  │       └─⫸ Commit Scope: admin|bounty|coordinape|help|notion|poap|scoap-squad|timecard
  │
  └─⫸ Commit Type: build|ci|chore|docs|feat|fix|perf|refactor|revert|style|test
```

The `<type>` and `<summary>` fields are mandatory, the `(<scope>)` field is optional.


###  Type

Must be one of the following:

* **build**: Changes that affect the build system or external dependencies
* **ci**: Changes to our CI configuration files and scripts
* **chore**: Other changes that don't modify source or test code
* **docs**: Documentation only changes
* **feat**: A new feature. This will result in a minor version change to the [SemVer](https://semver.org/).
* **fix**: A bug fix
* **perf**: A code change that improves performance
* **refactor**: A code change that neither fixes a bug nor adds a feature
* **revert**: A code change that reverts a previous commit
* **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
* **test**: Adding missing tests or correcting existing tests

#### Breaking change indicator
Append `!` to the type/scope if the PR introduces a breaking change. This will result in a major version change to the [SemVer](https://semver.org/)..

### Scope
The scope should be the name of the command affected (as perceived by the person reading the changelog generated from commit messages).

The following is the list of supported scopes:

* `admin`
* `bounty`
* `coordinape`
* `help`
* `notion`
* `poap`
* `scoap-squad`
* `timecard`

There are currently a few exceptions to the "use command name" rule:

* `changelog`: used for updating the release notes in CHANGELOG.md

* none/empty string: useful for changes that affect more than one command (e.g. `test: add missing unit tests` or `build: updating node version`) and for docs changes that are not related to a specific command (e.g. `docs: fix typo in tutorial`).


### Summary

Use the summary field to provide a succinct description of the change:

* use the imperative, present tense: "change" not "changed" nor "changes"
* don't capitalize the first letter
* no dot (.) at the end