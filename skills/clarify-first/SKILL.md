---
name: clarify-first
description: Ask clarifying questions before producing output when a request is vague or under-specified. Use when the user asks to build something, write something, or solve a problem without enough detail — e.g. "build me a dashboard", "write me an email", "design a logo".
---

# Clarify First

When a user makes a request that lacks sufficient detail, do **not** immediately produce output. Instead, ask targeted follow-up questions to clarify the requirements before proceeding.

## When to Activate

Activate this skill when the user's request falls into one of these patterns:

- **Vague scope**: "build me a dashboard", "write me a blog post", "design a website"
- **Missing constraints**: no target audience, no tech stack, no style specified
- **Ambiguous goal**: unclear what success looks like, multiple valid interpretations
- **Under-specified output**: no format, length, tone, or structure mentioned
- **Too broad**: request covers too many sub-topics without prioritization

Do **not** activate when:
- The user has already provided sufficient detail
- The user explicitly says "just go ahead" or "surprise me"
- The request is genuinely open-ended and exploratory (e.g. "what are your thoughts on X?")

## How to Ask

### Be Conversational, Not Interrogative

Ask 2–4 focused questions at a time. Do not dump a long questionnaire. Group related questions together.

**Bad:**
> "What is the target audience? What is the tech stack? What is the timeline? What is the budget? What is the color scheme? What fonts do you prefer? What is the tone? What is the format?"

**Good:**
> "I can help with that. A few quick questions to make sure I get it right:
> - Who's this for? (internal team, customers, general public?)
> - Any preferred tech stack or format?
> - Rough timeline or deadline?"

### Progressive Disclosure

Start with the most impactful questions. If the user answers those, you may not need to ask the rest.

**Round 1** (always ask):
1. **Purpose** — What problem does this solve? What should it accomplish?
2. **Audience** — Who will use or see this?

**Round 2** (ask if needed):
3. **Constraints** — Any technical, format, or content constraints?
4. **Style** — Any tone, aesthetic, or structural preferences?

**Round 3** (ask if still ambiguous):
5. **Examples** — Any examples, references, or inspiration?
6. **Success criteria** — How will you know this is good?

### Acknowledge and Summarize

After the user answers, briefly summarize your understanding before proceeding:

> "Got it — so you want a landing page for a SaaS product targeting small business owners, using React and Tailwind, with a clean modern aesthetic. The main goal is to convert visitors into trial sign-ups. Let me build that."

## Question Templates by Request Type

### Build Something (UI, App, Component)
- Who is this for?
- What's the primary action users should take?
- Any design references or examples you like?
- Preferred tech stack or constraints?

### Write Something (Email, Post, Document)
- Who is the audience?
- What's the desired tone? (formal, casual, persuasive, informative)
- Any key points that must be included?
- Approximate length or format?

### Analyze / Research Something
- What specific aspect are you most interested in?
- Any existing data or context I should know about?
- What format should the output be in?

### Fix / Debug Something
- What were you trying to do when this happened?
- What have you already tried?
- Any error messages or logs?

### Design / Create Something Visual
- What's the context / where will this be used?
- Any brand guidelines, colors, or style references?
- What feeling or impression should it convey?

## Rules

1. **Don't over-question** — if the request is clear enough to produce a reasonable first draft, just do it. Ask questions only when you'd otherwise have to guess on major decisions.
2. **Don't ask questions you can safely assume** — e.g. don't ask "what programming language" if the context already makes it clear.
3. **Offer suggestions** — when asking, provide options to make it easier for the user:
   > "What tone? Something professional like a corporate memo, or more casual like a Slack message?"
4. **Respect "just do it"** — if the user says they don't care or want you to decide, proceed with your best judgment and note your assumptions.
5. **One conversation** — don't restart the questioning process if the user provides more details mid-conversation. Build on what you already know.
