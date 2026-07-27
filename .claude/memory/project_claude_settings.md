---
name: project-claude-settings
description: .claude/settings.local.json — pre-approved Claude Code permissions for portable JDK/Maven setup on no-admin Windows machine
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Claude Code Project Permissions

File location in repo: `.claude/settings.local.json`

## Pre-approved Bash Commands

These 5 commands are pre-allowed — Claude does not need to ask permission to run them:

1. Download Maven 3.9.9 zip from dlcdn.apache.org:
   `Bash(powershell -Command "Invoke-WebRequest -Uri 'https://dlcdn.apache.org/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip' -OutFile 'C:\\tools\\maven.zip'")`

2. Create C:\tools\ directory:
   `Bash(mkdir -p /c/tools && echo "tools dir ready")`

3. Extract Maven zip to C:\tools\:
   `Bash(powershell -Command "Expand-Archive -Path 'C:\\tools\\maven.zip' -DestinationPath 'C:\\tools\\' -Force")`

4. Download Maven 3.9.10 zip from dlcdn.apache.org:
   `Bash(powershell -Command "Invoke-WebRequest -Uri 'https://dlcdn.apache.org/maven/maven-3/3.9.10/binaries/apache-maven-3.9.10-bin.zip' -OutFile 'C:\\tools\\maven.zip' -UseBasicParsing")`

5. Download Maven 3.9.6 zip from archive.apache.org (this is the one that works — 3.9.9 and 3.9.10 return 404 on dlcdn):
   `Bash(powershell -Command "Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip' -OutFile 'C:\\tools\\maven.zip' -UseBasicParsing")`

## Additional Directory Access
`C:\` — allows Claude to read/write to the full C: drive, not just the project folder. Required for:
- Writing JDK zip to `C:\tools\`
- Writing Maven zip to `C:\tools\`
- Extracting both to `C:\tools\`
- Reading `C:\tools\jdk21\` and `C:\tools\apache-maven-3.9.6\` when resolving portable tool paths

## Why These Exist
User has no admin rights on this machine. JDK and Maven cannot be installed via system installer (UAC prompt rejected). Instead they are downloaded as portable zips and extracted to `C:\tools\` — no PATH changes, no registry entries, no admin required.

The `test_executor_runner.py` uses `JAVA_HOME` and `MAVEN_HOME` env vars to find these portable binaries:
- `JAVA_HOME=C:\tools\jdk21\jdk-21.0.11+10`
- `MAVEN_HOME=C:\tools\apache-maven-3.9.6`

## Download URLs (working as of 2026-07-27)
- JDK 21 portable zip: https://adoptium.net/temurin/releases/ (select Windows x64, JDK, .zip — NOT installer)
- Maven 3.9.6 zip: https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip

**Why:** This file is committed to the repo so any team member cloning on a no-admin Windows machine gets these permissions automatically without needing to approve each command manually.
**How to apply:** When starting a new Claude Code session on this project, these commands are pre-approved. If new download commands are needed, add them to this file and re-commit.
