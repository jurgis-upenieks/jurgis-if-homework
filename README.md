# Mac Terminal Commands, which I used to create empty project initially:
 - First things first, I updated my NodeJS version to latest stable to get the latest security patches for node and npm, which is especially important nowadays to update as frequently as possible, mainly to avoid being hacked by AI cyberattackers.
 - `cd ~/source`
 - `mkdir jurgis-if-homework`
 - `cd jurgis-if-homework`
 - `npx --yes create-next-app@latest homework.web`
 - `mv homework.web Homework.Web`
 - `mkdir Homework.Web.Tests`
 - `git init`
 - `git rm --cached -f -- Homework.Web`
 - `mv Homework.Web/.git .git/embedded-repositories/Homework.Web.git`
 - `git add .`
 - `git commit -m ‘Initial’`
 - `git branch -M main`
 - `git remote add origin git@github.com:jurgis-upenieks/jurgis-if-homework.git`
 - `git remote set-url origin git@github.com:jurgis-upenieks/jurgis-if-homework.git`
 - `git push origin main`

