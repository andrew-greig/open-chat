(function () {
  'use strict';

  // ── Audio Chime ──
  function playChime() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var now = ctx.currentTime;

      function tone(freq, start, dur, vol) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(vol, now + start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
      }

      tone(880, 0, 0.15, 0.15);
      tone(1108.73, 0.1, 0.15, 0.15);
      tone(1318.51, 0.2, 0.25, 0.12);

      setTimeout(function () { ctx.close(); }, 600);
    } catch (e) { /* silent fail */ }
  }

  // ── DOM References ──
  const messagesEl = document.getElementById('messages');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const serverUrlInput = document.getElementById('serverUrl');
  const modelSelect = document.getElementById('modelSelect');
  const fetchModelsBtn = document.getElementById('fetchModels');
  const clearBtn = document.getElementById('clearBtn');
  const configToggle = document.getElementById('configToggle');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const settingsClose = document.getElementById('settingsClose');
  const themeToggle = document.getElementById('themeToggle');
  const themeMenu = document.getElementById('themeMenu');
  const themeOptions = document.querySelectorAll('.theme-option');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const imageFilename = document.getElementById('imageFilename');
  const imageRemoveBtn = document.getElementById('imageRemoveBtn');
  const systemPromptInput = document.getElementById('systemPrompt');
  const apiKeyInput = document.getElementById('apiKey');
  const braveApiKeyInput = document.getElementById('braveApiKey');
  const webSearchToggle = document.getElementById('webSearchToggle');
  const webSearchLoading = document.getElementById('webSearchLoading');
  const sourcesPill = document.getElementById('sourcesPill');
  const sourcesPillFavicons = document.getElementById('sourcesPillFavicons');
  const sourcesOverlay = document.getElementById('sourcesOverlay');
  const sourcesClose = document.getElementById('sourcesClose');
  const sourcesList = document.getElementById('sourcesList');
  const modelPillWrapper = document.getElementById('modelPillWrapper');
  const skillsBtn = document.getElementById('skillsBtn');
  const skillsOverlay = document.getElementById('skillsOverlay');
  const skillsClose = document.getElementById('skillsClose');
  const skillsList = document.getElementById('skillsList');
  const modelPill = document.getElementById('modelPill');
  const modelPillText = document.getElementById('modelPillText');
  const modelDropdownMenu = document.getElementById('modelDropdownMenu');
  const modelPillArrow = modelPill.querySelector('.model-pill-arrow');

  // ── Constants ──
  const DEFAULT_SERVER = 'http://100.93.192.73:1234';
  const STORAGE_KEYS = {
    server: 'chat_server',
    model: 'chat_model',
    theme: 'chat_theme',
    systemPrompt: 'chat_system_prompt',
    apiKey: 'chat_api_key',
    braveApiKey: 'chat_brave_api_key',
    webSearchEnabled: 'chat_web_search_enabled',
    skills: 'chat_skills'
  };

  // ── Skills Registry ──
  var SKILLS_REGISTRY = [
    {
      id: 'frontend-design',
      name: 'Frontend Design',
      description: 'Create distinctive, production-grade frontend interfaces with high design quality.',
      url: 'https://raw.githubusercontent.com/anthropics/skills/refs/heads/main/skills/frontend-design/SKILL.md'
    },
    {
      id: 'clarify-first',
      name: 'Clarify First',
      description: 'Asks clarifying questions before producing output when a request is vague or under-specified.',
      url: 'https://raw.githubusercontent.com/andrew-greig/open-chat/refs/heads/main/skills/clarify-first/SKILL.md'
    },
    {
      id: 'caveman',
      name: 'Caveman',
      description: 'Ultra-compressed caveman-style communication. Cuts token usage ~75% while keeping full technical accuracy.',
      url: 'https://raw.githubusercontent.com/JuliusBrussee/caveman/refs/heads/main/skills/caveman/SKILL.md'
    }
  ];

  // ── State ──
  let conversation = [];
  let streaming = false;
  let abortController = null;
  let codeBlocks = [];
  let attachedImage = null;
  let webSearchEnabled = false;
  let currentSearchResults = [];
  let skillsState = {}; // { skillId: { content, enabled } }
  let savedSkillIds = {}; // { skillId: true/false }

  // ── SVG Icons (reusable) ──
  const ARROW_SVG = '<polyline points="9 18 15 12 9 6"/>';
  const COPY_SVG = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
  const CHECK_SVG = '<polyline points="20 6 9 17 4 12"/>';
  const STOP_SVG = '<rect x="6" y="6" width="12" height="12" rx="1" ry="1"/>';
  const CHAT_SVG = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
  const SEND_SVG = '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>';

  // ── Utility Functions ──
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMath(math, mode) {
    if (typeof katex === 'undefined') {
      return '<span class="math-fallback">' + escapeHtml(math) + '</span>';
    }
    try {
      return katex.renderToString(math.trim(), {
        displayMode: mode === 'display',
        throwOnError: false,
        trust: true
      });
    } catch (e) {
      return '<span class="math-fallback">' + escapeHtml(math) + '</span>';
    }
  }

  function normalizeServerUrl(url) {
    return url.replace(/\/+$/, '');
  }

  function hideEmpty() {
    const el = document.getElementById('emptyState');
    if (el) el.style.display = 'none';
  }

  function createEmptyState() {
    const el = document.createElement('div');
    el.className = 'empty-state';
    el.id = 'emptyState';
    el.innerHTML = `
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          ${CHAT_SVG}
        </svg>
      </div>
      <div class="empty-title">Start a conversation</div>
      <div class="empty-subtitle">Messages are streamed directly from your LM-Studio server</div>`;
    messagesEl.appendChild(el);
  }

  // ── Theme Management ──
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'default';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeActive(savedTheme);
  }

  function updateThemeActive(val) {
    themeOptions.forEach(function (o) {
      o.classList.toggle('active', o.getAttribute('data-theme-val') === val);
    });
  }

  function handleThemeToggle(e) {
    e.stopPropagation();
    themeMenu.classList.toggle('open');
  }

  function handleThemeSelect(e) {
    const option = e.target.closest('.theme-option');
    if (!option) return;
    const val = option.getAttribute('data-theme-val');
    document.documentElement.setAttribute('data-theme', val);
    localStorage.setItem(STORAGE_KEYS.theme, val);
    updateThemeActive(val);
    themeMenu.classList.remove('open');
  }

  function handleOutsideClick(e) {
    if (!e.target.closest('.sidebar-theme-dropdown')) {
      themeMenu.classList.remove('open');
    }
  }

  // ── Settings Modal ──
  function openSettings() {
    settingsOverlay.classList.add('open');
  }

  function closeSettings() {
    settingsOverlay.classList.remove('open');
  }

  function handleSettingsEscape(e) {
    if (e.key === 'Escape' && settingsOverlay.classList.contains('open')) {
      closeSettings();
    }
  }

  function handleSettingsBackdropClick(e) {
    if (e.target === settingsOverlay) {
      closeSettings();
    }
  }

  function loadSavedConfig() {
    const savedServer = localStorage.getItem(STORAGE_KEYS.server);
    const savedModel = localStorage.getItem(STORAGE_KEYS.model);
    const savedPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);
    if (savedServer) {
      serverUrlInput.value = savedServer;
    } else {
      serverUrlInput.value = DEFAULT_SERVER;
    }
    if (savedModel) {
      modelSelect.value = savedModel;
    }
    if (savedPrompt) {
      systemPromptInput.value = savedPrompt;
    }
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (savedApiKey) {
      apiKeyInput.value = savedApiKey;
    }
    const savedBraveKey = localStorage.getItem(STORAGE_KEYS.braveApiKey);
    if (savedBraveKey) {
      braveApiKeyInput.value = savedBraveKey;
    }
    const savedWebSearch = localStorage.getItem(STORAGE_KEYS.webSearchEnabled);
    if (savedWebSearch === 'true') {
      webSearchEnabled = true;
      webSearchToggle.classList.add('active');
    }
  }

  // ── Connection Management ──
  function setConnectionStatus(status) {
    switch (status) {
      case 'disconnected':
        modelSelect.innerHTML = '<option value="">No connection</option>';
        modelDropdownMenu.innerHTML = '';
        updateModelPill('');
        break;
    }
  }

  function checkConnection(server) {
    var url = (server || serverUrlInput.value).replace(/\/+$/, '');
    var apiKey = apiKeyInput.value;
    var headers = {};
    if (apiKey && apiKey !== 'none') {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }
    setConnectionStatus('connecting');

    fetch(url + '/v1/models', { headers: headers, signal: AbortSignal.timeout(5000) })
      .then(function (res) {
        if (res.ok) {
          setConnectionStatus('connected');
          return loadModels(url);
        }
        throw new Error('Not reachable');
      })
      .catch(function () {
        setConnectionStatus('disconnected');
      });
  }

  function loadModels(server) {
    var url = (server || serverUrlInput.value).replace(/\/+$/, '');
    var apiKey = apiKeyInput.value;
    var headers = {};
    if (apiKey && apiKey !== 'none') {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }
    return fetch(url + '/v1/models', { headers: headers })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var models = data.data || [];
        modelSelect.innerHTML = '';
        modelDropdownMenu.innerHTML = '';
        if (models.length === 0) {
          modelSelect.innerHTML = '<option value="">No models found</option>';
          updateModelPill('');
          return;
        }
        models.forEach(function (m) {
          var opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.id;
          modelSelect.appendChild(opt);

          var menuOpt = document.createElement('button');
          menuOpt.className = 'model-option';
          menuOpt.setAttribute('data-model-id', m.id);
          var nameSpan = document.createElement('span');
          nameSpan.className = 'model-option-name';
          nameSpan.textContent = m.id;
          menuOpt.appendChild(nameSpan);
          modelDropdownMenu.appendChild(menuOpt);
        });
        var savedModel = localStorage.getItem(STORAGE_KEYS.model);
        if (savedModel && models.find(function (m) { return m.id === savedModel; })) {
          modelSelect.value = savedModel;
        }
        updateModelPill(modelSelect.value);
      })
      .catch(function () {
        // Keep existing models
      });
  }

  function updateModelPill(modelId) {
    if (!modelId || modelId === '') {
      modelPillText.textContent = 'No model selected';
    } else {
      var displayName = modelId;
      if (displayName.length > 40) {
        displayName = displayName.substring(0, 37) + '...';
      }
      modelPillText.textContent = displayName;
    }
    modelDropdownMenu.querySelectorAll('.model-option').forEach(function (opt) {
      opt.classList.toggle('active', opt.getAttribute('data-model-id') === modelId);
    });
  }

  function handleModelPillToggle() {
    var isOpen = modelDropdownMenu.classList.contains('open');
    modelDropdownMenu.classList.toggle('open');
    modelPillArrow.classList.toggle('open', !isOpen);
  }

  function handleModelSelect(e) {
    var option = e.target.closest('.model-option');
    if (!option) return;
    var modelId = option.getAttribute('data-model-id');
    modelSelect.value = modelId;
    localStorage.setItem(STORAGE_KEYS.model, modelId);
    updateModelPill(modelId);
    modelDropdownMenu.classList.remove('open');
    modelPillArrow.classList.remove('open');
  }

  function handleModelDropdownOutsideClick(e) {
    if (!e.target.closest('.model-pill-wrapper')) {
      modelDropdownMenu.classList.remove('open');
      modelPillArrow.classList.remove('open');
    }
  }

  // ── Message Rendering ──
  function addMsg(role, text) {
    hideEmpty();
    var wrapper = document.createElement('div');
    wrapper.className = 'msg ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'Y' : 'AI';

    var body = document.createElement('div');
    body.className = 'msg-body';

    var roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Assistant';

    var content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = text;

    body.appendChild(roleLabel);
    body.appendChild(content);
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMsgWithImage(role, text, imageBase64) {
    hideEmpty();
    var wrapper = document.createElement('div');
    wrapper.className = 'msg ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'Y' : 'AI';

    var body = document.createElement('div');
    body.className = 'msg-body';

    var roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'Assistant';

    var content = document.createElement('div');
    content.className = 'msg-content';

    if (text) {
      var textP = document.createElement('p');
      textP.textContent = text;
      content.appendChild(textP);
    }

    var img = document.createElement('img');
    img.src = imageBase64;
    img.style = 'max-width:100%;border-radius:var(--radius-sm);border:1px solid var(--border);margin-top:8px;display:block;';
    content.appendChild(img);

    body.appendChild(roleLabel);
    body.appendChild(content);
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addStreamingMsg() {
    hideEmpty();
    var wrapper = document.createElement('div');
    wrapper.className = 'msg assistant';

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'AI';

    var body = document.createElement('div');
    body.className = 'msg-body';

    var roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role';
    roleLabel.textContent = 'Assistant';

    var content = document.createElement('div');
    content.className = 'msg-content';

    var reasoningEl = document.createElement('div');

    body.appendChild(roleLabel);
    body.appendChild(reasoningEl);
    body.appendChild(content);
    wrapper.appendChild(avatar);
    wrapper.appendChild(body);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return { contentEl: content, reasoningEl: reasoningEl };
  }

  function showError(text) {
    hideEmpty();
    var wrapper = document.createElement('div');
    wrapper.className = 'msg error';
    var content = document.createElement('div');
    content.className = 'msg-content';
    content.textContent = text;
    wrapper.appendChild(content);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStreamingUI(isStreaming) {
    sendBtn.disabled = !isStreaming;
    sendBtn.classList.toggle('streaming', isStreaming);
    sendBtn.title = isStreaming ? 'Stop streaming' : '';
    sendBtn.querySelector('.send-icon').style.display = isStreaming ? 'none' : 'block';
    sendBtn.querySelector('.stop-icon').style.display = isStreaming ? 'block' : 'none';
  }

  // ── Thinking Section ──
  function createThinkingPill() {
    var pill = document.createElement('div');
    pill.className = 'thinking-pill';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = ARROW_SVG;
    pill.appendChild(svg);

    var label = document.createElement('span');
    label.textContent = 'Thinking';
    pill.appendChild(label);

    return pill;
  }

  function createThinkingBody() {
    var body = document.createElement('div');
    body.className = 'thinking-body';
    return body;
  }

  function ensureThinkingDOM(reasoningEl) {
    if (reasoningEl._pill) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'thinking-wrapper';

    var pill = createThinkingPill();
    var body = createThinkingBody();

    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      body.classList.toggle('visible');
      pill.classList.toggle('expanded');
    });

    wrapper.appendChild(pill);
    wrapper.appendChild(body);
    reasoningEl.appendChild(wrapper);

    reasoningEl._pill = pill;
    reasoningEl._body = body;
    reasoningEl._wrapper = wrapper;
  }

  function updateThinking(reasoningEl, reasoningText) {
    if (reasoningText.length === 0) {
      if (reasoningEl._wrapper) {
        reasoningEl._wrapper.remove();
        reasoningEl._pill = null;
        reasoningEl._body = null;
        reasoningEl._wrapper = null;
      }
      return;
    }
    ensureThinkingDOM(reasoningEl);
    reasoningEl._body.innerHTML = formatMarkdown(reasoningText);
  }

  // ── Markdown Parser ──
  function formatMarkdown(text) {
    // Normalize line endings to prevent regex issues
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Use unique delimiters that won't be affected by HTML escaping
    var CODEBLOCK_START = '\u0001CODEBLOCK\u0001';
    var CODEBLOCK_END = '\u0002';
    var LINK_START = '\u0003LINK\u0003';
    var LINK_END = '\u0004';
    var IMAGE_START = '\u0005IMAGE\u0005';
    var IMAGE_END = '\u0006';
    var TABLE_START = '\u0007TABLE\u0007';
    var TABLE_END = '\u0010';
    var MATH_START = '\u0011MATH\u0011';
    var MATH_END = '\u0012';

    // Extract code blocks (with language) to protect them (before escapeHtml)
    var codeHtml = [];
    var links = [];
    var images = [];
    var tables = [];
    var mathHtml = [];
    codeBlocks = [];

    // Fenced code blocks with language
    text = text.replace(/```(\w+)\n?([\s\S]*?)```/g, function (_, lang, code) {
      var codeText = code.trim();
      var langAttr = ' class="language-' + lang + '"';
      var escapedCode = escapeHtml(codeText);
      var encodedCode = btoa(encodeURIComponent(codeText));
      var copyBtn = '<button class="copy-btn" data-code-idx="' + (codeHtml.length) + '" data-code="' + encodedCode + '" title="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + COPY_SVG + '</svg></button>';
      codeHtml.push('<div class="code-block-container">' + copyBtn + '<pre><code' + langAttr + '>' + escapedCode + '</code></pre></div>');
      return CODEBLOCK_START + (codeHtml.length - 1) + CODEBLOCK_END;
    });

    // Fenced code blocks without language
    text = text.replace(/```\n?([\s\S]*?)```/g, function (_, code) {
      var codeText = code.trim();
      var escapedCode = escapeHtml(codeText);
      var encodedCode = btoa(encodeURIComponent(codeText));
      var copyBtn = '<button class="copy-btn" data-code-idx="' + (codeHtml.length) + '" data-code="' + encodedCode + '" title="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + COPY_SVG + '</svg></button>';
      codeHtml.push('<div class="code-block-container">' + copyBtn + '<pre><code>' + escapedCode + '</code></pre></div>');
      return CODEBLOCK_START + (codeHtml.length - 1) + CODEBLOCK_END;
    });

    // Handle streaming code blocks that are being actively typed (no closing backticks yet)
    text = handleActiveCodeBlocks(text, codeHtml);

    // Handle unclosed code blocks (streaming) - must be before escapeHtml
    text = handleUnclosedCodeBlocks(text, codeHtml);

    // Extract block math ($$...$$) - must be before escapeHtml
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, function (_, math) {
      var idx = mathHtml.length;
      var rendered = renderMath(math, 'display');
      mathHtml.push(rendered);
      return MATH_START + idx + MATH_END;
    });

    // Extract inline math ($...$) - must be before escapeHtml
    text = text.replace(/\$([^\$\n]+?)\$/g, function (_, math) {
      var idx = mathHtml.length;
      var rendered = renderMath(math, 'inline');
      mathHtml.push(rendered);
      return MATH_START + idx + MATH_END;
    });

    // Escape HTML after all code blocks and math are protected
    text = escapeHtml(text);

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, linkText, href) {
      var idx = links.length;
      links.push('<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + linkText + '</a>');
      return LINK_START + idx + LINK_END;
    });

    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (_, alt, src) {
      var idx = images.length;
      images.push('<img src="' + src + '" alt="' + alt + '" style="max-width:100%;border-radius:var(--radius-sm);border:1px solid var(--border);"/>');
      return IMAGE_START + idx + IMAGE_END;
    });

    // Headers
    text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    text = text.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    text = text.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    text = text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');

    // Blockquotes - handle nested and consecutive
    text = text.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    text = text.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Tables
    text = text.replace(/^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)*)/gm, function (_, headerRow, separatorRow, bodyRows) {
      var idx = tables.length;
      var headers = headerRow.split('|').filter(function (c) { return c.trim(); }).map(function (c) { return '<th>' + c.trim() + '</th>'; }).join('');
      var rows = bodyRows.trim().split('\n').map(function (row) {
        var cells = row.split('|').filter(function (c) { return c.trim(); }).map(function (c) { return '<td>' + c.trim() + '</td>'; }).join('');
        return '<tr>' + cells + '</tr>';
      }).join('');
      tables.push('<table><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table>');
      return TABLE_START + idx + TABLE_END;
    });

    // Strikethrough
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Bold (must come before italic)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');

    // Unordered lists with proper nesting
    text = processList(text, /^(\s*)[*\-+]\s+(.+)$/gm, 'ul');

    // Ordered lists with proper nesting
    text = processList(text, /^(\s*)\d+\.\s+(.+)$/gm, 'ol');

    // Paragraphs - wrap lines not already in tags and not placeholders
    text = text.replace(/^(?!<[a-z/])(?!%%)((?!%%).+)$/gm, '<p>$1</p>');

    // Restore placeholders (only if they were actually extracted)
    text = text.replace(new RegExp(CODEBLOCK_START + '(\\d+)' + CODEBLOCK_END, 'g'), function (_, idx) {
      return codeHtml[parseInt(idx)] || ('~CODEBLOCK_' + idx + '~');
    });
    text = text.replace(new RegExp(LINK_START + '(\\d+)' + LINK_END, 'g'), function (_, idx) {
      return links[parseInt(idx)] || ('~LINK_' + idx + '~');
    });
    text = text.replace(new RegExp(IMAGE_START + '(\\d+)' + IMAGE_END, 'g'), function (_, idx) {
      return images[parseInt(idx)] || ('~IMAGE_' + idx + '~');
    });
    text = text.replace(new RegExp(TABLE_START + '(\\d+)' + TABLE_END, 'g'), function (_, idx) {
      return tables[parseInt(idx)] || ('~TABLE_' + idx + '~');
    });
    text = text.replace(new RegExp(MATH_START + '(\\d+)' + MATH_END, 'g'), function (_, idx) {
      return mathHtml[parseInt(idx)] || ('$' + idx + '$');
    });

    // Clean up extra newlines
    text = text.replace(/\n{2,}/g, '\n\n');

    return text;
  }

  // ── Handle Active (Unclosed) Code Blocks ──
  // Tracks code blocks that are being typed but not yet closed
  var activeCodeBlocks = [];

  function handleActiveCodeBlocks(text, codeHtmlArray) {
    var blockPattern = /```(\w*)\n?([\s\S]*?)(?![`])/g;
    
    text = text.replace(blockPattern, function(_, lang, code) {
      activeCodeBlocks.push({
        idx: codeHtmlArray.length,
        lang: lang || '',
        content: code,
        hasClosing: false
      });
      
      // Render unclosed block with cursor effect
      var escapedCode = escapeHtml(code);
      var encodedCode = btoa(encodeURIComponent(code));
      var copyBtn = '<button class="copy-btn" data-code-idx="' + (codeHtmlArray.length) + '" data-code="' + encodedCode + '" title="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + COPY_SVG + '</svg></button>';
      
      var langAttr = lang ? ' class="language-' + lang + '"' : '';
      
      codeHtmlArray.push(
        '<div class="code-block-container">' +
        copyBtn +
        '<pre><code' + langAttr + '>' + escapedCode + '</code></pre>' +
        '<span class="cursor-blink"></span>' +
        '</div>'
      );
      
      return CODEBLOCK_START + (codeHtmlArray.length - 1) + CODEBLOCK_END;
    });
    
    // Check if any active blocks now have closing backticks
    for (var i = activeCodeBlocks.length - 1; i >= 0; i--) {
      var block = activeCodeBlocks[i];
      if (!block.hasClosing) {
        // Block is still open, mark as closed since we found the content
        block.hasClosing = true;
      }
    }
    
    return text;
  }

  function handleUnclosedCodeBlocks(text, codeHtmlArray) {
    var unclosedRegex = /```(\w*)\n([\s\S]*?)```$/gm;

    text = text.replace(unclosedRegex, function (_, lang, code) {
      if (code.length === 0) return '```' + lang + code + '```';

      var langAttr = lang ? ' class="language-' + lang + '"' : '';
      var escapedCode = escapeHtml(code);
      var encodedCode = btoa(encodeURIComponent(code));
      var codeIdx = codeHtmlArray.length;
      codeHtmlArray.push(
        '<div class="code-block-container">' +
        '<button class="copy-btn" data-code-idx="' + codeIdx + '" data-code="' + encodedCode + '" title="Copy code">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + COPY_SVG + '</svg>' +
        '</button>' +
        '<pre><code' + langAttr + '>' + escapedCode + '</code></pre>' +
        '<span class="cursor-blink"></span>' +
        '</div>'
      );
      return CODEBLOCK_START + codeIdx + CODEBLOCK_END;
    });

    // Close any active blocks that still don't have closing backticks
    for (var i = activeCodeBlocks.length - 1; i >= 0; i--) {
      var block = activeCodeBlocks[i];
      if (!block.hasClosing) {
        var langAttr = block.lang ? ' class="language-' + block.lang + '"' : '';
        var escapedCode = escapeHtml(block.content);
        var encodedCode = btoa(encodeURIComponent(block.content));
        codeHtmlArray.push(
          '<div class="code-block-container">' +
          '<button class="copy-btn" data-code-idx="' + (codeHtmlArray.length - 1) + '" data-code="' + encodedCode + '" title="Copy code">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + COPY_SVG + '</svg>' +
          '</button>' +
          '<pre><code' + langAttr + '>' + escapedCode + '</code></pre>' +
          '</div>'
        );
        activeCodeBlocks.splice(i, 1);
      }
    }

    return text;
  }

  function processList(text, regex, tag) {
    var lines = text.split('\n');
    var result = [];
    var openLevels = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var match = line.match(regex);

      if (match && match[1] !== undefined) {
        var indent = match[1].length;
        var content = match[2];
        var level = Math.floor(indent / 2);

        // Close levels that are too deep
        while (openLevels.length > level) {
          result.push('</' + openLevels.pop() + '>');
        }

        // Open new levels
        while (openLevels.length < level) {
          result.push('<' + tag + '>');
          openLevels.push(tag);
        }

        result.push('<li>' + content + '</li>');
      } else {
        // Close all open list levels before non-list line
        while (openLevels.length > 0) {
          result.push('</' + openLevels.pop() + '>');
        }
        result.push(line);
      }
    }

    // Close any remaining open list levels
    while (openLevels.length > 0) {
      result.push('</' + openLevels.pop() + '>');
    }

    return result.join('\n');
  }

  // ── Code Copy ──
  function copyCode(encoded) {
    var code = decodeURIComponent(atob(encoded));
    if (code === undefined || code === '') return;
    navigator.clipboard.writeText(code).then(function () {
      var btn = document.querySelector('button[data-code="' + encoded + '"]');
      if (btn) {
        btn.classList.add('copied');
        setTimeout(function () {
          btn.classList.remove('copied');
        }, 1500);
      }
    }).catch(function(err) {
      console.error('Copy failed:', err);
    });
  }

  // ── Streaming / API ──
  async function send() {
    var text = userInput.value.trim();
    if (streaming) return;
    if (!text && !attachedImage) return;

    userInput.value = '';
    autoResizeTextarea();

    var imageBase64 = attachedImage ? attachedImage.base64 : null;
    clearAttachedImage();

    var userContent = text;
    if (imageBase64) {
      var imageContent = [];
      if (text) {
        imageContent.push({ type: 'text', text: text });
      }
      imageContent.push({ type: 'image_url', image_url: { url: imageBase64 } });
      addMsgWithImage('user', text, imageBase64);
      conversation.push({ role: 'user', content: imageContent });
    } else {
      addMsg('user', text);
      conversation.push({ role: 'user', content: text });
    }

    if (webSearchEnabled && text) {
      webSearchLoading.style.display = 'flex';
      sendBtn.disabled = true;
      var searchResult = await performWebSearch(text);
      webSearchLoading.style.display = 'none';
      sendBtn.disabled = false;
      currentSearchResults = searchResult.results;
      if (currentSearchResults.length > 0) {
        renderSourcesPill(currentSearchResults);
      }
      var augmentedPrompt = 'Context from web search:\n\n' + searchResult.formatted + '\n\nUser query: ' + text;
      conversation[conversation.length - 1].content = augmentedPrompt;
    }

    var server = normalizeServerUrl(serverUrlInput.value);
    var model = modelSelect.value;
    var searchApiKey = apiKeyInput.value;

    if (!model) {
      showError('No model selected. Open settings and fetch available models.');
      return;
    }

    localStorage.setItem(STORAGE_KEYS.server, server);
    localStorage.setItem(STORAGE_KEYS.model, model);

    var headers = { 'Content-Type': 'application/json' };
    if (searchApiKey && searchApiKey !== 'none') {
      headers['Authorization'] = 'Bearer ' + searchApiKey;
    }

    abortController = new AbortController();
    streaming = true;
    setStreamingUI(true);

    var reasoningText = '';
    var fullText = '';
    var startTime = Date.now();

    var msg = addStreamingMsg();
    var contentEl = msg.contentEl;
    var reasoningEl = msg.reasoningEl;

    fetch(server + '/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: conversation,
        stream: true,
        temperature: 0.7
      }),
      signal: abortController.signal
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (errText) {
            throw new Error('HTTP ' + res.status + ': ' + errText);
          });
        }
        return res;
      })
      .then(function (res) {
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        function read() {
          return reader.read().then(function ({ done, value }) {
            if (done) {
              finalizeMessage(contentEl, reasoningEl, fullText, reasoningText, startTime);
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            var lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (!line || !line.startsWith('data: ')) continue;
              var data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                var json = JSON.parse(data);
                var choice = json.choices && json.choices[0];
                var delta = choice && choice.delta || {};
                var content = delta.content;
                var reasoning = delta.reasoning || delta.reasoning_content;
                if (reasoning) {
                  reasoningText += reasoning;
                }
                if (content) {
                  fullText += content;
                }
                updateThinking(reasoningEl, reasoningText);
                contentEl.innerHTML = formatMarkdown(fullText) + (content ? '<span class="cursor-blink"></span>' : '');
                messagesEl.scrollTop = messagesEl.scrollHeight;
              } catch (e) {
                // Skip malformed JSON
              }
            }

            return read();
          });
        }

        return read();
      })
      .catch(function (err) {
        if (fullText || reasoningText) {
          updateThinking(reasoningEl, reasoningText);
          contentEl.innerHTML = formatMarkdown(fullText);
          conversation.push({ role: 'assistant', content: fullText });
          playChime();
        } else {
          showError(err.message);
        }
      })
      .finally(function () {
        streaming = false;
        abortController = null;
        setStreamingUI(false);
        userInput.focus();
      });
  }

  function finalizeMessage(contentEl, reasoningEl, fullText, reasoningText, startTime) {
    updateThinking(reasoningEl, reasoningText);
    contentEl.innerHTML = formatMarkdown(fullText);
    conversation.push({ role: 'assistant', content: fullText });
    playChime();

    if (startTime) {
      var elapsed = Date.now() - startTime;
      var timeStr = elapsed >= 1000
        ? Math.round(elapsed / 1000) + 's'
        : elapsed + 'ms';
      var meta = document.createElement('div');
      meta.className = 'msg-meta';
      meta.textContent = 'Responded in ' + timeStr;
      var body = contentEl.parentElement;
      if (body) {
        body.appendChild(meta);
      }
    }
  }

  // ── Textarea Auto-Resize ──
  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';
  }

  function updateSendBtn() {
    sendBtn.disabled = (!userInput.value.trim() && !attachedImage) || streaming;
  }

  // ── Clear Chat ──
  function clearChat() {
    conversation = [];
    var prompt = systemPromptInput.value.trim();
    var skillsContent = getEnabledSkillsContent();
    var fullSystemPrompt = [];
    if (skillsContent) {
      fullSystemPrompt.push(skillsContent);
    }
    if (prompt) {
      fullSystemPrompt.push(prompt);
    }
    if (fullSystemPrompt.length > 0) {
      conversation.push({ role: 'system', content: fullSystemPrompt.join('\n\n---\n\n') });
      localStorage.setItem(STORAGE_KEYS.systemPrompt, prompt);
    }
    messagesEl.innerHTML = '';
    createEmptyState();
    clearAttachedImage();
    hideSourcesPill();
  }

  // ── Web Search ──
  async function performWebSearch(query) {
    var apiKey = braveApiKeyInput.value;
    if (!apiKey) {
      return { formatted: 'Brave Search API key not configured. Please add your API key in settings.', results: [] };
    }

    try {
      var res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query, apiKey: apiKey })
      });
      var data = await res.json();
      if (!res.ok || data.error) {
        if (res.headers.get('X-Auth-Error')) {
          return { formatted: 'Web search failed: Invalid API key. Check your Brave API key in settings.', results: [] };
        }
        return { formatted: 'Web search failed: ' + (data.error || 'Unknown error'), results: [] };
      }
      var results = data.web && data.web.results ? data.web.results : [];
      var topResults = results.slice(0, 5);
      var formatted = '';
      topResults.forEach(function (r, i) {
        formatted += (i + 1) + '. ' + (r.title || 'Untitled') + '\n';
        formatted += '   ' + (r.url || '') + '\n';
        formatted += '   ' + (r.description || '') + '\n\n';
      });
      return {
        formatted: formatted.trim() || 'No results found for "' + query + '".',
        results: topResults
      };
    } catch (e) {
      return { formatted: 'Web search error: ' + e.message, results: [] };
    }
  }

  // ── Sources Display ──
  function getFaviconUrl(url) {
    try {
      var parsed = new URL(url);
      return 'https://www.google.com/s2/favicons?domain=' + parsed.hostname + '&sz=32';
    } catch (e) {
      return '';
    }
  }

  function renderSourcesPill(results) {
    sourcesPillFavicons.innerHTML = '';
    var shown = results.slice(0, 5);
    shown.forEach(function (r) {
      var faviconUrl = getFaviconUrl(r.url);
      if (faviconUrl) {
        var img = document.createElement('img');
        img.src = faviconUrl;
        img.className = 'source-favicon';
        img.alt = '';
        img.loading = 'lazy';
        sourcesPillFavicons.appendChild(img);
      }
    });
    sourcesPill.style.display = 'flex';
  }

  function hideSourcesPill() {
    sourcesPill.style.display = 'none';
    currentSearchResults = [];
  }

  function openSourcesPopup() {
    sourcesList.innerHTML = '';
    var shown = currentSearchResults.slice(0, 5);
    shown.forEach(function (r) {
      var faviconUrl = getFaviconUrl(r.url);
      var item = document.createElement('div');
      item.className = 'source-item';

      var header = document.createElement('div');
      header.className = 'source-item-header';

      if (faviconUrl) {
        var favicon = document.createElement('img');
        favicon.src = faviconUrl;
        favicon.className = 'source-favicon-lg';
        favicon.alt = '';
        favicon.loading = 'lazy';
        header.appendChild(favicon);
      }

      var title = document.createElement('span');
      title.className = 'source-title';
      title.textContent = r.title || 'Untitled';
      header.appendChild(title);

      item.appendChild(header);

      var urlLink = document.createElement('a');
      urlLink.className = 'source-url';
      urlLink.href = r.url;
      urlLink.target = '_blank';
      urlLink.rel = 'noopener noreferrer';
      urlLink.textContent = r.url;
      item.appendChild(urlLink);

      if (r.description) {
        var desc = document.createElement('div');
        desc.className = 'source-desc';
        desc.textContent = r.description;
        item.appendChild(desc);
      }

      sourcesList.appendChild(item);
    });
    sourcesOverlay.classList.add('open');
  }

  function closeSourcesPopup() {
    sourcesOverlay.classList.remove('open');
  }

  // ── Skills Modal ──
  function openSkills() {
    skillsOverlay.classList.add('open');
  }

  function closeSkills() {
    skillsOverlay.classList.remove('open');
  }

  function handleSkillsEscape(e) {
    if (e.key === 'Escape' && skillsOverlay.classList.contains('open')) {
      closeSkills();
    }
  }

  function handleSkillsBackdropClick(e) {
    if (e.target === skillsOverlay) {
      closeSkills();
    }
  }

  // ── Skills Management ──
  function initSkills() {
    // Load saved enabled states
    var savedSkills = localStorage.getItem(STORAGE_KEYS.skills);
    if (savedSkills) {
      try {
        savedSkillIds = JSON.parse(savedSkills);
      } catch (e) { /* ignore */ }
    }

    // Initialize skillsState from registry and saved state
    SKILLS_REGISTRY.forEach(function (skill) {
      if (!skillsState[skill.id]) {
        skillsState[skill.id] = {
          content: '',
          enabled: savedSkillIds[skill.id] === true
        };
      }
    });

    // Fetch all skills
    fetchAllSkills();

    // Render skills list
    renderSkillsList();
  }

  function fetchAllSkills() {
    SKILLS_REGISTRY.forEach(function (skill) {
      fetch(skill.url)
        .then(function (res) {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.text();
        })
        .then(function (content) {
          // Extract description from YAML frontmatter if present
          var desc = skill.description;
          var body = content;
          var yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (yamlMatch) {
            var yamlText = yamlMatch[1];
            var descMatch = yamlText.match(/description:\s*(.+?)\n/);
            if (descMatch) {
              desc = descMatch[1].trim();
            }
            // Get content after frontmatter
            var parts = content.split(/---\n[\s\S]*?---/);
            if (parts.length > 2) {
              body = parts.slice(2).join('---').trim();
            } else {
              body = content.replace(/^---\n[\s\S]*?---\n?/, '').trim();
            }
          }
          skillsState[skill.id].content = body;
          skillsState[skill.id].description = desc;
          renderSkillsList();
        })
        .catch(function () {
          renderSkillsList();
        });
    });
  }

  function saveSkillsState() {
    var enabledMap = {};
    Object.keys(skillsState).forEach(function (id) {
      enabledMap[id] = skillsState[id].enabled;
    });
    localStorage.setItem(STORAGE_KEYS.skills, JSON.stringify(enabledMap));
    savedSkillIds = enabledMap;
  }

  function getEnabledSkillsContent() {
    var parts = [];
    Object.keys(skillsState).forEach(function (id) {
      if (skillsState[id].enabled && skillsState[id].content) {
        parts.push(skillsState[id].content);
      }
    });
    return parts.join('\n\n---\n\n');
  }

  function renderSkillsList() {
    skillsList.innerHTML = '';

    SKILLS_REGISTRY.forEach(function (skill) {
      var state = skillsState[skill.id];
      if (!state) return;

      var item = document.createElement('div');
      item.className = 'skill-item';

      var info = document.createElement('div');
      info.className = 'skill-info';

      var name = document.createElement('div');
      name.className = 'skill-name';
      name.textContent = skill.name;

      var desc = document.createElement('div');
      desc.className = 'skill-desc';
      desc.textContent = state.description || skill.description;

      info.appendChild(name);
      info.appendChild(desc);

      var toggle = document.createElement('label');
      toggle.className = 'skill-toggle';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.enabled;
      checkbox.setAttribute('data-skill-id', skill.id);

      var slider = document.createElement('span');
      slider.className = 'skill-toggle-slider';

      toggle.appendChild(checkbox);
      toggle.appendChild(slider);

      item.appendChild(info);
      item.appendChild(toggle);
      skillsList.appendChild(item);
    });

    // Bind toggle events
    skillsList.querySelectorAll('.skill-toggle input').forEach(function (input) {
      input.addEventListener('change', function (e) {
        var skillId = e.target.getAttribute('data-skill-id');
        if (skillsState[skillId]) {
          skillsState[skillId].enabled = e.target.checked;
          saveSkillsState();
        }
      });
    });
  }

  // ── Image Attachment ──
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showImagePreview(file, base64) {
    attachedImage = { file: file, base64: base64 };
    imagePreview.src = base64;
    imageFilename.textContent = file.name;
    imagePreviewContainer.classList.add('visible');
    document.querySelector('.input-area').classList.add('has-preview');
  }

  function clearAttachedImage() {
    attachedImage = null;
    fileInput.value = '';
    imagePreviewContainer.classList.remove('visible');
    document.querySelector('.input-area').classList.remove('has-preview');
  }

  function handleAttachClick() {
    fileInput.click();
  }

  function handleFileSelect(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }
    fileToBase64(file).then(function (base64) {
      showImagePreview(file, base64);
    });
  }

  function handleImageRemove() {
    clearAttachedImage();
  }

  // ── Event Bindings ──
  themeToggle.addEventListener('click', handleThemeToggle);
  themeOptions.forEach(function (opt) {
    opt.addEventListener('click', handleThemeSelect);
  });
  document.addEventListener('click', handleOutsideClick);

  userInput.addEventListener('input', function () {
    autoResizeTextarea();
    updateSendBtn();
  });

  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  systemPromptInput.addEventListener('input', function () {
    localStorage.setItem(STORAGE_KEYS.systemPrompt, systemPromptInput.value);
  });

  apiKeyInput.addEventListener('input', function () {
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKeyInput.value);
  });

  braveApiKeyInput.addEventListener('input', function () {
    localStorage.setItem(STORAGE_KEYS.braveApiKey, braveApiKeyInput.value);
  });

  webSearchToggle.addEventListener('click', function () {
    webSearchEnabled = !webSearchEnabled;
    webSearchToggle.classList.toggle('active', webSearchEnabled);
    localStorage.setItem(STORAGE_KEYS.webSearchEnabled, webSearchEnabled);
  });

  sourcesPill.addEventListener('click', openSourcesPopup);
  sourcesClose.addEventListener('click', closeSourcesPopup);
  sourcesOverlay.addEventListener('click', function (e) {
    if (e.target === sourcesOverlay) closeSourcesPopup();
  });

  configToggle.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', handleSettingsBackdropClick);
  document.addEventListener('keydown', handleSettingsEscape);
  fetchModelsBtn.addEventListener('click', function () { checkConnection(); });
  clearBtn.addEventListener('click', clearChat);
  skillsBtn.addEventListener('click', openSkills);
  skillsClose.addEventListener('click', closeSkills);
  skillsOverlay.addEventListener('click', handleSkillsBackdropClick);
  document.addEventListener('keydown', handleSkillsEscape);
  modelPill.addEventListener('click', handleModelPillToggle);
  modelDropdownMenu.addEventListener('click', handleModelSelect);
  document.addEventListener('click', handleModelDropdownOutsideClick);
  modelSelect.addEventListener('change', function () {
    updateModelPill(modelSelect.value);
    localStorage.setItem(STORAGE_KEYS.model, modelSelect.value);
  });

  sendBtn.addEventListener('click', function () {
    if (streaming && abortController) {
      abortController.abort();
    } else {
      send();
    }
  });

  attachBtn.addEventListener('click', handleAttachClick);
  fileInput.addEventListener('change', handleFileSelect);
  imageRemoveBtn.addEventListener('click', handleImageRemove);

  // ── Drag & Drop ──
  var dropZones = [messagesEl, document.querySelector('.input-wrapper')];
  var dragCounter = 0;

  function handleDragEnter(e) {
    e.preventDefault();
    dragCounter++;
    document.body.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dragCounter = 0;
      document.body.classList.remove('drag-over');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounter = 0;
    document.body.classList.remove('drag-over');

    var files = e.dataTransfer.files;
    if (!files.length) return;

    var file = files[0];
    if (!file.type.startsWith('image/')) return;

    fileToBase64(file).then(function (base64) {
      showImagePreview(file, base64);
    });
  }

  dropZones.forEach(function (zone) {
    if (!zone) return;
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', handleDrop);
  });

  // Thinking pill click handler (delegated)
  messagesEl.addEventListener('click', function (e) {
    var pill = e.target.closest('.thinking-pill');
    if (!pill) return;
    var body = pill.nextElementSibling;
    if (body && body.classList.contains('thinking-body')) {
      body.classList.toggle('visible');
      pill.classList.toggle('expanded');
    }
  });

  // Copy button click handler (delegated)
  messagesEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    var code = btn.getAttribute('data-code');
    if (code !== null) {
      copyCode(code);
    }
  });

  // ── Expose copyCode globally ──
  window.__copyCode = copyCode;
  window.rawCodeBlocks = codeBlocks;

  // ── Initialization ──
  initTheme();
  loadSavedConfig();
  initSkills();
  updateModelPill(modelSelect.value);
  var savedPrompt = localStorage.getItem(STORAGE_KEYS.systemPrompt);
  var fullSystemPrompt = [];
  var skillsContent = getEnabledSkillsContent();
  if (skillsContent) {
    fullSystemPrompt.push(skillsContent);
  }
  if (savedPrompt) {
    fullSystemPrompt.push(savedPrompt);
  }
  if (fullSystemPrompt.length > 0) {
    conversation.push({ role: 'system', content: fullSystemPrompt.join('\n\n---\n\n') });
  }
  createEmptyState();
  checkConnection();
  userInput.focus();

})();
