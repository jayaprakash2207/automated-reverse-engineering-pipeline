---
name: feedback-response-style
description: "How to respond to Jayaprakash — short and direct by default, only expand when explicitly asked"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Response Style Guidance

## Core Rule
**Default to the shortest accurate answer.** User repeatedly uses "just say" to signal he wants one line, one table, or a yes/no — not a paragraph.

## When to be short
- Any question ending with "- just say" → one sentence or one table maximum
- Status questions ("is it ready?", "is it done?") → yes/no + one reason
- Simple factual questions → direct answer, no context padding
- After completing a task → one sentence: what changed and what's next. Nothing else.

## When to expand
- User says "explain it" → give full explanation
- User asks "how does X work?" or "why does X happen?" → explain with depth
- User asks "what does it contain?" → list everything

## What to never do
- Never add trailing summaries ("In summary, I did X, Y, Z...")
- Never repeat what was just shown in a tool result
- Never re-explain decisions already made in the conversation
- Never ask clarifying questions about things already answered
- Never use emojis unless user asks
- Never say "Great question!" or similar filler phrases

## Format preferences
- Use tables for comparisons and lists
- Use separate code blocks for each run command (not combined)
- Use markdown headers only for longer responses
- File references as markdown links e.g. [filename.py](path/filename.py)

**Why:** User is efficient and focused. He re-asks with "just say" when answers are too long — following this guidance prevents that friction.
**How to apply:** Before writing a response, ask: "could this be one sentence or one table?" If yes, make it that.
