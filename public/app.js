const SETTINGS = {
  storageKey: "threadvault.settings",
  defaults: {
    theme: "light",
    language: "en"
  },
  options: {
    theme: ["light", "dim"],
    language: ["en", "zh"]
  }
};

const I18N = {
  en: {
    all: "All",
    allSources: "All sources",
    archiveAction: "Archive",
    archiveReady: "Your local archive is ready.",
    archived: "Archived",
    assistantRole: "Assistant",
    brandEyebrow: "Local AI Archive",
    closeSettings: "Close settings",
    copyLink: "Copy link",
    copying: "Copying",
    copyFailed: "Unable to copy link.",
    copySuccess: "Session link copied.",
    currentFocus: "Current focus",
    dismissNotice: "Dismiss notice",
    drawerResize: "Resize session library",
    drawerResizeTitle: "Drag to resize the session library",
    empty: "Empty",
    export: "Export",
    exportedTo: "Exported to",
    exporting: "Exporting",
    exportFailed: "Export failed.",
    favoriteAction: "Favorite",
    favorites: "Favorites",
    filters: "Filters",
    language: "Language",
    library: "Library",
    librarySnapshot: "Library snapshot",
    libraryTotal: "Library total",
    loadFailed: "Failed to load",
    memoryFailed: "Memory save failed.",
    memorySaved: "Saved to memory",
    messages: "messages",
    saveMemory: "Memory",
    saveMemoryTitle: "Save to memory",
    openInBrowser: "Open in browser",
    opening: "Opening",
    overview: "Overview",
    messageRole: "Message",
    hostActionFailed: "Host action failed.",
    hostTimeout: "Timed out waiting for VS Code host response.",
    openSourceFailed: "Unable to open source file.",
    openWorkspaceFailed: "Unable to open workspace.",
    processRole: "Process",
    protectedFavorite: "Favorites are protected. Unfavorite before archiving.",
    protectedFavoriteTitle: "Protected favorite. Unfavorite before archiving.",
    archiveConfirm: "Archive this session? It will be hidden from the default list, not deleted.",
    noSessionSelected: "No session is selected.",
    noSessionsMatched: "Nothing matched the current view.",
    noSessions: "No sessions",
    noTranscript: "No transcript messages were parsed for this session.",
    noWorkspace: "No workspace",
    note: "Note",
    notes: "Notes",
    quickFilters: "Quick filters",
    railBrand: "Vault",
    rawStream: "Raw stream",
    rescan: "Rescan",
    restoreAction: "Restore",
    requestFailed: "Request failed",
    save: "Save",
    saved: "Saved",
    saveFailed: "Annotation save failed.",
    scanImported: "Imported",
    scanSkipped: "skipped",
    scanUpdated: "updated",
    saving: "Saving",
    savingMemory: "Saving",
    scanning: "Scanning",
    search: "Search",
    searchPrefix: "Search",
    searchSessions: "Search sessions",
    selectSession: "Select a session",
    sessions: "Sessions",
    settings: "Settings",
    settingsKicker: "Appearance",
    sidebarClose: "Close session library",
    source: "Source",
    sourceFile: "Source file",
    sourceMissing: "Source path is missing.",
    sourceOpened: "Source opened.",
    sourcePath: "Source",
    sources: "Sources",
    systemRole: "System",
    tags: "Tags",
    theme: "Theme",
    themeDim: "Graphite",
    themeLight: "Light",
    transcript: "Transcript",
    unfavoriteAction: "Unfavorite",
    unknown: "unknown",
    unknownTime: "Unknown time",
    updated: "Updated",
    userRole: "User",
    waitingForSessions: "Waiting for local sessions to load.",
    withArchived: "With archived",
    workspace: "Workspace",
    workspaceMissing: "Workspace path is missing.",
    workspaceOpenRequested: "Workspace open request sent."
  },
  zh: {
    all: "\u5168\u90e8",
    allSources: "\u5168\u90e8\u6765\u6e90",
    archiveAction: "\u5f52\u6863",
    archiveReady: "\u672c\u5730\u4f1a\u8bdd\u5f52\u6863\u5df2\u5c31\u7eea\u3002",
    archived: "\u5df2\u5f52\u6863",
    assistantRole: "\u52a9\u624b",
    brandEyebrow: "\u672c\u5730 AI \u5f52\u6863",
    closeSettings: "\u5173\u95ed\u8bbe\u7f6e",
    copyLink: "\u590d\u5236\u94fe\u63a5",
    copying: "\u590d\u5236\u4e2d",
    copyFailed: "\u65e0\u6cd5\u590d\u5236\u94fe\u63a5\u3002",
    copySuccess: "\u4f1a\u8bdd\u94fe\u63a5\u5df2\u590d\u5236\u3002",
    currentFocus: "\u5f53\u524d\u8303\u56f4",
    dismissNotice: "\u5173\u95ed\u901a\u77e5",
    drawerResize: "\u8c03\u6574\u4f1a\u8bdd\u5e93\u5bbd\u5ea6",
    drawerResizeTitle: "\u62d6\u52a8\u4ee5\u8c03\u6574\u4f1a\u8bdd\u5e93\u5bbd\u5ea6",
    empty: "\u7a7a",
    export: "\u5bfc\u51fa",
    exportedTo: "\u5df2\u5bfc\u51fa\u5230",
    exporting: "\u5bfc\u51fa\u4e2d",
    exportFailed: "\u5bfc\u51fa\u5931\u8d25\u3002",
    favoriteAction: "\u6536\u85cf",
    favorites: "\u6536\u85cf",
    filters: "\u8fc7\u6ee4",
    language: "\u8bed\u8a00",
    library: "\u8d44\u6599\u5e93",
    librarySnapshot: "\u8d44\u6599\u5e93\u6982\u89c8",
    libraryTotal: "\u6d88\u606f\u603b\u91cf",
    loadFailed: "\u52a0\u8f7d\u5931\u8d25",
    memoryFailed: "\u6c89\u6dc0\u5931\u8d25\u3002",
    memorySaved: "\u5df2\u6c89\u6dc0\u5230",
    messages: "\u6761\u6d88\u606f",
    saveMemory: "\u6c89\u6dc0",
    saveMemoryTitle: "\u5c06\u8fd9\u6b21\u4f1a\u8bdd\u6c89\u6dc0\u4e3a Markdown",
    openInBrowser: "\u5728\u6d4f\u89c8\u5668\u6253\u5f00",
    opening: "\u6253\u5f00\u4e2d",
    overview: "\u6982\u89c8",
    messageRole: "\u6d88\u606f",
    hostActionFailed: "VS Code \u5bbf\u4e3b\u64cd\u4f5c\u5931\u8d25\u3002",
    hostTimeout: "\u7b49\u5f85 VS Code \u5bbf\u4e3b\u54cd\u5e94\u8d85\u65f6\u3002",
    openSourceFailed: "\u65e0\u6cd5\u6253\u5f00\u6e90\u6587\u4ef6\u3002",
    openWorkspaceFailed: "\u65e0\u6cd5\u6253\u5f00\u5de5\u4f5c\u533a\u3002",
    processRole: "\u8fc7\u7a0b",
    protectedFavorite: "\u5df2\u6536\u85cf\u7684\u4f1a\u8bdd\u53d7\u4fdd\u62a4\uff0c\u8bf7\u5148\u53d6\u6d88\u6536\u85cf\u518d\u5f52\u6863\u3002",
    protectedFavoriteTitle: "\u53d7\u4fdd\u62a4\u7684\u6536\u85cf\u4f1a\u8bdd\uff0c\u8bf7\u5148\u53d6\u6d88\u6536\u85cf\u518d\u5f52\u6863\u3002",
    archiveConfirm: "\u5f52\u6863\u8fd9\u4e2a\u4f1a\u8bdd\uff1f\u5b83\u4f1a\u4ece\u9ed8\u8ba4\u5217\u8868\u9690\u85cf\uff0c\u4f46\u4e0d\u4f1a\u88ab\u5220\u9664\u3002",
    noSessionSelected: "\u672a\u9009\u62e9\u4f1a\u8bdd\u3002",
    noSessionsMatched: "\u5f53\u524d\u89c6\u56fe\u6ca1\u6709\u5339\u914d\u7ed3\u679c\u3002",
    noSessions: "\u6ca1\u6709\u4f1a\u8bdd",
    noTranscript: "\u8fd9\u4e2a\u4f1a\u8bdd\u6682\u672a\u89e3\u6790\u5230\u53ef\u5c55\u793a\u7684\u6d88\u606f\u3002",
    noWorkspace: "\u65e0\u5de5\u4f5c\u533a",
    note: "\u5907\u6ce8",
    notes: "\u7b14\u8bb0",
    quickFilters: "\u5feb\u901f\u8fc7\u6ee4",
    railBrand: "Vault",
    rawStream: "\u539f\u59cb\u6d41",
    rescan: "\u91cd\u65b0\u626b\u63cf",
    restoreAction: "\u6062\u590d",
    requestFailed: "\u8bf7\u6c42\u5931\u8d25",
    save: "\u4fdd\u5b58",
    saved: "\u5df2\u4fdd\u5b58",
    saveFailed: "\u6807\u6ce8\u4fdd\u5b58\u5931\u8d25\u3002",
    scanImported: "\u5bfc\u5165",
    scanSkipped: "\u8df3\u8fc7",
    scanUpdated: "\u66f4\u65b0",
    saving: "\u4fdd\u5b58\u4e2d",
    savingMemory: "\u6c89\u6dc0\u4e2d",
    scanning: "\u626b\u63cf\u4e2d",
    search: "\u641c\u7d22",
    searchPrefix: "\u641c\u7d22",
    searchSessions: "\u641c\u7d22\u4f1a\u8bdd",
    selectSession: "\u9009\u62e9\u4e00\u4e2a\u4f1a\u8bdd",
    sessions: "\u4f1a\u8bdd",
    settings: "\u8bbe\u7f6e",
    settingsKicker: "\u5916\u89c2",
    sidebarClose: "\u5173\u95ed\u4f1a\u8bdd\u5e93",
    source: "\u6765\u6e90",
    sourceFile: "\u6e90\u6587\u4ef6",
    sourceMissing: "\u7f3a\u5c11\u6e90\u6587\u4ef6\u8def\u5f84\u3002",
    sourceOpened: "\u6e90\u6587\u4ef6\u5df2\u6253\u5f00\u3002",
    sourcePath: "\u6765\u6e90",
    sources: "\u6765\u6e90",
    systemRole: "\u7cfb\u7edf",
    tags: "\u6807\u7b7e",
    theme: "\u4e3b\u9898",
    themeDim: "\u77f3\u58a8",
    themeLight: "\u4eae\u8272",
    transcript: "\u8f6c\u5f55",
    unfavoriteAction: "\u53d6\u6d88\u6536\u85cf",
    unknown: "\u672a\u77e5",
    unknownTime: "\u672a\u77e5\u65f6\u95f4",
    updated: "\u66f4\u65b0",
    userRole: "\u7528\u6237",
    waitingForSessions: "\u6b63\u5728\u7b49\u5f85\u672c\u5730\u4f1a\u8bdd\u52a0\u8f7d\u3002",
    withArchived: "\u5305\u542b\u5f52\u6863",
    workspace: "\u5de5\u4f5c\u533a",
    workspaceMissing: "\u7f3a\u5c11\u5de5\u4f5c\u533a\u8def\u5f84\u3002",
    workspaceOpenRequested: "\u5de5\u4f5c\u533a\u6253\u5f00\u8bf7\u6c42\u5df2\u53d1\u9001\u3002"
  }
};

function normalizeSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  const next = { ...SETTINGS.defaults };
  for (const [key, options] of Object.entries(SETTINGS.options)) {
    next[key] = options.includes(source[key]) ? source[key] : SETTINGS.defaults[key];
  }
  return next;
}

function loadSavedSettings() {
  try {
    return normalizeSettings(JSON.parse(window.localStorage.getItem(SETTINGS.storageKey) || "{}"));
  } catch {
    return { ...SETTINGS.defaults };
  }
}

const state = {
  sessions: [],
  selectedSessionId: null,
  query: "",
  sourceFilter: "",
  favoritesOnly: false,
  includeArchived: false,
  latestStats: null,
  embedSidebarOpen: false,
  compactEmbed: false,
  activeDrawerSection: "sidebar-overview",
  settingsOpen: false,
  settings: loadSavedSettings(),
  hostBridgeReady: false
};

const urlParams = new URLSearchParams(window.location.search);
const isEmbedMode = urlParams.get("embed") === "1";
const isVsCodeHost = urlParams.get("host") === "vscode";
const hostToken = urlParams.get("hostToken") || "";
const HOST_TOKEN_PATTERN = /^[a-f0-9]{32}$/;
const pendingHostRequests = new Map();
let loadSequence = 0;
let searchTimer = null;

const elements = {
  stats: document.querySelector("#stats"),
  sessionStatusStrip: document.querySelector("#session-status-strip"),
  scanButton: document.querySelector("#scan-button"),
  searchInput: document.querySelector("#search-input"),
  favoritesOnly: document.querySelector("#favorites-only"),
  includeArchived: document.querySelector("#include-archived"),
  sessionList: document.querySelector("#session-list"),
  sessionCount: document.querySelector("#session-count"),
  listState: document.querySelector("#list-state"),
  overviewSummary: document.querySelector("#overview-summary"),
  overviewMetrics: document.querySelector("#overview-metrics"),
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
  settingsButton: document.querySelector("#settings-button"),
  settingsPanel: document.querySelector("#settings-panel"),
  settingsClose: document.querySelector("#settings-close"),
  settingButtons: Array.from(document.querySelectorAll("[data-setting]")),
  openBrowserButton: document.querySelector("#open-browser-button")
};

const LAYOUT = {
  railWidth: 58,
  embedRailWidth: 54,
  minDrawerWidth: 292,
  maxDrawerWidth: 500,
  defaultDrawerWidth: 328,
  storageKey: "threadvault.drawerWidth"
};

const ICON_LABELS = {
  archive: "Archive",
  brand: "ThreadVault",
  browser: "Open in browser",
  claude: "Claude",
  close: "Close",
  codex: "Codex",
  copilot: "Copilot",
  export: "Export",
  favorite: "Favorite",
  favoriteFilled: "Favorited",
  filter: "Filter",
  language: "Language",
  link: "Copy link",
  memory: "Memory",
  messages: "Messages",
  note: "Notes",
  openSource: "Source file",
  overview: "Overview",
  process: "Process",
  restore: "Restore",
  scan: "Rescan",
  search: "Search",
  sessions: "Sessions",
  settings: "Settings",
  source: "Source",
  status: "Status",
  theme: "Theme",
  workspace: "Workspace"
};

const ICON_LABEL_KEYS = {
  archive: "archiveAction",
  browser: "openInBrowser",
  close: "dismissNotice",
  export: "export",
  favorite: "favoriteAction",
  favoriteFilled: "favorites",
  filter: "filters",
  language: "language",
  link: "copyLink",
  memory: "saveMemory",
  messages: "messages",
  note: "notes",
  openSource: "sourceFile",
  overview: "overview",
  process: "processRole",
  restore: "restoreAction",
  scan: "rescan",
  search: "search",
  sessions: "sessions",
  settings: "settings",
  source: "source",
  theme: "theme",
  workspace: "workspace"
};

const ICON_PATHS = {
  archive: `
    <path d="M4.75 6.5h14.5" />
    <path d="M6 6.5v12h12v-12" />
    <path d="M8.25 3.75h7.5l1.5 2.75H6.75l1.5-2.75Z" />
    <path d="M9.25 10.25h5.5" />
  `,
  brand: `
    <path d="M5.25 6.75h13.5v12.5H5.25z" />
    <path d="M8 6.75V5.4A2.4 2.4 0 0 1 10.4 3h3.2A2.4 2.4 0 0 1 16 5.4v1.35" />
    <path d="M8.4 11.1h7.2" />
    <path d="M8.4 15h3.1" />
    <path d="M15.8 14.9h.05" />
  `,
  browser: `
    <path d="M8.25 5.75H5.75v12.5h12.5v-2.5" />
    <path d="M12.25 5.75h6v6" />
    <path d="m11.25 12.75 7-7" />
  `,
  claude: `
    <path d="M12 3.75 19.25 8v8L12 20.25 4.75 16V8L12 3.75Z" />
    <path d="M8.25 9.5 12 7.35l3.75 2.15" />
    <path d="M8.25 14.5 12 16.65l3.75-2.15" />
    <path d="M12 7.35v9.3" />
  `,
  close: `
    <path d="m7 7 10 10" />
    <path d="M17 7 7 17" />
  `,
  codex: `
    <path d="M5 6.25h14v11.5H5z" />
    <path d="m8.25 10 2.25 2-2.25 2" />
    <path d="M12.5 14h3.25" />
    <path d="M17.8 4.4v2.1" />
    <path d="M16.75 5.45h2.1" />
  `,
  copilot: `
    <path d="M7.25 9.4V8.2A3.45 3.45 0 0 1 10.7 4.75h2.6a3.45 3.45 0 0 1 3.45 3.45v1.2" />
    <path d="M5.5 11.2c0-1 .82-1.8 1.82-1.8h9.36c1 0 1.82.8 1.82 1.8v3.7a4.1 4.1 0 0 1-4.1 4.1H9.6a4.1 4.1 0 0 1-4.1-4.1v-3.7Z" />
    <path d="M9.25 13.2h.05" />
    <path d="M14.7 13.2h.05" />
    <path d="M10 16h4" />
  `,
  export: `
    <path d="M12 4.5v9" />
    <path d="m8.5 10 3.5 3.5 3.5-3.5" />
    <path d="M5.75 15.25v3h12.5v-3" />
  `,
  favorite: `
    <path d="m12 4.75 2.15 4.35 4.8.7-3.48 3.4.82 4.78L12 15.72l-4.29 2.26.82-4.78-3.48-3.4 4.8-.7L12 4.75Z" />
  `,
  favoriteFilled: `
    <path d="m12 4.75 2.15 4.35 4.8.7-3.48 3.4.82 4.78L12 15.72l-4.29 2.26.82-4.78-3.48-3.4 4.8-.7L12 4.75Z" fill="currentColor" stroke="none" />
  `,
  filter: `
    <path d="M5 6h14l-5.25 6v4.75l-3.5 1.75V12L5 6Z" />
  `,
  language: `
    <path d="M5 5.75h8.25" />
    <path d="M9.15 5.75c-.35 3.55-1.9 6.25-4.35 8.1" />
    <path d="M6.7 9.75c1.15 1.45 2.62 2.55 4.42 3.32" />
    <path d="m14.25 18.25 3.25-7.5 3.25 7.5" />
    <path d="M15.35 15.75h4.3" />
  `,
  link: `
    <path d="M9.75 8.25 8.4 6.9a3.15 3.15 0 0 0-4.45 4.45l2.4 2.4a3.15 3.15 0 0 0 4.45 0l.7-.7" />
    <path d="m14.25 15.75 1.35 1.35a3.15 3.15 0 0 0 4.45-4.45l-2.4-2.4a3.15 3.15 0 0 0-4.45 0l-.7.7" />
    <path d="m9.25 14.75 5.5-5.5" />
  `,
  memory: `
    <path d="M5.5 6.25h13v12.5h-13z" />
    <path d="M8.25 6.25V4.75h7.5v1.5" />
    <path d="M8.5 10.25h7" />
    <path d="M8.5 13.25h4.5" />
    <path d="M16.6 14.45 17.25 16l1.55.65-1.55.65-.65 1.55-.65-1.55-1.55-.65 1.55-.65.65-1.55Z" />
  `,
  messages: `
    <path d="M5 6.25h10.75v7.5H9.2L5 17.25v-11Z" />
    <path d="M9.25 16.25h5.5l4.25 3.5v-11h-1.75" />
    <path d="M8 9.5h5" />
    <path d="M8 12h3" />
  `,
  note: `
    <path d="M6 4.75h8.5L18 8.25v11H6z" />
    <path d="M14.5 4.75v3.5H18" />
    <path d="m9 15.6 4.9-4.9 1.4 1.4-4.9 4.9H9z" />
  `,
  openSource: `
    <path d="M6.25 4.75h7.4l4.1 4.1v10.4H6.25z" />
    <path d="M13.5 4.75V9h4.25" />
    <path d="M9 13h5.5" />
    <path d="M9 16h3.5" />
  `,
  overview: `
    <path d="M5 5h5.75v5.75H5z" />
    <path d="M13.25 5H19v5.75h-5.75z" />
    <path d="M5 13.25h5.75V19H5z" />
    <path d="M13.25 13.25H19V19h-5.75z" />
  `,
  process: `
    <path d="M6.25 6.75h3.5v3.5h-3.5z" />
    <path d="M14.25 4.75h3.5v3.5h-3.5z" />
    <path d="M14.25 15.75h3.5v3.5h-3.5z" />
    <path d="M9.75 8.5h1.65c1.75 0 2.85-.8 2.85-2" />
    <path d="M9.75 8.5h1.65c1.75 0 2.85.8 2.85 2v7" />
  `,
  restore: `
    <path d="M4.75 7h14.5" />
    <path d="M6 7v12h12V7" />
    <path d="M8.25 4.25h7.5L17.25 7H6.75l1.5-2.75Z" />
    <path d="M12 16.5v-5" />
    <path d="m9.75 13.75 2.25-2.25 2.25 2.25" />
  `,
  scan: `
    <path d="M18.25 8.25A7 7 0 0 0 6.1 7.4L4.75 9.25" />
    <path d="M4.75 5.75v3.5h3.5" />
    <path d="M5.75 15.75a7 7 0 0 0 12.15.85l1.35-1.85" />
    <path d="M19.25 18.25v-3.5h-3.5" />
  `,
  search: `
    <circle cx="10.8" cy="10.8" r="5.55" />
    <path d="m15 15 4 4" />
  `,
  sessions: `
    <path d="M7 5.25h10.5v11H7z" />
    <path d="M4.5 8.25h2.5v9h8.5v2.5h-11z" />
    <path d="M9.5 9h5.5" />
    <path d="M9.5 12h4" />
  `,
  settings: `
    <path d="M4.75 7.25h5.5" />
    <path d="M13.75 7.25h5.5" />
    <circle cx="12" cy="7.25" r="1.75" />
    <path d="M4.75 12h9.5" />
    <path d="M17.75 12h1.5" />
    <circle cx="16" cy="12" r="1.75" />
    <path d="M4.75 16.75h2.5" />
    <path d="M10.75 16.75h8.5" />
    <circle cx="9" cy="16.75" r="1.75" />
  `,
  source: `
    <circle cx="7" cy="12" r="2.25" />
    <circle cx="17" cy="7" r="2.25" />
    <circle cx="17" cy="17" r="2.25" />
    <path d="m9.05 11.05 5.9-3.1" />
    <path d="m9.05 12.95 5.9 3.1" />
  `,
  status: `
    <circle cx="12" cy="12" r="4.25" fill="currentColor" stroke="none" />
  `,
  theme: `
    <path d="M14.75 4.75a7.25 7.25 0 1 0 4.5 11.9A8.25 8.25 0 0 1 10.9 5.05a7.3 7.3 0 0 1 3.85-.3Z" />
  `,
  workspace: `
    <path d="M4.75 7.25h6l1.5 2h7v9.5H4.75z" />
    <path d="M4.75 7.25V5.5h5l1.5 1.75" />
  `
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderIconSvg(iconKey) {
  const path = ICON_PATHS[iconKey] || ICON_PATHS.archive;
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${path}</svg>`;
}

function iconSlot(iconKey, className = "mini-icon") {
  const label = ICON_LABEL_KEYS[iconKey] ? t(ICON_LABEL_KEYS[iconKey]) : (ICON_LABELS[iconKey] || iconKey);
  return `<span class="${escapeHtml(className)} app-icon" title="${escapeHtml(label)}" aria-hidden="true">${renderIconSvg(iconKey)}</span>`;
}

function hydrateStaticIcons() {
  for (const node of document.querySelectorAll("[data-icon]")) {
    const iconKey = node.getAttribute("data-icon");
    node.classList.add("app-icon");
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = renderIconSvg(iconKey);
  }
}

function t(key) {
  const dictionary = I18N[state.settings.language] || I18N.en;
  return dictionary[key] || I18N.en[key] || key;
}

function applyLocalizedText() {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.getAttribute("data-i18n"));
  }

  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.getAttribute("data-i18n-placeholder")));
  }

  for (const node of document.querySelectorAll("[data-i18n-aria-label]")) {
    node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria-label")));
  }

  for (const node of document.querySelectorAll("[data-i18n-title]")) {
    node.setAttribute("title", t(node.getAttribute("data-i18n-title")));
  }
}

function applySettings() {
  document.documentElement.lang = state.settings.language === "zh" ? "zh-CN" : "en";
  document.body.classList.toggle("theme-dim", state.settings.theme === "dim");
  document.body.classList.add("density-compact");

  for (const button of elements.settingButtons) {
    const key = button.getAttribute("data-setting");
    const value = button.getAttribute("data-setting-value");
    const active = state.settings[key] === value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }

  applyLocalizedText();
}

function persistSettings() {
  window.localStorage.setItem(SETTINGS.storageKey, JSON.stringify(state.settings));
}

function setSetting(key, value) {
  if (!SETTINGS.options[key]?.includes(value)) {
    return;
  }

  state.settings = normalizeSettings({
    ...state.settings,
    [key]: value
  });
  persistSettings();
  applySettings();

  if (state.latestStats) {
    renderStats(state.latestStats);
  }
  renderSessionList();
  if (key === "language" && state.selectedSessionId) {
    selectSession(state.selectedSessionId, false, false).catch((error) => {
      showToast(String(error.message || error), "warning");
    });
  }
}

function setSettingsOpen(open) {
  state.settingsOpen = Boolean(open);
  if (elements.settingsPanel) {
    elements.settingsPanel.hidden = !state.settingsOpen;
  }
  elements.settingsButton?.classList.toggle("is-active", state.settingsOpen);
  elements.settingsButton?.setAttribute("aria-expanded", state.settingsOpen ? "true" : "false");
}

function setButtonLabel(button, label) {
  const labelNode = button?.querySelector(".button-label");
  if (labelNode) {
    labelNode.textContent = label;
    return;
  }

  if (button) {
    button.textContent = label;
  }
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

function compactTitle(value) {
  const text = String(value || "").trim();
  const maxLength = /[\u3400-\u9fff]/.test(text) ? 64 : 112;
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
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

function sessionIdFromUrl() {
  return new URLSearchParams(window.location.search).get("session") || "";
}

function sessionUrl(sessionId = state.selectedSessionId) {
  const url = new URL(window.location.href);
  if (sessionId) {
    url.searchParams.set("session", sessionId);
  } else {
    url.searchParams.delete("session");
  }
  return url.toString();
}

function browserSessionUrl(sessionId = state.selectedSessionId) {
  const url = new URL(sessionUrl(sessionId));
  url.searchParams.delete("embed");
  url.searchParams.delete("host");
  url.searchParams.delete("hostToken");
  url.searchParams.delete("v");
  return url.toString();
}

function updateSessionUrl(sessionId, replace = false) {
  const nextUrl = sessionUrl(sessionId);
  const method = replace ? "replaceState" : "pushState";
  if (nextUrl !== window.location.href) {
    window.history[method]({}, "", nextUrl);
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall back for embedded browsers that expose Clipboard API without write permission.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

if (isEmbedMode) {
  document.body.classList.add("embed-mode");
}

function applyHostMode() {
  if (elements.openBrowserButton) {
    elements.openBrowserButton.hidden = !isEmbedMode;
  }
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

  const startDragging = (clientX, pointerId = null) => {
    if (!drawerResizeAvailable()) {
      return false;
    }

    const currentWidth = elements.sidebar?.getBoundingClientRect().width || getSavedDrawerWidth();
    dragState = {
      pointerId,
      startX: clientX,
      startWidth: currentWidth
    };
    document.body.classList.add("is-resizing-drawer");
    return true;
  };

  const updateDragging = (clientX) => {
    if (!dragState) {
      return;
    }

    setDrawerWidth(dragState.startWidth + clientX - dragState.startX);
  };

  const stopDragging = (event) => {
    if (!dragState) {
      return;
    }

    document.body.classList.remove("is-resizing-drawer");
    if (dragState.pointerId !== null) {
      elements.drawerResizer.releasePointerCapture?.(dragState.pointerId);
    }
    dragState = null;
    event?.preventDefault?.();
  };

  elements.drawerResizer.addEventListener("pointerdown", (event) => {
    if (startDragging(event.clientX, event.pointerId)) {
      elements.drawerResizer.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  });

  document.addEventListener("pointermove", (event) => {
    if (!dragState) {
      return;
    }

    updateDragging(event.clientX);
    event.preventDefault();
  });

  document.addEventListener("pointerup", stopDragging);
  document.addEventListener("pointercancel", stopDragging);
  elements.drawerResizer.addEventListener("mousedown", (event) => {
    if (dragState) {
      return;
    }

    if (startDragging(event.clientX)) {
      event.preventDefault();
    }
  });
  document.addEventListener("mousemove", (event) => {
    if (!dragState) {
      return;
    }

    updateDragging(event.clientX);
    event.preventDefault();
  });
  document.addEventListener("mouseup", stopDragging);
  window.addEventListener("blur", stopDragging);
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

function hasHostBridgeCandidate() {
  return isEmbedMode && isVsCodeHost && HOST_TOKEN_PATTERN.test(hostToken) && window.parent !== window;
}

function announceHostBridgePresence() {
  if (!hasHostBridgeCandidate()) {
    return;
  }

  window.parent.postMessage(
    {
      source: "threadvault-app",
      type: "threadvault-app-ready",
      hostToken
    },
    "*"
  );
}

window.addEventListener("message", (event) => {
  const payload = event.data;
  if (
    !hasHostBridgeCandidate() ||
    event.source !== window.parent ||
    !payload ||
    payload.source !== "threadvault-host" ||
    payload.hostToken !== hostToken
  ) {
    return;
  }

  if (payload.type === "threadvault-host-ready") {
    state.hostBridgeReady = true;
    return;
  }

  if (!state.hostBridgeReady || !payload.requestId) {
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

  pending.reject(new Error(payload.error || t("hostActionFailed")));
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
    throw new Error(payload.error || `${t("requestFailed")}: ${response.status}`);
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

function hasHostBridge() {
  return hasHostBridgeCandidate() && state.hostBridgeReady;
}

function runHostAction(type, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const requestId = `host-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeoutId = window.setTimeout(() => {
      pendingHostRequests.delete(requestId);
      reject(new Error(t("hostTimeout")));
    }, timeoutMs);

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
        requestId,
        hostToken
      },
      "*"
    );
  });
}

function formatDate(isoString) {
  if (!isoString) {
    return t("unknownTime");
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return t("unknownTime");
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function sanitizeSnippet(value) {
  const cleaned = stripInternalContext(String(value || ""));
  let markOpen = false;
  const html = cleaned.split(/(<\/?mark>)/gi).map((part) => {
    const tag = part.toLowerCase();
    if (tag === "<mark>") {
      if (markOpen) {
        return "";
      }
      markOpen = true;
      return "<mark>";
    }
    if (tag === "</mark>") {
      if (!markOpen) {
        return "";
      }
      markOpen = false;
      return "</mark>";
    }
    return escapeHtml(part);
  }).join("");

  return markOpen ? `${html}</mark>` : html;
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
    <button class="toast-close" type="button" aria-label="${escapeHtml(t("dismissNotice"))}">${iconSlot("close")}</button>
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
    return t("assistantRole");
  }
  if (role === "user") {
    return t("userRole");
  }
  if (role === "system") {
    return t("systemRole");
  }
  if (role === "tool") {
    return t("processRole");
  }
  return role || t("messageRole");
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
            <span>${iconSlot("process")} ${escapeHtml(t("processRole"))}</span>
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

function filterPanelHtml(stats) {
  return `
    <div class="filter-panel">
      <div class="filter-panel-title">
        ${iconSlot("filter")}
        <span>${escapeHtml(t("quickFilters"))}</span>
      </div>
      <div class="filter-pill-row">
        <button
          class="filter-pill ${state.favoritesOnly ? "is-active" : ""}"
          type="button"
          data-status-filter="favorites"
          aria-pressed="${state.favoritesOnly ? "true" : "false"}"
        >
          ${iconSlot("favorite")}
          <span class="filter-pill-label">${escapeHtml(t("favorites"))}</span>
          <span class="filter-pill-value">${stats.favoriteCount || 0}</span>
        </button>
        <button
          class="filter-pill ${state.includeArchived ? "is-active" : ""}"
          type="button"
          data-status-filter="archived"
          aria-pressed="${state.includeArchived ? "true" : "false"}"
        >
          ${iconSlot("archive")}
          <span class="filter-pill-label">${escapeHtml(t("archived"))}</span>
          <span class="filter-pill-value">${stats.archivedCount || 0}</span>
        </button>
      </div>
    </div>
  `;
}

function renderStats(stats) {
  state.latestStats = stats;
  const sourceCards = [
    {
      label: t("sessions"),
      value: stats.sessionCount || 0,
      active: state.sourceFilter === "",
      sourceId: "",
      caption: t("all"),
      icon: "archive"
    },
    {
      label: "Copilot",
      value: stats.copilotSessionCount || 0,
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

  const filterContainer = elements.sessionStatusStrip;
  if (filterContainer) {
    filterContainer.innerHTML = filterPanelHtml(stats);
  }

  if (elements.overviewMetrics) {
    elements.overviewMetrics.innerHTML = `
      <div class="overview-metric">
        ${iconSlot("sessions", "summary-icon")}
        <div>
          <span class="overview-metric-label">${escapeHtml(t("sessions"))}</span>
          <strong>${stats.sessionCount || 0}</strong>
        </div>
      </div>
      <div class="overview-metric">
        ${iconSlot("messages", "summary-icon")}
        <div>
          <span class="overview-metric-label">${escapeHtml(t("libraryTotal"))}</span>
          <strong>${stats.messageCount || 0}</strong>
        </div>
      </div>
    `;
  }

  if (filterContainer) {
    for (const node of filterContainer.querySelectorAll("[data-status-filter]")) {
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
  }

  const summary = `${stats.sessionCount || 0} ${t("sessions").toLowerCase()} / ${stats.messageCount || 0} ${t("messages")}`;
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
        <h3>${escapeHtml(t("noSessions"))}</h3>
        <p>${escapeHtml(t("noSessionsMatched"))}</p>
      </div>
    `;
    return;
  }

  elements.sessionList.innerHTML = state.sessions.map((session) => {
    const activeClass = session.id === state.selectedSessionId ? "active" : "";
    const preview = stripInternalContext(session.searchSnippet || session.summary || "");
    const favorite = session.annotation?.favorite
      ? `<span class="favorite-indicator" title="${escapeHtml(ICON_LABELS.favoriteFilled)}">${iconSlot("favoriteFilled")}</span>`
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
            session.workspaceName || t("noWorkspace"),
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
        <span class="summary-label">${iconSlot("note")} ${escapeHtml(t("notes"))}</span>
        <span class="annotation-summary">${escapeHtml(tagValue || noteValue ? t("saved") : t("empty"))}</span>
      </summary>
      <div class="annotation-content">
        <div class="annotation-grid">
          <input class="annotation-input" id="tag-input" type="text" value="${escapeHtml(tagValue)}" placeholder="${escapeHtml(t("tags"))}" />
          <textarea class="annotation-textarea" id="note-input" placeholder="${escapeHtml(t("note"))}">${escapeHtml(noteValue)}</textarea>
        </div>
        <div class="annotation-actions">
          <button class="secondary-button action-button" id="save-note-button" type="button">
            ${iconSlot("note")}
            <span>${escapeHtml(t("save"))}</span>
          </button>
        </div>
        <div class="inline-status" id="annotation-status"></div>
      </div>
    </details>
  `;
}

function renderSessionDetail(session) {
  const isFavorite = Boolean(session.annotation?.favorite);
  const isArchived = Boolean(session.annotation?.archived);
  const archiveProtected = isFavorite && !isArchived;
  const favoriteLabel = isFavorite ? t("unfavoriteAction") : t("favoriteAction");
  const archiveLabel = isArchived ? t("restoreAction") : t("archiveAction");
  const archiveIcon = isArchived ? "restore" : "archive";
  const archiveTitle = archiveProtected ? t("protectedFavoriteTitle") : archiveLabel;
  const displayTitle = compactTitle(session.title);
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
          <span>${iconSlot("process")} ${escapeHtml(t("rawStream"))}</span>
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
          <h2 title="${escapeHtml(session.title)}">${escapeHtml(displayTitle)}</h2>
          <div class="detail-meta">
            ${metaLine([
              session.workspaceName || t("noWorkspace"),
              session.status || t("unknown"),
              `${t("updated")} ${formatDate(session.updatedAt || session.createdAt)}`
            ])}
          </div>
          <div class="detail-meta source-path">${escapeHtml(t("sourcePath"))}: ${escapeHtml(basenameFromPath(session.sourcePath) || t("unknown"))}</div>
        </div>
        <div class="detail-status-stack">
          ${iconSlot(sourceIconKey(session.sourceId), "hero-source-icon utility-slot")}
        </div>
      </div>
      <div class="detail-badges">
        <div class="detail-badge">
          ${iconSlot(sourceIconKey(session.sourceId))}
          <span>${escapeHtml(session.sourceLabel)}</span>
        </div>
        <div class="detail-badge">
          ${iconSlot("workspace")}
          <span>${escapeHtml(session.workspaceName || t("noWorkspace"))}</span>
        </div>
      </div>
      ${tagHtml(session.annotation?.tags || [])}
      <div class="detail-toolbar">
        <div class="detail-actions">
          <button class="secondary-button action-button" type="button" data-action="open-source" title="${escapeHtml(t("sourceFile"))}">
            ${iconSlot("openSource")}
            <span>${escapeHtml(t("source"))}</span>
          </button>
          <button class="secondary-button action-button" type="button" data-action="open-workspace" ${canOpenWorkspace ? "" : "disabled"} title="${escapeHtml(canOpenWorkspace ? t("workspace") : t("noWorkspace"))}">
            ${iconSlot("workspace")}
            <span>${escapeHtml(t("workspace"))}</span>
          </button>
          <button class="ghost-button action-button ${isFavorite ? "is-favorite" : ""}" type="button" data-action="favorite-toggle" title="${escapeHtml(favoriteLabel)}">
            ${iconSlot(isFavorite ? "favoriteFilled" : "favorite")}
            <span>${escapeHtml(favoriteLabel)}</span>
          </button>
          <button class="ghost-button action-button ${archiveProtected ? "is-protected" : ""}" type="button" data-action="archive-toggle" title="${escapeHtml(archiveTitle)}" data-protected="${archiveProtected ? "true" : "false"}">
            ${iconSlot(archiveIcon)}
            <span>${escapeHtml(archiveLabel)}</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="export-markdown" title="${escapeHtml(t("export"))}">
            ${iconSlot("export")}
            <span>${escapeHtml(t("export"))}</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="save-memory" title="${escapeHtml(t("saveMemoryTitle"))}">
            ${iconSlot("memory")}
            <span>${escapeHtml(t("saveMemory"))}</span>
          </button>
          <button class="ghost-button action-button" type="button" data-action="copy-link" title="${escapeHtml(t("copyLink"))}">
            ${iconSlot("link")}
            <span>${escapeHtml(t("copyLink"))}</span>
          </button>
        </div>
      </div>
      ${annotationPanelHtml(tagValue, noteValue)}
    </header>
    <section class="detail-body">
      <div class="transcript-shell">
        <div class="transcript-header">
          <h3 class="transcript-title">${escapeHtml(t("transcript"))}</h3>
          ${iconSlot("messages", "hero-source-icon transcript-slot")}
        </div>
        ${messageHtml || `<p class="muted">${escapeHtml(t("noTranscript"))}</p>`}
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
    showToast(`${t("saved")}.`, "success");
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
          showToast(t("sourceMissing"), "warning");
          return;
        }

        setBusy(t("opening"));
        const result = hasHostBridge()
          ? await runHostAction("threadvault-open-path", {
            path: session.sourcePath,
            target: "source"
          })
          : await postJson("/api/open", { path: session.sourcePath });

        if (!result?.ok) {
          showToast(result?.error || t("openSourceFailed"), "warning");
        } else {
          const message = result.message || t("sourceOpened");
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
          showToast(t("workspaceMissing"), "warning");
          return;
        }

        setBusy(t("opening"));
        const result = hasHostBridge()
          ? await runHostAction("threadvault-open-path", {
            path: session.workspacePath,
            target: "workspace"
          })
          : await postJson("/api/open", { path: session.workspacePath });

        if (!result?.ok) {
          showToast(result?.error || t("openWorkspaceFailed"), "warning");
        } else {
          const message = result.message || t("workspaceOpenRequested");
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
        const nextFavorite = !isFavorite;
        setBusy(t("saving"));
        await saveAnnotation(session.id, {
          favorite: nextFavorite,
          ...(nextFavorite ? { archived: false } : {})
        });
        showToast(`${t("saved")}.`, "success");
      } catch (error) {
        resetBusy();
        showToast(String(error.message || error), "warning");
      }
      return;
    }

    if (action === "archive-toggle") {
      if (archiveProtected) {
        showToast(t("protectedFavorite"), "warning");
        return;
      }

      if (!isArchived) {
        const confirmed = window.confirm(t("archiveConfirm"));
        if (!confirmed) {
          return;
        }
      }

      try {
        setBusy(t("saving"));
        await saveAnnotation(session.id, {
          archived: !isArchived
        });
        showToast(`${t("saved")}.`, "success");
      } catch (error) {
        resetBusy();
        showToast(String(error.message || error), "warning");
      }
      return;
    }

    if (action === "export-markdown") {
      setBusy(t("exporting"));
      try {
        const result = await postJson("/api/export", { sessionId: session.id });
        if (!result.ok) {
          showToast(result.error || t("exportFailed"), "warning");
          return;
        }
        const message = `${t("exportedTo")} ${result.path}`;
        if (status) {
          status.textContent = message;
        }
        showToast(message, "success");
      } catch (error) {
        showToast(String(error.message || error), "warning");
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "save-memory") {
      setBusy(t("savingMemory"));
      try {
        const result = await postJson("/api/memory", { sessionId: session.id });
        if (!result.ok) {
          showToast(result.error || t("memoryFailed"), "warning");
          return;
        }
        const message = `${t("memorySaved")} ${result.path}`;
        if (status) {
          status.textContent = message;
        }
        showToast(message, "success");
      } catch (error) {
        showToast(String(error.message || error), "warning");
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "copy-link") {
      setBusy(t("copying"));
      try {
        const copied = await copyText(browserSessionUrl(session.id));
        if (!copied) {
          showToast(t("copyFailed"), "warning");
          return;
        }
        showToast(t("copySuccess"), "success");
        if (status) {
          status.textContent = t("copySuccess");
        }
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
    segments.push(t("allSources"));
  }

  if (state.favoritesOnly) {
    segments.push(t("favorites"));
  }

  if (state.includeArchived) {
    segments.push(t("withArchived"));
  }

  if (state.query) {
    segments.push(`${t("searchPrefix")}: "${state.query}"`);
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

  const urlSessionId = sessionIdFromUrl();
  if (!state.selectedSessionId && urlSessionId) {
    state.selectedSessionId = urlSessionId;
  }

  if (!state.selectedSessionId && state.sessions.length > 0) {
    state.selectedSessionId = state.sessions[0].id;
  }

  if (state.selectedSessionId && !state.sessions.find((session) => session.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0]?.id || null;
  }

  renderSessionList();

  if (state.selectedSessionId) {
    await selectSession(state.selectedSessionId, false);
    updateSessionUrl(state.selectedSessionId, true);
  } else {
    updateSessionUrl("", true);
    elements.sessionDetail.classList.add("empty-state");
    elements.sessionDetail.innerHTML = `
      <h2>${escapeHtml(t("selectSession"))}</h2>
      <p class="muted">${escapeHtml(t("noSessionSelected"))}</p>
    `;
  }
}

async function saveAnnotation(sessionId, payload) {
  const status = elements.sessionDetail.querySelector("#annotation-status");
  if (status) {
    status.textContent = `${t("saving")}...`;
  }

  const result = await postJson("/api/session-meta", {
    sessionId,
    ...payload
  });

  if (!result.ok) {
    throw new Error(result.error || t("saveFailed"));
  }

  await loadSessions();

  const nextStatus = elements.sessionDetail.querySelector("#annotation-status");
  if (nextStatus) {
    nextStatus.textContent = `${t("saved")}.`;
  }
}

async function selectSession(sessionId, rerenderList = true, syncUrl = true) {
  if (!sessionId) {
    return;
  }

  state.selectedSessionId = sessionId;
  if (syncUrl) {
    updateSessionUrl(sessionId, !rerenderList);
  }
  if (rerenderList) {
    renderSessionList();
  }

  const session = await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}`);
  renderSessionDetail(session);
}

async function runScan() {
  elements.scanButton.disabled = true;
  setButtonLabel(elements.scanButton, t("scanning"));
  try {
    const result = await requestJson("/api/scan", { method: "POST" });
    await loadSessions();
    const status = [
      `${t("scanImported")} ${result.importedSessions || 0}`,
      `${t("scanUpdated")} ${result.updatedSessions || 0}`,
      `${t("scanSkipped")} ${result.skippedSessions || 0}`
    ].join(", ");
    showToast(status, "success");
  } finally {
    elements.scanButton.disabled = false;
    setButtonLabel(elements.scanButton, t("rescan"));
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

elements.settingsButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  setSettingsOpen(!state.settingsOpen);
});

elements.settingsClose?.addEventListener("click", () => {
  setSettingsOpen(false);
  elements.settingsButton?.focus();
});

for (const button of elements.settingButtons) {
  button.addEventListener("click", () => {
    setSetting(button.getAttribute("data-setting"), button.getAttribute("data-setting-value"));
  });
}

document.addEventListener("click", (event) => {
  if (!state.settingsOpen) {
    return;
  }

  const target = event.target;
  if (elements.settingsPanel?.contains(target) || elements.settingsButton?.contains(target)) {
    return;
  }

  setSettingsOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.settingsOpen) {
    setSettingsOpen(false);
    elements.settingsButton?.focus();
  }
});

elements.openBrowserButton?.addEventListener("click", async () => {
  const button = elements.openBrowserButton;
  const originalLabel = button.querySelector(".button-label")?.textContent || button.textContent;
  const fallbackUrl = browserSessionUrl();
  button.disabled = true;
  setButtonLabel(button, t("opening"));
  try {
    if (hasHostBridge()) {
      const result = await runHostAction("threadvault-open-browser", {
        url: fallbackUrl
      }, 1200);
      const status = elements.sessionDetail.querySelector("#annotation-status");
      if (status && result?.message) {
        status.textContent = result.message;
      }
      if (result?.message) {
        showToast(result.message, "success");
      }
    } else if (isEmbedMode) {
      window.location.href = fallbackUrl;
    } else {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    if (isEmbedMode) {
      window.location.href = fallbackUrl;
      return;
    }
    showToast(String(error.message || error), "warning");
  } finally {
    button.disabled = false;
    setButtonLabel(button, originalLabel);
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
window.addEventListener("popstate", () => {
  const nextSessionId = sessionIdFromUrl() || state.sessions[0]?.id || "";
  if (!nextSessionId || nextSessionId === state.selectedSessionId) {
    return;
  }

  selectSession(nextSessionId, true, false).catch((error) => {
    showToast(String(error.message || error), "warning");
  });
});

hydrateStaticIcons();
applyHostMode();
applySettings();
initDrawerResize();
updateRailButtons();
setSettingsOpen(false);
setEmbedSidebarOpen(false);
updateEmbedLayoutState();
announceHostBridgePresence();

loadSessions().catch((error) => {
  elements.sessionDetail.innerHTML = `
    <h2>${escapeHtml(t("loadFailed"))}</h2>
    <p>${escapeHtml(String(error.message || error))}</p>
  `;
});
