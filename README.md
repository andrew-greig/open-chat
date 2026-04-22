# open-chat

Conversational AI web chat with web search augmentation.

## Setup

```bash
node server.js
```

Open http://localhost:3000 in a browser.

## Settings

Configure in the settings modal:

- **Server** - LM-Studio server URL (default: http://100.93.192.73:1234)
- **API Key** - LM-Studio API key (leave as "none" if not using one)
- **Model** - Select from available models (click "Fetch Models" first)
- **System Prompt** - Optional system prompt
- **Brave Search API Key** - Required for web search toggle

## Web Search

Toggle the magnifying glass icon in the input area to enable web search. Queries are sent to Brave Search API, results are used to augment the prompt before sending to the LLM.

The proxy server (`server.js`) handles Brave API requests to avoid CORS issues and keep the API key out of the browser.

## Skills

Skills are toggleable system prompt modules that instruct the model with domain-specific guidance. Click the pencil icon in the sidebar to open the skills management modal.

### Adding a New Skill

Add skills by editing `SKILLS_REGISTRY` in `app.js`:

```js
var SKILLS_REGISTRY = [
  {
    id: 'frontend-design',
    name: 'Frontend Design',
    description: 'Create distinctive, production-grade frontend interfaces.',
    url: 'https://raw.githubusercontent.com/anthropics/skills/refs/heads/main/skills/frontend-design/SKILL.md'
  },
  // Add more skills here
];
```

Each skill requires:

- **`id`** - Unique identifier (used for storage and toggle state)
- **`name`** - Display name shown in the skills modal
- **`description`** - Short description shown in the skills modal
- **`url`** - URL to fetch the skill content from (a `.md` file)

### Skill File Format

Skill files should be Markdown files. Optionally include YAML frontmatter at the top for metadata (the `description` field is extracted from frontmatter if present):

```markdown
---
name: my-skill
description: A brief description of what this skill does.
---

This skill guides the model to...

## Instructions

1. Do this
2. Do that
```

The content after the frontmatter (or the entire file if no frontmatter) is injected into the system prompt when the skill is toggled on.
