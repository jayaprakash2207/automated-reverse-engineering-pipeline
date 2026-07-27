---
name: project-claude-settings
description: .claude/settings.local.json contents — pre-approved Claude Code permissions for portable JDK/Maven setup
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Claude Code Project Permissions (.claude/settings.local.json)

File location in repo: `.claude/settings.local.json`

## Pre-approved bash commands
These commands are pre-allowed so Claude does not need to ask permission:
1. Download Maven 3.9.9 zip from dlcdn.apache.org via PowerShell
2. Download Maven 3.9.10 zip from dlcdn.apache.org via PowerShell
3. Download Maven 3.9.6 zip from archive.apache.org via PowerShell (the one that worked)
4. Create `C:\tools\` directory via bash
5. Extract Maven zip to `C:\tools\` via PowerShell Expand-Archive

## Additional directory access
`C:\` — allows Claude to read/write outside the project folder, needed to install portable tools to `C:\tools\`.

## Why this exists
User has no admin rights. JDK and Maven must be installed as portable zip extractions to `C:\tools\`.
The test executor (`pipeline_forward/test_executor_runner.py`) uses `JAVA_HOME` and `MAVEN_HOME` env vars pointing to these paths.

**Why:** Any agent or team member cloning this repo on a no-admin Windows machine needs these same permissions to run the pipeline. The file is committed so it travels with the repo.
**How to apply:** When starting a new Claude Code session on this project, these commands are already pre-approved. No need to approve them manually.
