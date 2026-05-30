const state = {
  sessions: [],
  selectedSessionId: null,
  query: "",
  favoritesOnly: false,
  includeArchived: false
};

const isEmbedMode = new URLSearchParams(window.location.search).get("embed") === "1";

const elements = {
  stats: document.querySelector("#stats"),
  scanButton: document.querySelector("#scan-button"),
  searchInput: document.querySelector("#search-input"),
  favoritesOnly: document.querySelector("#favorites-only"),
  includeArchived: document.querySelector("#include-archived"),
  sessionList: document.querySelector("#session-list"),
  sessionCount: document.querySelector("#session-count"),
  sessionDetail: document.querySelector("#session-detail")
};

const UI = {
  separator: " • ",
  favoriteStar: "★"
};

if (isEmbedMode) {
  document.body.classList.add("embed-mode");
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
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

function formatDate(isoString) {
  if (!isoString) {
    return "Unknown time";
  }
  return new Date(isoString).toLocaleString();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeSnippet(value) {
  return escapeHtml(value || "")
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
    .join(UI.separator);
}

function renderStats(stats) {
  elements.stats.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Sessions</span>
      <div class="stat-value">${stats.sessionCount}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Messages</span>
      <div class="stat-value">${stats.messageCount}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Copilot Sessions</span>
      <div class="stat-value">${stats.copilotSessionCount}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Favorites</span>
      <div class="stat-value">${stats.favoriteCount}</div>
    </div>
    <div class="stat-card">
      <span class="stat-label">Archived</span>
      <div class="stat-value">${stats.archivedCount}</div>
    </div>
  `;
}

function renderSessionList() {
  elements.sessionCount.textContent = String(state.sessions.length);

  if (state.sessions.length === 0) {
    elements.sessionList.innerHTML = `<p class="muted">No sessions found.</p>`;
    return;
  }

  elements.sessionList.innerHTML = state.sessions
    .map((session) => {
      const activeClass = session.id === state.selectedSessionId ? "active" : "";
      const preview = session.searchSnippet || escapeHtml(session.summary || "");
      const favorite = session.annotation?.favorite
        ? `<span class="favorite-star" aria-label="Favorite">${UI.favoriteStar}</span>`
        : "";
      const tags = tagHtml(session.annotation?.tags || []);

      return `
        <article class="session-item ${activeClass}" data-session-id="${session.id}">
          <div class="session-title-row">
            <h3>${escapeHtml(session.title)}</h3>
            ${favorite}
          </div>
          <div class="session-meta">
            ${metaLine([
              session.sourceLabel,
              session.workspaceName || "No workspace",
              formatDate(session.updatedAt || session.createdAt)
            ])}
          </div>
          <div class="session-summary">${sanitizeSnippet(preview)}</div>
          ${tags}
        </article>
      `;
    })
    .join("");

  for (const node of elements.sessionList.querySelectorAll(".session-item")) {
    node.addEventListener("click", () => {
      const sessionId = node.getAttribute("data-session-id");
      selectSession(sessionId);
    });
  }
}

function renderSessionDetail(session) {
  const favoriteLabel = session.annotation?.favorite ? "Remove favorite" : "Add favorite";
  const archiveLabel = session.annotation?.archived ? "Restore session" : "Archive session";
  const tagValue = Array.isArray(session.annotation?.tags) ? session.annotation.tags.join(", ") : "";
  const noteValue = session.annotation?.noteText || "";
  const annotationPanel = isEmbedMode
    ? `
      <details class="annotation-panel">
        <summary>Local annotation</summary>
        <div class="annotation-content">
          <p class="field-label">Personal archive metadata</p>
          <div class="annotation-grid">
            <input class="annotation-input" id="tag-input" type="text" value="${escapeHtml(tagValue)}" placeholder="tags, like debugging, setup, prompt-pattern" />
            <textarea class="annotation-textarea" id="note-input" placeholder="Write your own note about why this thread matters.">${escapeHtml(noteValue)}</textarea>
          </div>
          <div class="annotation-actions">
            <button class="primary-button" id="save-note-button">Save annotation</button>
          </div>
          <div class="inline-status" id="annotation-status">Annotations stay local and persist across rescans.</div>
        </div>
      </details>
    `
    : `
      <section class="annotation-panel">
        <p class="field-label">Personal archive metadata</p>
        <div class="annotation-grid">
          <input class="annotation-input" id="tag-input" type="text" value="${escapeHtml(tagValue)}" placeholder="tags, like debugging, setup, prompt-pattern" />
          <textarea class="annotation-textarea" id="note-input" placeholder="Write your own note about why this thread matters.">${escapeHtml(noteValue)}</textarea>
        </div>
        <div class="annotation-actions">
          <button class="primary-button" id="save-note-button">Save annotation</button>
        </div>
        <div class="inline-status" id="annotation-status">Annotations stay local and persist across rescans.</div>
      </section>
    `;

  const messageHtml = session.messages
    .map((message) => {
      const references = Array.isArray(message.referencedFiles) && message.referencedFiles.length
        ? `<div class="reference-list">${message.referencedFiles.map((file) => `<span class="reference-pill">${escapeHtml(file)}</span>`).join("")}</div>`
        : "";

      return `
        <article class="message-card" data-role="${message.role}">
          <h3>${escapeHtml(message.role)}</h3>
          <div class="detail-meta">${metaLine([formatDate(message.timestamp), message.model])}</div>
          <pre>${escapeHtml(message.content)}</pre>
          ${references}
        </article>
      `;
    })
    .join("");

  elements.sessionDetail.classList.remove("empty-state");
  elements.sessionDetail.innerHTML = `
    <header class="detail-header">
      <p class="eyebrow">${escapeHtml(session.sourceLabel)}</p>
      <h2>${escapeHtml(session.title)}</h2>
      <div class="detail-meta">
        ${metaLine([
          session.workspaceName || "No workspace",
          session.status || "unknown",
          `Updated ${formatDate(session.updatedAt || session.createdAt)}`
        ])}
      </div>
      <div class="detail-meta">Source file: ${escapeHtml(session.sourcePath || "Unknown")}</div>
      ${tagHtml(session.annotation?.tags || [])}
      <div class="detail-actions">
        <button class="secondary-button" data-action="open-source">Open source file in VS Code</button>
        <button class="secondary-button" data-action="open-workspace" ${session.workspacePath ? "" : "disabled"}>Open workspace in VS Code</button>
        <button class="secondary-button" data-action="favorite-toggle">${favoriteLabel}</button>
        <button class="secondary-button" data-action="archive-toggle">${archiveLabel}</button>
        <button class="secondary-button" data-action="export-markdown">Export Markdown</button>
      </div>
      ${annotationPanel}
    </header>
    <section class="detail-body">
      ${messageHtml || `<p class="muted">No transcript messages were parsed for this session.</p>`}
    </section>
  `;

  elements.sessionDetail.querySelector('[data-action="open-source"]')?.addEventListener("click", async () => {
    const result = await postJson("/api/open", { path: session.sourcePath });
    if (!result.ok) {
      alert(result.error || "Unable to open source file.");
    }
  });

  elements.sessionDetail.querySelector('[data-action="open-workspace"]')?.addEventListener("click", async () => {
    const result = await postJson("/api/open", { path: session.workspacePath });
    if (!result.ok) {
      alert(result.error || "Unable to open workspace.");
    }
  });

  elements.sessionDetail.querySelector('[data-action="favorite-toggle"]')?.addEventListener("click", async () => {
    await saveAnnotation(session.id, {
      favorite: !session.annotation?.favorite
    });
  });

  elements.sessionDetail.querySelector('[data-action="archive-toggle"]')?.addEventListener("click", async () => {
    await saveAnnotation(session.id, {
      archived: !session.annotation?.archived
    });
  });

  elements.sessionDetail.querySelector('[data-action="export-markdown"]')?.addEventListener("click", async () => {
    const result = await postJson("/api/export", { sessionId: session.id });
    if (!result.ok) {
      alert(result.error || "Export failed.");
      return;
    }
    const status = elements.sessionDetail.querySelector("#annotation-status");
    status.textContent = `Exported to ${result.path}`;
  });

  elements.sessionDetail.querySelector("#save-note-button")?.addEventListener("click", async () => {
    const tags = elements.sessionDetail.querySelector("#tag-input").value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const noteText = elements.sessionDetail.querySelector("#note-input").value;
    await saveAnnotation(session.id, { tags, noteText });
  });
}

async function loadSessions() {
  const params = new URLSearchParams();
  if (state.query) {
    params.set("q", state.query);
  }
  if (state.favoritesOnly) {
    params.set("favoritesOnly", "1");
  }
  if (state.includeArchived) {
    params.set("includeArchived", "1");
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const payload = await requestJson(`/api/sessions${query}`);
  state.sessions = payload.sessions;
  renderStats(payload.stats);

  if (!state.selectedSessionId && state.sessions.length > 0) {
    state.selectedSessionId = state.sessions[0].id;
  }

  if (state.selectedSessionId && !state.sessions.find((session) => session.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0]?.id || null;
  }

  renderSessionList();

  if (state.selectedSessionId) {
    await selectSession(state.selectedSessionId, false);
  }
}

async function saveAnnotation(sessionId, payload) {
  const status = elements.sessionDetail.querySelector("#annotation-status");
  if (status) {
    status.textContent = "Saving annotation...";
  }

  await postJson("/api/session-meta", {
    sessionId,
    ...payload
  });

  await loadSessions();

  const nextStatus = elements.sessionDetail.querySelector("#annotation-status");
  if (nextStatus) {
    nextStatus.textContent = "Annotation saved locally.";
  }
}

async function selectSession(sessionId, rerenderList = true) {
  state.selectedSessionId = sessionId;
  if (rerenderList) {
    renderSessionList();
  }
  const session = await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
  renderSessionDetail(session);
}

async function runScan() {
  elements.scanButton.disabled = true;
  elements.scanButton.textContent = "Scanning...";
  try {
    await requestJson("/api/scan", { method: "POST" });
    await loadSessions();
  } finally {
    elements.scanButton.disabled = false;
    elements.scanButton.textContent = "Rescan Copilot History";
  }
}

elements.scanButton.addEventListener("click", () => {
  runScan().catch((error) => {
    console.error(error);
    alert("Rescan failed. Check the server terminal for details.");
  });
});

elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim();
  loadSessions().catch((error) => {
    console.error(error);
  });
});

elements.favoritesOnly.addEventListener("change", () => {
  state.favoritesOnly = elements.favoritesOnly.checked;
  loadSessions().catch((error) => {
    console.error(error);
  });
});

elements.includeArchived.addEventListener("change", () => {
  state.includeArchived = elements.includeArchived.checked;
  loadSessions().catch((error) => {
    console.error(error);
  });
});

loadSessions().catch((error) => {
  console.error(error);
  elements.sessionDetail.innerHTML = `
    <h2>Failed to load ThreadVault</h2>
    <p>${escapeHtml(String(error.message || error))}</p>
  `;
});
