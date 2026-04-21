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
