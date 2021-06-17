# Git Branches

These are the major branches

1. main

-   contains production ready code
-   code that users are using
-   possible DAO impact if something is wrong
-   any new commit causes auto deployment

2. develop

-   contains multiple new features
-   auto deployment to shared environments like servers, databases, discords
-   has code that is approved by reviewers

3. feature/

-   new feature based on issue or request
-   this branch is created from develop branch
-   can be deleted

4. release/x.x.x

-   contains code ready for production
-   can be deployed to QA/UAT server
-   beta testers from DAO can be given access to test

5. hotfix/x.x.x

-   in case a bug is found in production this is forked from main
-   very small changes
-   should be merged quickly directly to main once approval is done

## Contributor Workflow

### Create feature branch from develop

### Create PR from feature/my-new-feature -> develop

-   PR reviews looks at code confirms it looks good
-   developer test PR in local computer, their discord guild
-   CI/CD will validate that all test cases are good
-   PR reviewers test cases are created

### PR merged to develop

-   CI/CD validate test and code is code
-   deploy to test linux/ubuntu server
-   deploy to shared test guild

## PR raised to release branch

-   discord bot version release candiate
-   CI/CD integration validation

## PR raised to main

-   production release
-   have a call with devs, SCOAP Squad, and relevant guild reps to make sure everything is smooth

https://nvie.com/posts/a-successful-git-branching-model/
