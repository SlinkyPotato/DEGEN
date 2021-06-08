# Git Branches

1. main  
 - stable  
 - production  
 - user are using  
 - impact if something is wrong  
 - any change causes prod deployment  
2. develop  
3. feature branches  

4. Release  
 - feature 1  
 - feature 2  
 - feature 3  

## Contributor Workflow  

### Create feature branch from develop  

### Create PR from feature/my-new-feature -> develop  
 - PR reviews looks at code confirms it looks good  
 - developer test PR in local computer, their discord guild  
 - CI/CD will validate that all test cases are good  
 - PR reviewers test cases are created  

### PR merged to develop  
 - CI/CD validate test and code is code  
 - deploy to test linux/ubuntu server  
 - deploy to shared test guild  

## PR raised to release branch  
 - discord bot version release candiate  
 - CI/CD integration validation  

## PR raised to main  
 - production release  
 - have a call with devs, SCOAP Squad, and relevant guild reps to make sure everything is smooth  


https://nvie.com/posts/a-successful-git-branching-model/