const state = {
  sessions: [],
  selectedSessionId: null,
  query: "",
  sourceFilter: "",
  favoritesOnly: false,
  includeArchived: false,
  embedSidebarOpen: false,
  compactEmbed: false,
  activeDrawerSection: "sidebar-overview"
};

const isEmbedMode = new URLSearchParams(window.location.search).get("embed") === "1";
const pendingHostRequests = new Map();
let loadSequence = 0;
let searchTimer = null;

const elements = {
  stats: document.querySelector("#stats"),
  statusStrip: document.querySelector("#status-strip"),
  scanButton: document.querySelector("#scan-button"),
  searchInput: document.querySelector("#search-input"),
  favoritesOnly: document.querySelector("#favorites-only"),
  includeArchived: document.querySelector("#include-archived"),
  sessionList: document.querySelector("#session-list"),
  sessionCount: document.querySelector("#session-count"),
  listState: document.querySelector("#list-state"),
  overviewSummary: document.querySelector("#overview-summary"),
  overviewFocus: document.querySelector("#overview-focus"),
  toastRegion: document.querySelector("#toast-region"),
  sessionDetail: document.querySelector("#session-detail"),
  embedActiveState: document.querySelector("#topbar-active-state"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarBackdrop: document.querySelector("#sidebar-backdrop"),
  sidebar: document.querySelector(".sidebar-drawer"),
  drawerResizer: document.querySelector("#drawer-resizer"),
  overviewSection: document.querySelector("#sidebar-overview"),
  sessionsSection: document.querySelector("#sidebar-sessions"),
  railButtons: Array.from(document.querySelectorAll("[data-scroll-target]")),
  openBrowserButton: document.querySelector("#open-browser-button")
};

const LAYOUT = {
  railWidth: 58,
  embedRailWidth: 54,
  minDrawerWidth: 248,
  maxDrawerWidth: 480,
  defaultDrawerWidth: 316,
  storageKey: "threadvault.drawerWidth"
};

const ICON_HINTS = {
  archive: "SVG: archive stack",
  brand: "SVG: vault door or archive box mark",
  browser: "SVG: external link",
  close: "SVG: x close mark",
  codex: "SVG: terminal prompt with small sparkle",
  copilot: "SVG: GitHub Copilot chat mark",
  claude: "SVG: Claude Code monogram or angular chat mark",
  export: "SVG: download arrow into tray",
  favorite: "SVG: star outline",
  favoriteFilled: "SVG: filled star",
  messages: "SVG: chat bubble stack",
  note: "SVG: pencil on note",
  openSource: "SVG: document with arrow",
  overview: "SVG: dashboard grid",
  process: "SVG: branching trace",
  restore: "SVG: archive tray with up arrow",
  sessions: "SVG: stacked chat threads",
  source: "SVG: connected nodes",
  status: "SVG: small status dot",
  workspace: "SVG: folder with arrow"
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function iconSlot(hintKey, className = "mini-icon-slot") {
  const hint = ICON_HINTS[hintKey] || hintKey;
  return `<span class="${className}" data-icon-hint="${escapeHtml(hint)}" title="${escapeHtml(hint)}" aria-hidden="true"></span>`;
}

function sourceIconKey(sourceId) {
  if (sourceId === "copilot") {
    return "copilot";
  }
  if (sourceId === "codex") {
    return "codex";
  }
  if (sourceId === "claude") {
    return "claude";
  }
  return "archive";
}

function basenameFromPath(value) {
  const text = String(value || "");
  if (!text) {
    return "";
  }

  const parts = text.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) || text;
}

function stripInternalContext(value) {
  return String(value || "")
    .replace(/<environment_context>[\s\S]*?(<\/environment_context>|$)/gi, " ")
    .replace(/<ide_opened_file>[\s\S]*?(<\/ide_opened_file>|$)/gi, " ")
    .replace(/<ide_selection>[\s\S]*?(<\/ide_selection>|$)/gi, " ")
    .replace(/<turn_aborted>[\s\S]*?(<\/turn_aborted>|$)/gi, " ")
    .replace(/<user_editable_context>[\s\S]*?(<\/user_editable_context>|$)/gi, " ")
    .trim();
}

function hasInternalContext(value) {
  return stripInternalContext(value) !== String(value || "");
}

function displayMessageContent(message) {
  if (message?.role === "tool" || message?.role === "system") {
    return String(message.content || "");
  }

  return stripInternalContext(message?.content || "");
}

if (isEmbedMode) {
  document.body.classList.add("embed-mode");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSavedDrawerWidth() {
  const saved = Number(window.localStorage.getItem(LAYOUT.storageKey));
  if (!Number.isFinite(saved)) {
    return LAYOUT.defaultDrawerWidth;
  }

  return clamp(saved, LAYOUT.minDrawerWidth, LAYOUT.maxDrawerWidth);
}

function setDrawerWidth(width, persist = true) {
  const nextWidth = clamp(Math.round(width), LAYOUT.minDrawerWidth, LAYOUT.maxDrawerWidth);
  document.documentElement.style.setProperty("--drawer-width", `${nextWidth}px`);
  document.body.style.setProperty("--drawer-width", `${nextWidth}px`);
  elements.drawerResizer?.setAttribute("aria-valuenow", String(nextWidth));

  if (persist) {
    window.localStorage.setItem(LAYOUT.storageKey, String(nextWidth));
  }
}

function resetDrawerWidth() {
  setDrawerWidth(LAYOUT.defaultDrawerWidth);
}

function drawerResizeAvailable() {
  return !state.compactEmbed && window.innerWidth > 920;
}

function initDrawerResize() {
  if (!elements.drawerResizer) {
    return;
  }

  elements.drawerResizer.setAttribute("role", "separator");
  elements.drawerResizer.setAttribute("aria-orientation", "vertical");
  elements.drawerResizer.setAttribute("aria-valuemin", String(LAYOUT.minDrawerWidth));
  elements.drawerResizer.setAttribute("aria-valuemax", String(LAYOUT.maxDrawerWidth));
  setDrawerWidth(getSavedDrawerWidth(), false);

  let dragState = null;

  const stopDragging = () => {
    if (!dragState) {
      return;
    }

    document.body.classList.remove("is-resizing-drawer");
    elements.drawerResizer.releasePointerCapture?.(dragState.pointerId);
    dragState = null;
  };

  elements.drawerResizer.addEventListener("pointerdown", (event) => {
    if (!drawerResizeAvailable()) {
      return;
    }

    const currentWidth = elements.sidebar?.getBoundingClientRect().width || getSavedDrawerWidth();
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: currentWidth
    };
    elements.drawerResizer.setPointerCapture?.(event.pointerId);
    document.body.classList.add("is-resizing-drawer");
    event.preventDefault();
  });

  elements.drawerResizer.addEventListener("pointermove", (event) => {
    if (!dragState) {
      return;
    }

    setDrawerWidth(dragState.startWidth + event.clientX - dragState.startX);
  });

  elements.drawerResizer.addEventListener("pointerup", stopDragging);
  elements.drawerResizer.addEventListener("pointercancel", stopDragging);
  elements.drawerResizer.addEventListener("dblclick", resetDrawerWidth);
  elements.drawerResizer.addEventListener("keydown", (event) => {
    if (!drawerResizeAvailable()) {
      return;
    }

    const currentWidth = elements.sidebar?.getBoundingClientRect().width || getSavedDrawerWidth();
    if (event.key === "ArrowLeft") {
      setDrawerWidth(currentWidth - (event.shiftKey ? 40 : 12));
      event.preventDefault();
    }
    if (event.key === "ArrowRight") {
      setDrawerWidth(currentWidth + (event.shiftKey ? 40 : 12));
      event.preventDefault();
    }
    if (event.key === "Home") {
      setDrawerWidth(LAYOUT.minDrawerWidth);
      event.preventDefault();
    }
    if (event.key === "End") {
      setDrawerWidth(LAYOUT.maxDrawerWidth);
      event.preventDefault();
    }
    if (event.key === "Enter") {
      resetDrawerWidth();
      event.preventDefault();
    }
  });
}

function updateEmbedLayoutState() {
  if (!isEmbedMode && window.innerWidth > 920) {
    state.compactEmbed = false;
    state.embedSidebarOpen = false;
    document.body.classList.remove("embed-compact", "sidebar-open");
    if (elements.sidebarBackdrop) {
      elements.sidebarBackdrop.hidden = true;
    }
    return;
  }

  const compact = isEmbedMode ? window.innerWidth <= 1180 : window.innerWidth <= 920;
  state.compactEmbed = compact;
  if (isEmbedMode) {
    document.body.classList.toggle("embed-compact", compact);
  }
  document.body.classList.toggle("sidebar-open", compact && state.embedSidebarOpen);

  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.hidden = !(compact && state.embedSidebarOpen);
  }

  if (!compact) {
    state.embedSidebarOpen = false;
    document.body.classList.remove("sidebar-open");
    if (elements.sidebarBackdrop) {
      elements.sidebarBackdrop.hidden = true;
    }
  }
}

function setEmbedSidebarOpen(nextOpen) {
  state.embedSidebarOpen = Boolean(nextOpen);
  updateEmbedLayoutState();
}

function updateRailButtons() {
  for (const button of elements.railButtons) {
    const isActive = button.getAttribute("data-scroll-target") === state.activeDrawerSection;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  }
}

function setActiveSidebarSection(sectionId) {
  state.activeDrawerSection = sectionId;
  updateRailButtons();
}

function scrollSidebarSection(sectionId) {
  const section = document.querySelector(`#${sectionId}`);
  if (!section || !elements.sidebar) {
    return;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest"
  });

  setActiveSidebarSection(sectionId);
  if (isEmbedMode && state.compactEmbed) {
    setEmbedSidebarOpen(true);
  }
}

function updateSidebarSectionByScroll() {
  if (!elements.sidebar || !elements.overviewSection || !elements.sessionsSection) {
    return;
  }

  const drawerTop = elements.sidebar.getBoundingClientRect().top;
  const overviewTop = Math.abs(elements.overviewSection.getBoundingClientRect().top - drawerTop);
  const sessionsTop = Math.abs(elements.sessionsSection.getBoundingClientRect().top - drawerTop);
  const nextSection = sessionsTop < overviewTop ? "sidebar-sessions" : "sidebar-overview";

  if (state.activeDrawerSection !== nextSection) {
    setActiveSidebarSection(nextSection);
  }
}

window.addEventListener("message", (event) => {
  const payload = event.data;
  if (!payload || payload.source !== "threadvault-host" || !payload.requestId) {
    return;
  }

  const pending = pendingHostRequests.get(payload.requestId);
  if (!pending) {
    return;
  }

  pendingHostRequests.delete(payload.requestId);
  window.clearTimeout(pending.timeoutId);

  if (payload.ok) {
    pending.resolve(payload);
    return;
  }

  pending.reject(new Error(payload.error || "Host action failed."));
});

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function postJson(url, payload) {
  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function runHostAction(type, payload) {
  if (!isEmbedMode || window.parent === window) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const requestId = `host-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeoutId = window.setTimeout(() => {
      pendingHostRequests.delete(requestId);
      reject(new Error("Timed out waiting for VS Code host response."));
    }, 8000);

    pendingHostRequests.set(requestId, {
      resolve,
      reject,
      timeoutId
    });

    window.parent.postMessage(
      {
        source: "threadvault-app",
        type,
        payload,
        requestId
      },
      "*"
    );
  });
}

function formatDate(isoString) {
  if (!isoString) {
    return "Unknown time";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function sanitizeSnippet(value) {
  const cleaned = stripInternalContext(String(value || "").replace(/<\/?mark>/gi, " "));
  return escapeHtml(cleaned)
    .replaceAll("&lt;mark&gt;", "<mark>")
    .replaceAll("&lt;/mark&gt;", "</mark>");
}

function tagHtml(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "";
  }

  return `<div class="tag-row">${tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function metaLine(parts) {
  return parts
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(" / ");
}

function showToast(message, tone = "info") {
  if (!elements.toastRegion) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.innerHTML = `
    <div class="toast-body">${escapeHtml(message)}</div>
    <button class="toast-close" type="button" aria-label="Dismiss notice">${iconSlot("close")}</button>
  `;

  const removeToast = () => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => {
      toast.remove();
    }, 180);
  };

  toast.querySelector(".toast-close")?.addEventListener("click", removeToast);
  elements.toastRegion.appendChild(toast);
  window.setTimeout(removeToast, 4200);
}

function messageBucket(messages) {
  const primary = [];
  const secondary = [];

  for (const message of messages || []) {
    if (message.role === "tool" || message.role === "system") {
      secondary.push(message);
      continue;
    }

    primary.push(message);
  }

  return { primary, secondary };
}

function buildTranscriptBlocks(messages) {
  const blocks = [];
  let currentAssistantBlock = null;

  for (const message of messages || []) {
    if (message.role === "assistant") {
      currentAssistantBlock = {
        kind: "assistant",
        message,
        details: []
      };
      blocks.push(currentAssistantBlock);
      continue;
    }

    if (message.role === "tool" || message.role === "system") {
      if (currentAssistantBlock) {
        currentAssistantBlock.details.push(message);
      } else {
        blocks.push({
          kind: "secondary",
          message
        });
      }
      continue;
    }

    currentAssistantBlock = null;
    blocks.push({
      kind: "primary",
      message
    });
  }

  return blocks;
}

function roleLabel(role) {
  if (role === "assistant") {
    return "Assistant";
  }
  if (role === "user") {
    return "User";
  }
  if (role === "system") {
    return "System";
  }
  if (role === "tool") {
    return "Process";
  }
  return role || "Message";
}

function messageInnerHtml(message) {
  const references = Array.isArray(message.referencedFiles) && message.referencedFiles.length
    ? `<div class="reference-list">${message.referencedFiles.map((file) => `<span class="reference-pill">${escapeHtml(file)}</span>`).join("")}</div>`
    : "";

  const content = displayMessageContent(message);

  return `
    <div class="message-heading">
      <h3>${escapeHtml(roleLabel(message.role))}</h3>
      <div class="detail-meta">${metaLine([formatDate(message.timestamp), message.model])}</div>
    </div>
    <pre>${escapeHtml(content)}</pre>
    ${references}
  `;
}

function renderMessageCard(message) {
  return `
    <article class="message-card" data-role="${escapeHtml(message.role)}">
      ${messageInnerHtml(message)}
    </article>
  `;
}

function renderTranscriptBlock(block) {
  if (block.kind === "assistant") {
    const detailPanel = block.details.length
      ? `
        <details class="inline-process-panel">
          <summary>
            <span>${iconSlot("process")} Process</span>
            <span class="process-count">${block.details.length}</span>
          </summary>
          <div class="inline-process-body">
            ${block.details.map(renderMessageCard).join("")}
          </div>
        </details>
      `
      : "";

    return `
      <article class="message-card assistant-cluster" data-role="assistant">
        <div class="message-main">
          ${messageInnerHtml(block.message)}
        </div>
        ${detailPanel}
      </article>
    `;
  }

  const visibleContent = displayMessageContent(block.message);
  if (
    block.message?.role === "tool" ||
    block.message?.role === "system" ||
    block.message?.metadata?.hiddenByDefault ||
    (!visibleContent && hasInternalContext(block.message?.content))
  ) {
    return `
      <details class="process-panel lazy-message" data-lazy-message-id="${escapeHtml(block.message.id)}">
        <summary>
          <span>${iconSlot("process")} ${escapeHtml(roleLabel(block.message.role))}</span>
          <span class="process-count">${escapeHtml(formatDate(block.message.timestamp))}</span>
        </summary>
        <div class="process-body"></div>
      </details>
    `;
  }

  return renderMessageCard(block.message);
}

function renderStats(stats) {
  const sourceCards = [
    {
      label: "Sessions",
      value: stats.sessionCount,
      active: state.sourceFilter === "",
      sourceId: "",
      caption: "All",
      icon: "archive"
    },
    {
      label: "Copilot",
      value: stats.copilotSessionCount,
      active: state.sourceFilter === "copilot",
      sourceId: "copilot",
      caption: "GitHub",
      icon: "copilot"
    },
    {
      label: "Codex",
      value: stats.codexSessionCount || 0,
      active: state.sourceFilter === "codex",
      sourceId: "codex",
      caption: "OpenAI",
      icon: "codex"
    },
    {
      label: "Claude",
      value: stats.claudeSessionCount || 0,
      active: state.sourceFilter === "claude",
      sourceId: "claude",
      caption: "Anthropic",
      icon: "claude"
    }
  ];

  elements.stats.innerHTML = sourceCards.map((card) => `
    <button class="source-chip ${card.active ? "is-active" : ""}" type="button" data-source-filter="${escapeHtml(card.sourceId)}">
      <div class="source-chip-top">
        <span class="source-chip-title">${escapeHtml(card.label)}</span>
        ${iconSlot(card.icon)}
      </div>
      <div class="source-chip-count">${card.value}</div>
      <div class="source-chip-foot">${escapeHtml(card.caption)}</div>
    </button>
  `).join("");

  for (const node of elements.stats.querySelectorAll("[data-source-filter]")) {
    node.addEventListener("click", () => {
      state.sourceFilter = node.getAttribute("data-source-filter") || "";
      setActiveSidebarSection("sidebar-sessions");
      elements.sessionsSection?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
      loadSessions().catch((error) => {
        showToast(String(error.message || error), "warning");
      });
    });
  }

  elements.statusStrip.innerHTML = `
    <div class="status-pill">
      ${iconSlot("messages")}
      <span class="status-pill-label">Messages</span>
      <span class="status-pill-value">${stats.messageCount}</span>
    </div>
    <button class="status-pill is-filter ${state.favoritesOnly ? "is-active" : ""}" type="button" data-status-filter="favorites">
      ${iconSlot("favorite")}
      <span class="status-pill-label">Favorites</span>
      <span class="status-pill-value">${stats.favoriteCount}</span>
    </button>
    <button class="status-pill is-filter ${state.includeArchived ? "is-active" : ""}" type="button" data-status-filter="archived">
      ${iconSlot("restore")}
      <span class="status-pill-label">Archived</span>
      <span class="status-pill-value">${stats.archivedCount}</span>
    </button>
  `;

  for (const node of elements.statusStrip.querySelectorAll("[data-status-filter]")) {
    node.addEventListener("click", () => {
      const filter = node.getAttribute("data-status-filter");
      if (filter === "favorites") {
        elements.favoritesOnly.checked = !elements.favoritesOnly.checked;
        state.favoritesOnly = elements.favoritesOnly.checked;
      }

      if (filter === "archived") {
        elements.includeArchived.checked = !elements.includeArchived.checked;
        state.includeArchived = elements.includeArchived.checked;
      }

      setActiveSidebarSection("sidebar-sessions");
      elements.sessionsSection?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
      loadSessions().catch((error) => {
        showToast(String(error.message || error), "warning");
      });
    });
  }

  const summary = `${stats.sessionCount} sessions / ${stats.messageCount} messages`;
  if (elements.overviewSummary) {
    elements.overviewSummary.textContent = summary;
  }

  if (elements.overviewFocus) {
    elements.overviewFocus.textContent = currentListStateLabel();
  }
}

function renderSessionList() {
  elements.sessionCount.textContent = String(state.sessions.length);
  const stateLabel = currentListStateLabel();

  if (elements.listState) {
    elements.listState.textContent = stateLabel;
  }
  if (elements.embedActiveState) {
    elements.embedActiveState.textContent = stateLabel;
  }
  if (elements.overviewFocus) {
    elements.overviewFocus.textContent = stateLabel;
  }

  if (state.sessions.length === 0) {
    elements.sessionList.innerHTML = `
      <div class="empty-panel">
        <h3>No sessions</h3>
        <p>Nothing matched the current view.</p>
      </div>
    `;
    return;
  }

  elements.sessionList.innerHTML = state.sessions.map((session) => {
    const activeClass = session.id === state.selectedSessionId ? "active" : "";
    const preview = stripInternalContext(session.searchSnippet || session.summary || "");
    const favorite = session.annotation?.favorite
      ? `<span class="favorite-indicator" title="${escapeHtml(ICON_HINTS.favoriteFilled)}">${iconSlot("favoriteFilled")}</span>`
      : "";
    const tags = tagHtml(session.annotation?.tags || []);

    return `
      <article class="session-item ${activeClass}" data-session-id="${escapeHtml(session.id)}">
        <div class="session-title-row">
          <h3>${escapeHtml(session.title)}</h3>
          ${favorite}
        </div>
        <div class="session-source-pill">
          ${iconSlot(sourceIconKey(session.sourceId))}
          <span>${escapeHtml(session.sourceLabel)}</span>
        </div>
        <div class="session-meta">
          ${metaLine([
            session.workspaceName || "No workspace",
            formatDate(session.updatedAt || session.createdAt)
          ])}
        </div>
        <div class="session-summary">${sanitizeSnippet(preview)}</div>
        ${tags}
      </article>
    `;
  }).join("");

  for (const node of elements.sessionList.querySelectorAll(".session-item")) {
    node.addEventListener("click", () => {
      const sessionId = node.getAttribute("data-session-id");
      selectSession(sessionId);
      if (isEmbedMode && state.compactEmbed) {
        setEmbedSidebarOpen(false);
      }
    });
  }
}

function annotationPanelHtml(tagValue, noteValue) {
  return `
    <details class="annotation-panel">
      <summary>
        <span class="summary-label">${iconSlot("note")} Notes</span>
        <span class="annotation-summary">${escapeHtml(tagValue || noteValue ? "Saved" : "Empty")}</span>
      </summary>
      <div class="annotation-content">
        <div class="annotation-grid">
          <input class="annotation-input" id="tag-input" type="text" value="${escapeHtml(tagValue)}" placeholder="Tags" />
          <textarea class="annotation-textarea" id="note-input" placeholder="Note">${escapeHtml(noteValue)}</textarea>
        </div>
        <div class="annotation-actions">
          <button class="secondary-button action-button" id="save-note-button" type="button">
            ${iconSlot("note")}
            <span>Save</span>
          </button>
        </div>
        <div class="inline-status" id="annotation-status"></div>
      </div>
    </details>
  `;
}

function renderSessionDetail(session) {
  const favoriteLabel = session.annotation?.favorite ? "Unfavorite" : "Favorite";
  const archiveLabel = session.annotation?.archived ? "Restore" : "Archive";
  const archiveIcon = session.annotation?.archived ? "restore" : "archive";
  const tagValue = Array.isArray(session.annotation?.tags) ? session.annotation.tags.join(", ") : "";
  const noteValue = session.annotation?.noteText || "";
  const blocks = buildTranscriptBlocks(session.messages);
  const { secondary } = messageBucket(session.messages);
  const messageHtml = blocks.map(renderTranscriptBlock).join("");
  const canOpenWorkspace = Boolean(session.workspacePath);
  const processHtml = secondary.length
    ? `
      <details class="process-panel">
        <summary>
          <span>${iconSlot("process")} Raw stream</span>
          <span class="process-count">${secondary.length}</span>
        </summary>
        <div class="process-body">
          ${secondary.map(renderMessageCard).join("")}
        </div>
      </details>
    `
    : "";

  elements.sessionDetail.classList.remove("empty-state");
  elements.sessionDetail.innerHTML = `
    <header class="detail-header">
      <div class="detail-hero">
        <div class="detail-title-group">
          <p class="eyebrow">${escapeHtml(session.sourceLabel)}</p>
          <h2 title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</h2>
          <div class="detail-meta">
            ${metaLine([
              session.workspaceName || "No workspace",
              session.status || "unknown",
              `Updated ${formatDate(session.updatedAt || session.createdAt)}`
            ])}
          </div>
          <div class="detail-meta source-path">Source: ${escapeHtml(basenameFromPath(session.sourcePath) || "Unknown")}</div>
        </div>
        <div class="detail-status-stack">
          ${iconSlot(sourceIconKey(session.sourceId), "icon-slot utility-slot")}
        </div>
      </div>
      <div class="detail-badges">
        <div class="detail-badge">
          ${iconSlot(sourceIconKey(session.sourceId))}
          <span>${escapeHtml(session.sourceLabel)}</span>
        </div>
        <div class="detail-badge">
          ${iconSlot("workspace")}
          <span>${escapeHtml(session.workspaceName || "No workspace")}</span>
        </div>
      </div>
      ${tagHtml(session.annotation?.tags || [])}
      <div class="detail-toolbar">
        <div class="detail-actions">
          <button class="secondary-button action-button" type="button" data-action="open-source" title="Open original transcript file">
            ${iconSlot("openSource")}
            <span>Source</span>
          </button>
          <button class="secondary-button action-button" type="button" data-action="open-workspace" ${canOpenWorkspace ? "" : "disabled"} title="${canOpenWorkspace ? "Open linked workspace" : "No workspace path found"}">
            ${iconSlot("workspace")}
            <span>Workspace</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="favorite-toggle" title="Toggle favorite">
            ${iconSlot(session.annotation?.favorite ? "favoriteFilled" : "favorite")}
            <span>${favoriteLabel}</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="archive-toggle" title="Toggle archive">
            ${iconSlot(archiveIcon)}
            <span>${archiveLabel}</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="export-markdown" title="Export Markdown">
            ${iconSlot("export")}
            <span>Export</span>
          </button>
        </div>
      </div>
      ${annotationPanelHtml(tagValue, noteValue)}
    </header>
    <section class="detail-body">
      <div class="transcript-shell">
        <div class="transcript-header">
          <h3 class="transcript-title">Transcript</h3>
          ${iconSlot("messages", "icon-slot transcript-slot")}
        </div>
        ${messageHtml || `<p class="muted">No transcript messages were parsed for this session.</p>`}
        ${processHtml}
      </div>
    </section>
  `;

  elements.sessionDetail.querySelector("#save-note-button")?.addEventListener("click", async () => {
    const tags = elements.sessionDetail.querySelector("#tag-input").value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const noteText = elements.sessionDetail.querySelector("#note-input").value;
    await saveAnnotation(session.id, { tags, noteText });
    showToast("Saved.", "success");
  });

  const messageById = new Map((session.messages || []).map((message) => [message.id, message]));
  for (const details of elements.sessionDetail.querySelectorAll(".lazy-message")) {
    details.addEventListener("toggle", () => {
      if (!details.open || details.dataset.loaded === "1") {
        return;
      }

      const message = messageById.get(details.getAttribute("data-lazy-message-id"));
      const body = details.querySelector(".process-body");
      if (!message || !body) {
        return;
      }

      body.innerHTML = renderMessageCard(message);
      details.dataset.loaded = "1";
    });
  }

  elements.sessionDetail.onclick = async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) {
      return;
    }

    const status = elements.sessionDetail.querySelector("#annotation-status");
    const action = button.getAttribute("data-action");
    const originalLabel = button.querySelector("span:last-child")?.textContent || "";

    const setBusy = (text) => {
      button.disabled = true;
      const label = button.querySelector("span:last-child");
      if (label) {
        label.textContent = text;
      }
    };

    const resetBusy = () => {
      button.disabled = false;
      const label = button.querySelector("span:last-child");
      if (label) {
        label.textContent = originalLabel;
      }
    };

    if (action === "open-source") {
      try {
        if (!session.sourcePath) {
          showToast("Source path is missing.", "warning");
          return;
        }

        setBusy("Opening");
        const result = isEmbedMode
          ? await runHostAction("threadvault-open-path", {
            path: session.sourcePath,
            target: "source"
          })
          : await postJson("/api/open", { path: session.sourcePath });

        if (!result?.ok) {
          showToast(result?.error || "Unable to open source file.", "warning");
        } else {
          const message = result.message || "Source opened.";
          if (status) {
            status.textContent = message;
          }
          showToast(message, "success");
        }
      } catch (error) {
        showToast(String(error.message || error), "warning");
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "open-workspace") {
      try {
        if (!session.workspacePath) {
          showToast("Workspace path is missing.", "warning");
          return;
        }

        setBusy("Opening");
        const result = isEmbedMode
          ? await runHostAction("threadvault-open-path", {
            path: session.workspacePath,
            target: "workspace"
          })
          : await postJson("/api/open", { path: session.workspacePath });

        if (!result?.ok) {
          showToast(result?.error || "Unable to open workspace.", "warning");
        } else {
          const message = result.message || "Workspace open request sent.";
          if (status) {
            status.textContent = message;
          }
          showToast(message, "success");
        }
      } catch (error) {
        showToast(String(error.message || error), "warning");
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "favorite-toggle") {
      try {
        setBusy("Saving");
        await saveAnnotation(session.id, {
          favorite: !session.annotation?.favorite
        });
        showToast("Saved.", "success");
      } catch (error) {
        resetBusy();
        showToast(String(error.message || error), "warning");
      }
      return;
    }

    if (action === "archive-toggle") {
      if (!session.annotation?.archived) {
        const confirmed = window.confirm("Archive this session?");
        if (!confirmed) {
          return;
        }
      }

      try {
        setBusy("Saving");
        await saveAnnotation(session.id, {
          archived: !session.annotation?.archived
        });
        showToast("Saved.", "success");
      } catch (error) {
        resetBusy();
        showToast(String(error.message || error), "warning");
      }
      return;
    }

    if (action === "export-markdown") {
      setBusy("Exporting");
      try {
        const result = await postJson("/api/export", { sessionId: session.id });
        if (!result.ok) {
          showToast(result.error || "Export failed.", "warning");
          return;
        }
        if (status) {
          status.textContent = `Exported to ${result.path}`;
        }
        showToast(`Exported to ${result.path}`, "success");
      } catch (error) {
        showToast(String(error.message || error), "warning");
      } finally {
        resetBusy();
      }
    }
  };
}

function currentListStateLabel() {
  const segments = [];

  if (state.sourceFilter) {
    segments.push(state.sourceFilter.charAt(0).toUpperCase() + state.sourceFilter.slice(1));
  } else {
    segments.push("All sources");
  }

  if (state.favoritesOnly) {
    segments.push("Favorites");
  }

  if (state.includeArchived) {
    segments.push("With archived");
  }

  if (state.query) {
    segments.push(`Search: "${state.query}"`);
  }

  return segments.join(" / ");
}

async function loadSessions() {
  const sequence = ++loadSequence;
  const params = new URLSearchParams();
  if (state.query) {
    params.set("q", state.query);
  }
  if (state.sourceFilter) {
    params.set("sourceId", state.sourceFilter);
  }
  if (state.favoritesOnly) {
    params.set("favoritesOnly", "1");
  }
  if (state.includeArchived) {
    params.set("includeArchived", "1");
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const payload = await requestJson(`/api/sessions${query}`);
  if (sequence !== loadSequence) {
    return;
  }

  state.sessions = payload.sessions || [];
  renderStats(payload.stats || {});

  if (!state.selectedSessionId && state.sessions.length > 0) {
    state.selectedSessionId = state.sessions[0].id;
  }

  if (state.selectedSessionId && !state.sessions.find((session) => session.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0]?.id || null;
  }

  renderSessionList();

  if (state.selectedSessionId) {
    await selectSession(state.selectedSessionId, false);
  } else {
    elements.sessionDetail.classList.add("empty-state");
    elements.sessionDetail.innerHTML = `
      <h2>Select a session</h2>
      <p class="muted">No session is selected.</p>
    `;
  }
}

async function saveAnnotation(sessionId, payload) {
  const status = elements.sessionDetail.querySelector("#annotation-status");
  if (status) {
    status.textContent = "Saving...";
  }

  const result = await postJson("/api/session-meta", {
    sessionId,
    ...payload
  });

  if (!result.ok) {
    throw new Error(result.error || "Annotation save failed.");
  }

  await loadSessions();

  const nextStatus = elements.sessionDetail.querySelector("#annotation-status");
  if (nextStatus) {
    nextStatus.textContent = "Saved.";
  }
}

async function selectSession(sessionId, rerenderList = true) {
  if (!sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
  if (rerenderList) {
    renderSessionList();
  }

  const session = await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
  renderSessionDetail(session);
}

async function runScan() {
  elements.scanButton.disabled = true;
  elements.scanButton.textContent = "Scanning";
  try {
    const result = await requestJson("/api/scan", { method: "POST" });
    await loadSessions();
    const status = [
      `Imported ${result.importedSessions || 0}`,
      `updated ${result.updatedSessions || 0}`,
      `skipped ${result.skippedSessions || 0}`
    ].join(", ");
    showToast(status, "success");
  } finally {
    elements.scanButton.disabled = false;
    elements.scanButton.textContent = "Rescan";
  }
}

elements.scanButton.addEventListener("click", () => {
  runScan().catch((error) => {
    showToast(String(error.message || error), "warning");
  });
});

elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim();
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    loadSessions().catch((error) => {
      showToast(String(error.message || error), "warning");
    });
  }, 140);
});

elements.favoritesOnly.addEventListener("change", () => {
  state.favoritesOnly = elements.favoritesOnly.checked;
  loadSessions().catch((error) => {
    showToast(String(error.message || error), "warning");
  });
});

elements.includeArchived.addEventListener("change", () => {
  state.includeArchived = elements.includeArchived.checked;
  loadSessions().catch((error) => {
    showToast(String(error.message || error), "warning");
  });
});

elements.sidebarToggle?.addEventListener("click", () => {
  setEmbedSidebarOpen(!state.embedSidebarOpen);
});

elements.sidebarBackdrop?.addEventListener("click", () => {
  setEmbedSidebarOpen(false);
});

elements.openBrowserButton?.addEventListener("click", async () => {
  const button = elements.openBrowserButton;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Opening";
  try {
    if (isEmbedMode) {
      const result = await runHostAction("threadvault-open-browser", {});
      const status = elements.sessionDetail.querySelector("#annotation-status");
      if (status && result?.message) {
        status.textContent = result.message;
      }
      if (result?.message) {
        showToast(result.message, "success");
      }
    } else {
      window.open(window.location.origin, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    showToast(String(error.message || error), "warning");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});

for (const button of elements.railButtons) {
  button.addEventListener("click", () => {
    const sectionId = button.getAttribute("data-scroll-target");
    if (!sectionId) {
      return;
    }

    if (state.activeDrawerSection === sectionId && state.embedSidebarOpen && state.compactEmbed) {
      setEmbedSidebarOpen(false);
      return;
    }

    scrollSidebarSection(sectionId);
  });
}

elements.sidebar?.addEventListener("scroll", updateSidebarSectionByScroll);
window.addEventListener("resize", updateEmbedLayoutState);

initDrawerResize();
updateRailButtons();
setEmbedSidebarOpen(false);
updateEmbedLayoutState();

loadSessions().catch((error) => {
  elements.sessionDetail.innerHTML = `
    <h2>Failed to load</h2>
    <p>${escapeHtml(String(error.message || error))}</p>
  `;
});
