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

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const SCAN_REQUEST_TIMEOUT_MS = 120000;
const MAX_SESSION_ID_LENGTH = 512;
const MAX_SEARCH_QUERY_LENGTH = 500;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 64;
const MAX_TAG_INPUT_LENGTH = 1500;
const MAX_NOTE_TEXT_LENGTH = 20000;
const MAX_RESPONSE_ERROR_TEXT_LENGTH = 20000;
const SESSION_MESSAGE_PAGE_SIZE = 200;

const I18N = {
  en: {
    all: "All",
    allSources: "All sources",
    archiveReady: "Your local archive is ready.",
    archived: "Hidden",
    archivedTitle: "Move this session to Hidden. It will leave Regular and Favorites, but the source history file is not deleted.",
    assistantRole: "Assistant",
    brandEyebrow: "Local AI Archive",
    closeSettings: "Close settings",
    copyLink: "Copy local link",
    copyLinkTitle: "Copy a local ThreadVault URL that opens this exact session on this machine.",
    copying: "Copying",
    copyFailed: "Unable to copy link.",
    copySuccess: "Local session link copied.",
    currentFocus: "Current focus",
    dismissNotice: "Dismiss notice",
    drawerResize: "Resize session library",
    drawerResizeTitle: "Drag or use arrow keys to resize the session library",
    empty: "Empty",
    export: "Export copy",
    exportTitle: "Create a standalone Markdown copy in the exports folder for sharing or backup.",
    exportedTo: "Exported to",
    exporting: "Exporting",
    exportFailed: "Export failed.",
    favoriteAction: "Favorite",
    favoriteTitle: "Set this session to Favorite. It stays visible and appears in Favorites.",
    favorites: "Favorites",
    filters: "Filters",
    language: "Language",
    library: "Library",
    librarySnapshot: "Library snapshot",
    libraryTotal: "Library total",
    loadFailed: "Failed to load",
    loadMore: "Load more",
    loadingMore: "Loading",
    memoryFailed: "Memory note save failed.",
    memorySaved: "Memory note saved to",
    messages: "messages",
    saveMemory: "Save note",
    saveMemoryTitle: "Save this session as a reusable Markdown memory note in the configured memory directory.",
    openInBrowser: "Open in browser",
    opening: "Opening",
    overview: "Overview",
    messageRole: "Message",
    hostActionFailed: "Host action failed.",
    hostTimeout: "Timed out waiting for VS Code host response.",
    openSourceFailed: "Unable to open source file.",
    openWorkspaceFailed: "Unable to open workspace.",
    openActions: "Open",
    outputActions: "Output actions",
    outputActionsHelp: "These actions do not change the session state: Export copy writes a Markdown file, Save note writes a reusable memory note, and Copy local link copies a local URL.",
    processRole: "Process",
    noSessionSelected: "No session is selected.",
    noSessionsMatched: "Nothing matched the current view.",
    noSessions: "No sessions",
    noChangesToSave: "No changes to save.",
    noTranscript: "No transcript messages were parsed for this session.",
    noWorkspace: "No workspace",
    note: "Note",
    notes: "Notes",
    quickFilters: "Quick filters",
    railBrand: "Vault",
    rawStream: "Raw stream",
    rescan: "Rescan",
    restoreTitle: "Return this session to the main list.",
    requestFailed: "Request failed",
    invalidResponse: "ThreadVault returned an unexpected response",
    requestTimedOut: "Request timed out. Check that the local ThreadVault service is still running.",
    save: "Save",
    saved: "Saved",
    saveFailed: "Annotation save failed.",
    scanFailed: "failed",
    scanSourceFailed: "source errors",
    scanImported: "Imported",
    scanSkipped: "skipped",
    scanUpdated: "updated",
    saving: "Saving",
    savingMemory: "Saving note",
    scanning: "Scanning",
    search: "Search",
    searchPrefix: "Search",
    searchSessions: "Search sessions",
    selectSession: "Select a session",
    sessions: "Sessions",
    sessionActions: "Session actions",
    sessionState: "Session state",
    sessionStateHelp: "The session can be in exactly one state: Regular, Favorite, or Hidden.",
    settings: "Settings",
    settingsKicker: "Appearance",
    sidebarClose: "Close session library",
    source: "Source",
    sourceFile: "Source file",
    sourceMissing: "Source path is missing.",
    sourceOpened: "Source opened.",
    sourcePath: "Source",
    sources: "Sources",
    statusDefault: "Regular",
    statusFavorite: "Favorite",
    statusHidden: "Hidden",
    statusSavedDefault: "Set to Regular.",
    statusSavedFavorite: "Moved to Favorites.",
    statusSavedHidden: "Moved to Hidden and removed from Favorites. Restore it from the Hidden view.",
    statusDefaultTitle: "Show this session in the regular library.",
    systemRole: "System",
    tags: "Tags",
    theme: "Theme",
    themeDim: "Graphite",
    themeLight: "Light",
    transcript: "Transcript",
    unknown: "unknown",
    unknownTime: "Unknown time",
    updated: "Updated",
    userRole: "User",
    waitingForSessions: "Waiting for local sessions to load.",
    workspace: "Workspace",
    workspaceMissing: "Workspace path is missing.",
    workspaceOpenRequested: "Workspace open request sent."
  },
  zh: {
    all: "\u5168\u90e8",
    allSources: "\u5168\u90e8\u6765\u6e90",
    archiveReady: "\u672c\u5730\u4f1a\u8bdd\u5f52\u6863\u5df2\u5c31\u7eea\u3002",
    archived: "\u5df2\u9690\u85cf",
    archivedTitle: "\u5c06\u8fd9\u6b21\u4f1a\u8bdd\u79fb\u5230\u9690\u85cf\u72b6\u6001\uff0c\u5b83\u4f1a\u79bb\u5f00\u5e38\u89c4\u548c\u6536\u85cf\u89c6\u56fe\uff0c\u4f46\u4e0d\u4f1a\u5220\u9664\u6e90\u5386\u53f2\u6587\u4ef6\u3002",
    assistantRole: "\u52a9\u624b",
    brandEyebrow: "\u672c\u5730 AI \u5f52\u6863",
    closeSettings: "\u5173\u95ed\u8bbe\u7f6e",
    copyLink: "\u590d\u5236\u672c\u5730\u94fe\u63a5",
    copyLinkTitle: "\u590d\u5236\u4e00\u4e2a\u53ea\u5728\u672c\u673a ThreadVault \u53ef\u7528\u7684\u4f1a\u8bdd URL\uff0c\u53ef\u76f4\u8fbe\u8fd9\u6b21\u4f1a\u8bdd\u3002",
    copying: "\u590d\u5236\u4e2d",
    copyFailed: "\u65e0\u6cd5\u590d\u5236\u94fe\u63a5\u3002",
    copySuccess: "\u672c\u5730\u4f1a\u8bdd\u94fe\u63a5\u5df2\u590d\u5236\u3002",
    currentFocus: "\u5f53\u524d\u8303\u56f4",
    dismissNotice: "\u5173\u95ed\u901a\u77e5",
    drawerResize: "\u8c03\u6574\u4f1a\u8bdd\u5e93\u5bbd\u5ea6",
    drawerResizeTitle: "\u62d6\u52a8\u6216\u4f7f\u7528\u65b9\u5411\u952e\u8c03\u6574\u4f1a\u8bdd\u5e93\u5bbd\u5ea6",
    empty: "\u7a7a",
    export: "\u5bfc\u51fa\u526f\u672c",
    exportTitle: "\u5728\u5bfc\u51fa\u76ee\u5f55\u4e2d\u751f\u6210\u72ec\u7acb\u7684 Markdown \u526f\u672c\uff0c\u9002\u5408\u5206\u4eab\u6216\u5907\u4efd\u3002",
    exportedTo: "\u5df2\u5bfc\u51fa\u5230",
    exporting: "\u5bfc\u51fa\u4e2d",
    exportFailed: "\u5bfc\u51fa\u5931\u8d25\u3002",
    favoriteAction: "\u6536\u85cf",
    favoriteTitle: "\u5c06\u8fd9\u6b21\u4f1a\u8bdd\u8bbe\u4e3a\u6536\u85cf\u72b6\u6001\uff0c\u5b83\u4f1a\u4fdd\u6301\u53ef\u89c1\u5e76\u51fa\u73b0\u5728\u6536\u85cf\u89c6\u56fe\u4e2d\u3002",
    favorites: "\u6536\u85cf",
    filters: "\u8fc7\u6ee4",
    language: "\u8bed\u8a00",
    library: "\u8d44\u6599\u5e93",
    librarySnapshot: "\u8d44\u6599\u5e93\u6982\u89c8",
    libraryTotal: "\u6d88\u606f\u603b\u91cf",
    loadFailed: "\u52a0\u8f7d\u5931\u8d25",
    loadMore: "\u52a0\u8f7d\u66f4\u591a",
    loadingMore: "\u52a0\u8f7d\u4e2d",
    memoryFailed: "\u8bb0\u5fc6\u7b14\u8bb0\u4fdd\u5b58\u5931\u8d25\u3002",
    memorySaved: "\u8bb0\u5fc6\u7b14\u8bb0\u5df2\u4fdd\u5b58\u5230",
    messages: "\u6761\u6d88\u606f",
    saveMemory: "\u4fdd\u5b58\u8bb0\u5fc6",
    saveMemoryTitle: "\u5c06\u8fd9\u6b21\u4f1a\u8bdd\u4fdd\u5b58\u4e3a\u53ef\u957f\u671f\u590d\u7528\u7684 Markdown \u8bb0\u5fc6\uff0c\u5199\u5165\u5df2\u914d\u7f6e\u7684\u8bb0\u5fc6\u76ee\u5f55\u3002",
    openInBrowser: "\u5728\u6d4f\u89c8\u5668\u6253\u5f00",
    opening: "\u6253\u5f00\u4e2d",
    overview: "\u6982\u89c8",
    messageRole: "\u6d88\u606f",
    hostActionFailed: "VS Code \u5bbf\u4e3b\u64cd\u4f5c\u5931\u8d25\u3002",
    hostTimeout: "\u7b49\u5f85 VS Code \u5bbf\u4e3b\u54cd\u5e94\u8d85\u65f6\u3002",
    openSourceFailed: "\u65e0\u6cd5\u6253\u5f00\u6e90\u6587\u4ef6\u3002",
    openWorkspaceFailed: "\u65e0\u6cd5\u6253\u5f00\u5de5\u4f5c\u533a\u3002",
    openActions: "\u6253\u5f00",
    outputActions: "\u8f93\u51fa\u52a8\u4f5c",
    outputActionsHelp: "\u8fd9\u7ec4\u52a8\u4f5c\u4e0d\u4f1a\u6539\u53d8\u4f1a\u8bdd\u72b6\u6001\uff1a\u5bfc\u51fa\u526f\u672c\u4f1a\u5199\u5165 Markdown \u6587\u4ef6\uff0c\u4fdd\u5b58\u8bb0\u5fc6\u4f1a\u5199\u5165\u53ef\u590d\u7528\u7684\u8bb0\u5fc6\u7b14\u8bb0\uff0c\u590d\u5236\u672c\u5730\u94fe\u63a5\u4f1a\u590d\u5236\u672c\u673a URL\u3002",
    processRole: "\u8fc7\u7a0b",
    noSessionSelected: "\u672a\u9009\u62e9\u4f1a\u8bdd\u3002",
    noSessionsMatched: "\u5f53\u524d\u89c6\u56fe\u6ca1\u6709\u5339\u914d\u7ed3\u679c\u3002",
    noSessions: "\u6ca1\u6709\u4f1a\u8bdd",
    noChangesToSave: "\u6ca1\u6709\u9700\u8981\u4fdd\u5b58\u7684\u66f4\u6539\u3002",
    noTranscript: "\u8fd9\u4e2a\u4f1a\u8bdd\u6682\u672a\u89e3\u6790\u5230\u53ef\u5c55\u793a\u7684\u6d88\u606f\u3002",
    noWorkspace: "\u65e0\u5de5\u4f5c\u533a",
    note: "\u5907\u6ce8",
    notes: "\u7b14\u8bb0",
    quickFilters: "\u5feb\u901f\u8fc7\u6ee4",
    railBrand: "Vault",
    rawStream: "\u539f\u59cb\u6d41",
    rescan: "\u91cd\u65b0\u626b\u63cf",
    restoreTitle: "\u5c06\u8fd9\u6b21\u4f1a\u8bdd\u653e\u56de\u4e3b\u5217\u8868\u3002",
    requestFailed: "\u8bf7\u6c42\u5931\u8d25",
    invalidResponse: "ThreadVault \u8fd4\u56de\u4e86\u975e\u9884\u671f\u54cd\u5e94",
    requestTimedOut: "\u8bf7\u6c42\u8d85\u65f6\u3002\u8bf7\u786e\u8ba4\u672c\u5730 ThreadVault \u670d\u52a1\u4ecd\u5728\u8fd0\u884c\u3002",
    save: "\u4fdd\u5b58",
    saved: "\u5df2\u4fdd\u5b58",
    saveFailed: "\u6807\u6ce8\u4fdd\u5b58\u5931\u8d25\u3002",
    scanFailed: "\u5931\u8d25",
    scanSourceFailed: "\u6765\u6e90\u9519\u8bef",
    scanImported: "\u5bfc\u5165",
    scanSkipped: "\u8df3\u8fc7",
    scanUpdated: "\u66f4\u65b0",
    saving: "\u4fdd\u5b58\u4e2d",
    savingMemory: "\u4fdd\u5b58\u8bb0\u5fc6\u4e2d",
    scanning: "\u626b\u63cf\u4e2d",
    search: "\u641c\u7d22",
    searchPrefix: "\u641c\u7d22",
    searchSessions: "\u641c\u7d22\u4f1a\u8bdd",
    selectSession: "\u9009\u62e9\u4e00\u4e2a\u4f1a\u8bdd",
    sessions: "\u4f1a\u8bdd",
    sessionActions: "\u4f1a\u8bdd\u64cd\u4f5c",
    sessionState: "\u4f1a\u8bdd\u72b6\u6001",
    sessionStateHelp: "\u53ea\u80fd\u9009\u62e9\u4e00\u79cd\u72b6\u6001\uff1a\u5e38\u89c4\u3001\u6536\u85cf\u6216\u9690\u85cf\u3002",
    settings: "\u8bbe\u7f6e",
    settingsKicker: "\u5916\u89c2",
    sidebarClose: "\u5173\u95ed\u4f1a\u8bdd\u5e93",
    source: "\u6765\u6e90",
    sourceFile: "\u6e90\u6587\u4ef6",
    sourceMissing: "\u7f3a\u5c11\u6e90\u6587\u4ef6\u8def\u5f84\u3002",
    sourceOpened: "\u6e90\u6587\u4ef6\u5df2\u6253\u5f00\u3002",
    sourcePath: "\u6765\u6e90",
    sources: "\u6765\u6e90",
    statusDefault: "\u5e38\u89c4",
    statusFavorite: "\u6536\u85cf",
    statusHidden: "\u9690\u85cf",
    statusSavedDefault: "\u5df2\u8bbe\u4e3a\u5e38\u89c4\u3002",
    statusSavedFavorite: "\u5df2\u79fb\u5165\u6536\u85cf\u3002",
    statusSavedHidden: "\u5df2\u79fb\u5230\u9690\u85cf\u72b6\u6001\u5e76\u79fb\u51fa\u6536\u85cf\uff0c\u53ef\u4ece\u9690\u85cf\u89c6\u56fe\u6062\u590d\u3002",
    statusDefaultTitle: "\u5728\u5e38\u89c4\u4f1a\u8bdd\u5e93\u4e2d\u663e\u793a\u8fd9\u6b21\u4f1a\u8bdd\u3002",
    systemRole: "\u7cfb\u7edf",
    tags: "\u6807\u7b7e",
    theme: "\u4e3b\u9898",
    themeDim: "\u77f3\u58a8",
    themeLight: "\u4eae\u8272",
    transcript: "\u8f6c\u5f55",
    unknown: "\u672a\u77e5",
    unknownTime: "\u672a\u77e5\u65f6\u95f4",
    updated: "\u66f4\u65b0",
    userRole: "\u7528\u6237",
    waitingForSessions: "\u6b63\u5728\u7b49\u5f85\u672c\u5730\u4f1a\u8bdd\u52a0\u8f7d\u3002",
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

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadSavedSettings() {
  try {
    return normalizeSettings(JSON.parse(readLocalStorage(SETTINGS.storageKey) || "{}"));
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
  archivedOnly: false,
  latestStats: null,
  embedSidebarOpen: false,
  compactEmbed: false,
  activeDrawerSection: "sidebar-overview",
  settingsOpen: false,
  settings: loadSavedSettings(),
  hostBridgeReady: false,
  hostBridgeOrigin: ""
};

const urlParams = new URLSearchParams(window.location.search);
const isEmbedMode = urlParams.get("embed") === "1";
const isVsCodeHost = urlParams.get("host") === "vscode";
const hostToken = urlParams.get("hostToken") || "";
const HOST_TOKEN_PATTERN = /^[a-f0-9]{32}$/;
const pendingHostRequests = new Map();
let loadSequence = 0;
let selectSessionSequence = 0;
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
  topbarRight: document.querySelector(".topbar-right"),
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
  archive: "Hidden",
  brand: "ThreadVault",
  browser: "Open in browser",
  claude: "Claude",
  close: "Close",
  codex: "Codex",
  copilot: "Copilot",
  export: "Export copy",
  favorite: "Favorite",
  favoriteFilled: "Favorited",
  filter: "Filter",
  language: "Language",
  link: "Copy local link",
  memory: "Save note",
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
  archive: "statusHidden",
  browser: "openInBrowser",
  close: "dismissNotice",
  export: "export",
  favorite: "favoriteAction",
  favoriteFilled: "statusFavorite",
  filter: "filters",
  language: "language",
  link: "copyLink",
  memory: "saveMemory",
  messages: "messages",
  note: "notes",
  openSource: "sourceFile",
  overview: "overview",
  process: "processRole",
  restore: "statusDefault",
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
    <path d="M5.25 8.75h13.5v10.5H5.25z" />
    <path d="M7.25 5.25h9.5l2 3.5H5.25l2-3.5Z" />
    <path d="M9.25 12.25h5.5" />
    <path d="m10.25 14.25 1.75 1.75 1.75-1.75" />
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
    <path d="M4.75 12s2.5-4.25 7.25-4.25S19.25 12 19.25 12s-2.5 4.25-7.25 4.25S4.75 12 4.75 12Z" />
    <circle cx="12" cy="12" r="2.6" />
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

function normalizeAnnotationState(annotation = {}) {
  const archived = Boolean(annotation.archived);
  return {
    ...annotation,
    favorite: archived ? false : Boolean(annotation.favorite),
    archived,
    tags: Array.isArray(annotation.tags) ? annotation.tags : [],
    noteText: typeof annotation.noteText === "string" ? annotation.noteText : ""
  };
}

function normalizeAnnotationTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const tag of tags) {
    const text = String(tag || "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(text);
    if (normalized.length >= MAX_TAGS) {
      break;
    }
  }

  return normalized;
}

function normalizeAnnotationNote(value) {
  return String(value || "").trim().slice(0, MAX_NOTE_TEXT_LENGTH);
}

function annotationDraftChanged(annotation, tags, noteText) {
  const current = normalizeAnnotationState(annotation);
  return current.noteText !== noteText || JSON.stringify(current.tags) !== JSON.stringify(tags);
}

function annotationStatus(annotation = {}) {
  const normalized = normalizeAnnotationState(annotation);
  if (normalized.archived) {
    return "archived";
  }
  if (normalized.favorite) {
    return "favorite";
  }
  return "default";
}

function viewForAnnotationStatus(annotation = {}) {
  const status = annotationStatus(annotation);
  if (status === "favorite") {
    return "favorites";
  }
  if (status === "archived") {
    return "archived";
  }
  return "all";
}

function statusSavedMessage(annotation = {}) {
  const status = annotationStatus(annotation);
  if (status === "favorite") {
    return t("statusSavedFavorite");
  }
  if (status === "archived") {
    return t("statusSavedHidden");
  }
  return t("statusSavedDefault");
}

function statusViewModel(annotation = {}) {
  const status = annotationStatus(annotation);
  if (status === "favorite") {
    return {
      status,
      icon: "favoriteFilled",
      label: t("statusFavorite"),
      title: t("favoriteTitle"),
      className: "is-favorite"
    };
  }

  if (status === "archived") {
    return {
      status,
      icon: "archive",
      label: t("statusHidden"),
      title: t("archivedTitle"),
      className: "is-hidden"
    };
  }

  return {
    status,
    icon: "status",
    label: t("statusDefault"),
    title: t("statusDefaultTitle"),
    className: "is-default"
  };
}

function statusChipHtml(annotation = {}, options = {}) {
  const model = statusViewModel(annotation);
  if (options.skipDefault && model.status === "default") {
    return "";
  }

  const className = options.detail ? "detail-badge status-chip" : "session-status-chip";
  return `
    <span class="${className} ${model.className}" title="${escapeHtml(model.title)}">
      ${iconSlot(model.icon)}
      <span>${escapeHtml(model.label)}</span>
    </span>
  `;
}

function stateActionForStatus(status) {
  if (status === "favorite") {
    return "state-favorite";
  }
  if (status === "archived") {
    return "state-archived";
  }
  return "state-default";
}

function stateButtonTabIndex(currentStatus, status) {
  return currentStatus === status ? "0" : "-1";
}

function stateButtonLabel(currentStatus, status) {
  if (status === "favorite") {
    return t("statusFavorite");
  }
  if (status === "archived") {
    return t("statusHidden");
  }
  return t("statusDefault");
}

function annotationPayloadForStatus(status) {
  if (status === "favorite") {
    return {
      favorite: true,
      archived: false
    };
  }

  if (status === "archived") {
    return {
      favorite: false,
      archived: true
    };
  }

  return {
    favorite: false,
    archived: false
  };
}

function focusStateButton(status) {
  const action = stateActionForStatus(status);
  const button = elements.sessionDetail.querySelector(`[data-action="${action}"]`);
  try {
    button?.focus({ preventScroll: true });
  } catch {
    button?.focus();
  }
}

function actionStatusElement() {
  return elements.sessionDetail.querySelector("#action-status") || elements.sessionDetail.querySelector("#annotation-status");
}

function annotationStatusElement() {
  return elements.sessionDetail.querySelector("#annotation-status") || actionStatusElement();
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
  writeLocalStorage(SETTINGS.storageKey, JSON.stringify(state.settings));
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
      showToast(safeDisplayError(error), "warning");
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

function safeDisplayError(error, fallback = t("requestFailed")) {
  const raw = error instanceof Error ? error.message : String(error || "");
  const normalized = raw.replace(/\s+/g, " ").trim() || fallback;
  return truncateDisplayText(redactDisplaySensitiveText(redactDisplayLocalPaths(normalized)), 360) || fallback;
}

function redactDisplayLocalPaths(value) {
  return String(value || "")
    .replace(/\b[A-Za-z]:[\\/][^"'<>|?*\r\n]*?(?=\s+(?:api[_-]?key|email|password|secret|token)\s*[:=]|\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|$)/gi, "[LOCAL_PATH]")
    .replace(/\b[A-Za-z]:[\\/](?:[^<>:"|?*\s]+[\\/])*[^<>:"|?*\s]*/g, "[LOCAL_PATH]")
    .replace(/(?:^|\s)\\\\[^\\/"'<>|?*\r\n]+\\[^"'<>|?*\r\n]*?(?=\s+(?:api[_-]?key|email|password|secret|token)\s*[:=]|\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|$)/gi, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}[LOCAL_PATH]`;
    })
    .replace(/(?:^|\s)(?:\/Users|\/home|\/tmp|\/var\/folders)\/[^"'<>|\r\n]*?(?=\s+(?:api[_-]?key|email|password|secret|token)\s*[:=]|\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|$)/gi, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}[LOCAL_PATH]`;
    })
    .replace(/(?:^|\s)(?:\/Users|\/home|\/tmp|\/var\/folders)\/[^\s"'<>]+/g, (match) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}[LOCAL_PATH]`;
    });
}

function redactDisplaySensitiveText(value) {
  return String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/\b(?:sk|pk|ghp|gho|github_pat|glpat|xox[baprs])-[-_A-Za-z0-9]{12,}\b/g, "[SECRET]")
    .replace(/\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[-_A-Za-z0-9./+=]{8,}["']?/gi, "$1=[SECRET]");
}

function truncateDisplayText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function outputResultName(result) {
  return result?.fileName || basenameFromPath(result?.path) || t("unknown");
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

function normalizeSessionId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const sessionId = value.trim();
  if (!sessionId || sessionId.length > MAX_SESSION_ID_LENGTH || /[\u0000-\u001f\u007f]/u.test(sessionId)) {
    return "";
  }

  return sessionId;
}

function normalizeSearchQuery(value) {
  return String(value || "").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

function sessionIdFromUrl() {
  return normalizeSessionId(new URLSearchParams(window.location.search).get("session") || "");
}

function sessionUrl(sessionId = state.selectedSessionId) {
  const url = new URL(window.location.href);
  const normalizedSessionId = normalizeSessionId(sessionId || "");
  if (normalizedSessionId) {
    url.searchParams.set("session", normalizedSessionId);
  } else {
    url.searchParams.delete("session");
  }
  return url.toString();
}

function browserSessionUrl(sessionId = state.selectedSessionId) {
  const url = new URL(window.location.pathname || "/", window.location.origin);
  const normalizedSessionId = normalizeSessionId(sessionId || "");
  if (normalizedSessionId) {
    url.searchParams.set("session", normalizedSessionId);
  }
  return url.toString();
}

function updateSessionUrl(sessionId, replace = false) {
  const nextUrl = sessionUrl(sessionId);
  const method = replace ? "replaceState" : "pushState";
  if (nextUrl !== window.location.href) {
    window.history[method]({}, "", nextUrl);
  }
}

function restoreFocus(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch {
    // Focus restoration is best-effort and should not affect the original action.
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

  const previousFocus = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand("copy");
  } finally {
    textarea.remove();
    restoreFocus(previousFocus);
  }
}

if (isEmbedMode) {
  document.body.classList.add("embed-mode");
}

function applyHostMode() {
  if (elements.topbarRight) {
    elements.topbarRight.hidden = !isEmbedMode;
  }
  if (elements.openBrowserButton) {
    elements.openBrowserButton.hidden = !isEmbedMode;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSavedDrawerWidth() {
  const saved = Number(readLocalStorage(LAYOUT.storageKey));
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
  elements.drawerResizer?.setAttribute("aria-valuetext", `${nextWidth}px`);

  if (persist) {
    writeLocalStorage(LAYOUT.storageKey, String(nextWidth));
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

function isAllowedHostBridgeOrigin(origin) {
  if (!origin) {
    return false;
  }

  return (
    origin.startsWith("vscode-webview://") ||
    /^https:\/\/[a-z0-9-]+\.vscode-cdn\.net$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.vscode-webview\.net$/i.test(origin)
  );
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
    !isAllowedHostBridgeOrigin(event.origin) ||
    !payload ||
    payload.source !== "threadvault-host" ||
    payload.hostToken !== hostToken
  ) {
    return;
  }

  if (payload.type === "threadvault-host-ready") {
    state.hostBridgeReady = true;
    state.hostBridgeOrigin = event.origin;
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

function safeResponseErrorDetail(value) {
  const capped = truncateDisplayText(String(value || ""), MAX_RESPONSE_ERROR_TEXT_LENGTH);
  return safeDisplayError(capped, "");
}

function parseJsonPayload(text, response) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return {};
  }

  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    const detail = safeResponseErrorDetail(trimmed);
    if (!response.ok) {
      throw new Error(detail || `${t("requestFailed")}: ${response.status}`);
    }
    throw new Error(detail ? `${t("invalidResponse")}: ${detail}` : t("invalidResponse"));
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    if (!response.ok) {
      throw new Error(`${t("requestFailed")}: ${response.status}`);
    }
    throw new Error(t("invalidResponse"));
  }

  return payload;
}

async function requestJson(url, options = {}) {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let completed = false;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(t("requestTimedOut"));
    }
    window.clearTimeout(timeoutId);
    completed = true;
    throw error;
  }

  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(t("requestTimedOut"));
    }
    throw error;
  } finally {
    if (!completed) {
      window.clearTimeout(timeoutId);
      completed = true;
    }
  }

  const payload = parseJsonPayload(text, response);

  if (!response.ok) {
    throw new Error(safeDisplayError(payload.error || `${t("requestFailed")}: ${response.status}`));
  }

  return payload;
}

async function postJson(url, payload, options = {}) {
  const { headers = {}, ...requestOptions } = options;
  return requestJson(url, {
    ...requestOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(payload)
  });
}

function hasHostBridge() {
  return hasHostBridgeCandidate() && state.hostBridgeReady && Boolean(state.hostBridgeOrigin);
}

function runHostAction(type, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!hasHostBridge()) {
      reject(new Error(t("hostActionFailed")));
      return;
    }

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
      state.hostBridgeOrigin
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

  let leaving = false;
  let autoDismissId = 0;
  const removeToast = () => {
    if (leaving) {
      return;
    }
    leaving = true;
    window.clearTimeout(autoDismissId);
    toast.classList.add("is-leaving");
    window.setTimeout(() => {
      toast.remove();
    }, 180);
  };

  toast.querySelector(".toast-close")?.addEventListener("click", removeToast);
  elements.toastRegion.appendChild(toast);
  autoDismissId = window.setTimeout(removeToast, 4200);
}

function showActionError(error, status = actionStatusElement()) {
  const message = safeDisplayError(error);
  if (status) {
    status.textContent = message;
  }
  showToast(message, "warning");
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
  const view = currentStatusView();
  const visibleCount = stats.visibleSessionCount ?? Math.max((stats.sessionCount || 0) - (stats.archivedCount || 0), 0);

  return `
    <div class="filter-panel">
      <div class="filter-panel-title">
        ${iconSlot("filter")}
        <span>${escapeHtml(t("quickFilters"))}</span>
      </div>
      <div class="filter-pill-row">
        <button
          class="filter-pill ${view === "all" ? "is-active" : ""}"
          type="button"
          data-status-filter="all"
          aria-pressed="${view === "all" ? "true" : "false"}"
        >
          ${iconSlot("sessions")}
          <span class="filter-pill-label">${escapeHtml(t("all"))}</span>
          <span class="filter-pill-value">${visibleCount}</span>
        </button>
        <button
          class="filter-pill ${view === "favorites" ? "is-active" : ""}"
          type="button"
          data-status-filter="favorites"
          aria-pressed="${view === "favorites" ? "true" : "false"}"
        >
          ${iconSlot("favorite")}
          <span class="filter-pill-label">${escapeHtml(t("favorites"))}</span>
          <span class="filter-pill-value">${stats.favoriteCount || 0}</span>
        </button>
        <button
          class="filter-pill ${view === "archived" ? "is-active" : ""}"
          type="button"
          data-status-filter="archived"
          aria-pressed="${view === "archived" ? "true" : "false"}"
        >
          ${iconSlot("archive")}
          <span class="filter-pill-label">${escapeHtml(t("archived"))}</span>
          <span class="filter-pill-value">${stats.archivedCount || 0}</span>
        </button>
      </div>
    </div>
  `;
}

function currentStatusView() {
  if (state.archivedOnly) {
    return "archived";
  }

  if (state.favoritesOnly) {
    return "favorites";
  }

  return "all";
}

function setStatusView(view) {
  const nextView = ["all", "favorites", "archived"].includes(view) ? view : "all";
  state.favoritesOnly = nextView === "favorites";
  state.archivedOnly = nextView === "archived";
  state.includeArchived = nextView === "archived";

  if (elements.favoritesOnly) {
    elements.favoritesOnly.checked = state.favoritesOnly;
  }

  if (elements.includeArchived) {
    elements.includeArchived.checked = state.archivedOnly;
  }
}

function filterSessionsForCurrentStatusView(sessions = []) {
  const view = currentStatusView();
  if (view === "favorites") {
    return sessions.filter((session) => annotationStatus(session.annotation) === "favorite");
  }

  if (view === "archived") {
    return sessions.filter((session) => annotationStatus(session.annotation) === "archived");
  }

  return sessions;
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
      icon: "sessions"
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
    <button class="source-chip ${card.active ? "is-active" : ""}" type="button" data-source-filter="${escapeHtml(card.sourceId)}" aria-pressed="${card.active ? "true" : "false"}">
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
      const nextSourceFilter = node.getAttribute("data-source-filter") || "";
      state.sourceFilter = state.sourceFilter === nextSourceFilter ? "" : nextSourceFilter;
      setActiveSidebarSection("sidebar-sessions");
      elements.sessionsSection?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
      loadSessions().catch((error) => {
        showToast(safeDisplayError(error), "warning");
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
        setStatusView(currentStatusView() === filter ? "all" : filter);

        setActiveSidebarSection("sidebar-sessions");
        elements.sessionsSection?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest"
        });
        loadSessions().catch((error) => {
          showToast(safeDisplayError(error), "warning");
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
    const annotation = normalizeAnnotationState(session.annotation);
    const isActive = session.id === state.selectedSessionId;
    const activeClass = isActive ? "active" : "";
    const preview = stripInternalContext(session.searchSnippet || session.summary || "");
    const status = statusChipHtml(annotation, { skipDefault: true });
    const tags = tagHtml(annotation.tags);

    return `
      <article class="session-item ${activeClass}" data-session-id="${escapeHtml(session.id)}" role="button" tabindex="0" aria-current="${isActive ? "true" : "false"}">
        <div class="session-title-row">
          <h3>${escapeHtml(session.title)}</h3>
          ${status}
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

  const openSessionItem = (node) => {
    const sessionId = node.getAttribute("data-session-id");
    selectSession(sessionId);
    if (isEmbedMode && state.compactEmbed) {
      setEmbedSidebarOpen(false);
    }
  };

  for (const node of elements.sessionList.querySelectorAll(".session-item")) {
    node.addEventListener("click", () => {
      openSessionItem(node);
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSessionItem(node);
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
          <input class="annotation-input" id="tag-input" type="text" value="${escapeHtml(tagValue)}" maxlength="${MAX_TAG_INPUT_LENGTH}" placeholder="${escapeHtml(t("tags"))}" />
          <textarea class="annotation-textarea" id="note-input" maxlength="${MAX_NOTE_TEXT_LENGTH}" placeholder="${escapeHtml(t("note"))}">${escapeHtml(noteValue)}</textarea>
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

function sessionDetailRequestUrl(sessionId, messageOffset) {
  const params = new URLSearchParams({
    messageOffset: String(messageOffset),
    messageLimit: String(SESSION_MESSAGE_PAGE_SIZE)
  });
  return `/api/sessions/${encodeURIComponent(sessionId)}?${params.toString()}`;
}

function captureSessionDetailViewState() {
  return {
    scrollTop: elements.sessionDetail.querySelector(".detail-body")?.scrollTop || 0,
    tagValue: elements.sessionDetail.querySelector("#tag-input")?.value,
    noteValue: elements.sessionDetail.querySelector("#note-input")?.value,
    annotationOpen: Boolean(elements.sessionDetail.querySelector(".annotation-panel")?.open),
    rawStreamOpen: Boolean(elements.sessionDetail.querySelector(".lazy-process-stream")?.open)
  };
}

function restoreSessionDetailViewState(viewState) {
  if (!viewState) {
    return;
  }

  const tagInput = elements.sessionDetail.querySelector("#tag-input");
  const noteInput = elements.sessionDetail.querySelector("#note-input");
  const annotationPanel = elements.sessionDetail.querySelector(".annotation-panel");
  const rawStream = elements.sessionDetail.querySelector(".lazy-process-stream");
  const detailBody = elements.sessionDetail.querySelector(".detail-body");
  if (tagInput && typeof viewState.tagValue === "string") {
    tagInput.value = viewState.tagValue;
  }
  if (noteInput && typeof viewState.noteValue === "string") {
    noteInput.value = viewState.noteValue;
  }
  if (annotationPanel) {
    annotationPanel.open = viewState.annotationOpen;
  }
  if (rawStream) {
    rawStream.open = viewState.rawStreamOpen;
    if (rawStream.open && rawStream.dataset.loaded !== "1") {
      rawStream.dispatchEvent(new Event("toggle"));
    }
  }
  if (detailBody) {
    detailBody.scrollTop = viewState.scrollTop;
  }
}

function mergeSessionMessagePage(session, page, expectedOffset) {
  if (
    page?.id !== session.id ||
    !Array.isArray(page.messages) ||
    page.messagePage?.offset !== expectedOffset ||
    !Number.isSafeInteger(page.messagePage?.total)
  ) {
    throw new Error(t("invalidResponse"));
  }

  const messagesById = new Map((session.messages || []).map((message) => [message.id, message]));
  for (const message of page.messages) {
    messagesById.set(message.id, message);
  }

  return {
    ...session,
    ...page,
    messages: Array.from(messagesById.values()).sort((left, right) => left.ordinal - right.ordinal)
  };
}

function renderSessionDetail(session, viewState = null) {
  delete elements.sessionDetail.dataset.actionBusy;
  const annotation = normalizeAnnotationState(session.annotation);
  const currentStatus = annotationStatus(annotation);
  const displayTitle = compactTitle(session.title);
  const tagValue = annotation.tags.join(", ");
  const noteValue = annotation.noteText;
  const blocks = buildTranscriptBlocks(session.messages);
  const { secondary } = messageBucket(session.messages);
  const messageHtml = blocks.map(renderTranscriptBlock).join("");
  const loadedMessageCount = session.messages?.length || 0;
  const totalMessageCount = Number.isSafeInteger(session.messagePage?.total)
    ? session.messagePage.total
    : loadedMessageCount;
  const canOpenWorkspace = Boolean(session.workspacePath);
  const processHtml = secondary.length
    ? `
      <details class="process-panel lazy-process-stream">
        <summary>
          <span>${iconSlot("process")} ${escapeHtml(t("rawStream"))}</span>
          <span class="process-count">${secondary.length}</span>
        </summary>
        <div class="process-body"></div>
      </details>
    `
    : "";
  const paginationHtml = session.messagePage?.hasMore
    ? `
      <div class="transcript-pagination">
        <button class="secondary-button" id="load-more-messages" type="button">
          ${iconSlot("messages")}
          <span>${escapeHtml(t("loadMore"))}</span>
        </button>
        <div class="inline-status" id="transcript-pagination-status" aria-live="polite"></div>
      </div>
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
        ${statusChipHtml(annotation, { detail: true })}
      </div>
      ${tagHtml(annotation.tags)}
      <div class="detail-toolbar" aria-label="${escapeHtml(t("sessionActions"))}">
        <div class="action-cluster action-cluster-open">
          <span class="action-cluster-label" id="open-actions-label">${escapeHtml(t("openActions"))}</span>
          <div class="action-group action-group-open" role="group" aria-labelledby="open-actions-label">
            <button class="secondary-button action-button" type="button" data-action="open-source" title="${escapeHtml(t("sourceFile"))}">
              ${iconSlot("openSource")}
              <span>${escapeHtml(t("source"))}</span>
            </button>
            <button class="secondary-button action-button" type="button" data-action="open-workspace" ${canOpenWorkspace ? "" : "disabled"} title="${escapeHtml(canOpenWorkspace ? t("workspace") : t("noWorkspace"))}">
              ${iconSlot("workspace")}
              <span>${escapeHtml(t("workspace"))}</span>
            </button>
          </div>
        </div>
        <div class="action-cluster action-cluster-state">
          <span class="action-cluster-label" id="state-actions-label">${escapeHtml(t("sessionState"))}</span>
          <span class="visually-hidden" id="state-actions-help">${escapeHtml(t("sessionStateHelp"))}</span>
          <div class="action-group action-group-state" role="group" aria-labelledby="state-actions-label" aria-describedby="state-actions-help">
            <button class="state-button action-button ${currentStatus === "default" ? "is-active" : ""}" type="button" data-action="state-default" aria-pressed="${currentStatus === "default" ? "true" : "false"}" tabindex="${stateButtonTabIndex(currentStatus, "default")}" title="${escapeHtml(t("statusDefaultTitle"))}">
              ${iconSlot("status")}
              <span>${escapeHtml(stateButtonLabel(currentStatus, "default"))}</span>
            </button>
            <button class="state-button action-button ${currentStatus === "favorite" ? "is-active is-favorite" : ""}" type="button" data-action="state-favorite" aria-pressed="${currentStatus === "favorite" ? "true" : "false"}" tabindex="${stateButtonTabIndex(currentStatus, "favorite")}" title="${escapeHtml(t("favoriteTitle"))}">
              ${iconSlot(currentStatus === "favorite" ? "favoriteFilled" : "favorite")}
              <span>${escapeHtml(stateButtonLabel(currentStatus, "favorite"))}</span>
            </button>
            <button class="state-button action-button ${currentStatus === "archived" ? "is-active is-hidden" : ""}" type="button" data-action="state-archived" aria-pressed="${currentStatus === "archived" ? "true" : "false"}" tabindex="${stateButtonTabIndex(currentStatus, "archived")}" title="${escapeHtml(t("archivedTitle"))}">
              ${iconSlot("archive")}
              <span>${escapeHtml(stateButtonLabel(currentStatus, "archived"))}</span>
            </button>
          </div>
        </div>
        <div class="action-cluster action-cluster-output">
          <span class="action-cluster-label" id="output-actions-label">${escapeHtml(t("outputActions"))}</span>
          <span class="visually-hidden" id="output-actions-help">${escapeHtml(t("outputActionsHelp"))}</span>
          <div class="action-group action-group-output" role="group" aria-labelledby="output-actions-label" aria-describedby="output-actions-help">
            <button class="ghost-button action-button" type="button" data-action="export-markdown" title="${escapeHtml(t("exportTitle"))}">
              ${iconSlot("export")}
              <span>${escapeHtml(t("export"))}</span>
            </button>
            <button class="ghost-button action-button" type="button" data-action="save-memory" title="${escapeHtml(t("saveMemoryTitle"))}">
              ${iconSlot("memory")}
              <span>${escapeHtml(t("saveMemory"))}</span>
            </button>
            <button class="ghost-button action-button" type="button" data-action="copy-link" title="${escapeHtml(t("copyLinkTitle"))}">
              ${iconSlot("link")}
              <span>${escapeHtml(t("copyLink"))}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="inline-status detail-action-status" id="action-status" aria-live="polite"></div>
      ${annotationPanelHtml(tagValue, noteValue)}
    </header>
    <section class="detail-body">
      <div class="transcript-shell">
        <div class="transcript-header">
          <div class="transcript-heading-copy">
            <h3 class="transcript-title">${escapeHtml(t("transcript"))}</h3>
            <span class="transcript-progress">${loadedMessageCount} / ${totalMessageCount} ${escapeHtml(t("messages"))}</span>
          </div>
          ${iconSlot("messages", "hero-source-icon transcript-slot")}
        </div>
        ${messageHtml || `<p class="muted">${escapeHtml(t("noTranscript"))}</p>`}
        ${processHtml}
        ${paginationHtml}
      </div>
    </section>
  `;

  elements.sessionDetail.querySelector("#save-note-button")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const label = button.querySelector("span:last-child");
    const originalLabel = label?.textContent || t("save");

    try {
      button.disabled = true;
      if (label) {
        label.textContent = t("saving");
      }

      const tags = normalizeAnnotationTags(elements.sessionDetail.querySelector("#tag-input").value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean));
      const noteText = normalizeAnnotationNote(elements.sessionDetail.querySelector("#note-input").value);
      if (!annotationDraftChanged(annotation, tags, noteText)) {
        const status = annotationStatusElement();
        const message = t("noChangesToSave");
        if (status) {
          status.textContent = message;
        }
        showToast(message, "success");
        return;
      }
      await saveAnnotation(session.id, { tags, noteText });
      showToast(`${t("saved")}.`, "success");
    } catch (error) {
      const message = safeDisplayError(error);
      const status = annotationStatusElement();
      if (status) {
        status.textContent = message;
      }
      showToast(message, "warning");
    } finally {
      button.disabled = false;
      if (label) {
        label.textContent = originalLabel;
      }
    }
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

  const rawStream = elements.sessionDetail.querySelector(".lazy-process-stream");
  rawStream?.addEventListener("toggle", () => {
    if (!rawStream.open || rawStream.dataset.loaded === "1") {
      return;
    }

    const body = rawStream.querySelector(".process-body");
    if (body) {
      body.innerHTML = secondary.map(renderMessageCard).join("");
      rawStream.dataset.loaded = "1";
    }
  });

  const loadMoreButton = elements.sessionDetail.querySelector("#load-more-messages");
  loadMoreButton?.addEventListener("click", async () => {
    const messageOffset = session.messagePage?.nextOffset;
    if (!Number.isSafeInteger(messageOffset)) {
      return;
    }

    const sequence = selectSessionSequence;
    const label = loadMoreButton.querySelector("span:last-child");
    const originalLabel = label?.textContent || t("loadMore");
    loadMoreButton.disabled = true;
    if (label) {
      label.textContent = t("loadingMore");
    }

    try {
      const page = await requestJson(sessionDetailRequestUrl(session.id, messageOffset));
      if (sequence !== selectSessionSequence || state.selectedSessionId !== session.id) {
        return;
      }

      const nextSession = mergeSessionMessagePage(session, page, messageOffset);
      const nextViewState = captureSessionDetailViewState();
      renderSessionDetail(nextSession, nextViewState);
      restoreFocus(elements.sessionDetail.querySelector("#load-more-messages"));
    } catch (error) {
      const status = elements.sessionDetail.querySelector("#transcript-pagination-status");
      showActionError(error, status);
    } finally {
      if (loadMoreButton.isConnected) {
        loadMoreButton.disabled = false;
        if (label) {
          label.textContent = originalLabel;
        }
      }
    }
  });

  elements.sessionDetail.querySelector(".action-group-state")?.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) {
      return;
    }

    const buttons = Array.from(elements.sessionDetail.querySelectorAll(".action-group-state .state-button"));
    const currentIndex = buttons.indexOf(event.target.closest(".state-button"));
    if (currentIndex < 0) {
      return;
    }

    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    }

    buttons[nextIndex]?.focus({ preventScroll: true });
  });

  elements.sessionDetail.onclick = async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) {
      return;
    }
    if (elements.sessionDetail.dataset.actionBusy === "1") {
      return;
    }

    const status = actionStatusElement();
    const action = button.getAttribute("data-action");
    const originalLabel = button.querySelector("span:last-child")?.textContent || "";
    const actionButtons = Array.from(elements.sessionDetail.querySelectorAll("[data-action]"));
    const previousDisabled = new Map(actionButtons.map((actionButton) => [actionButton, actionButton.disabled]));

    const setBusy = (text) => {
      elements.sessionDetail.dataset.actionBusy = "1";
      for (const actionButton of actionButtons) {
        actionButton.disabled = true;
      }
      const label = button.querySelector("span:last-child");
      if (label) {
        label.textContent = text;
      }
    };

    const resetBusy = () => {
      delete elements.sessionDetail.dataset.actionBusy;
      for (const actionButton of actionButtons) {
        actionButton.disabled = previousDisabled.get(actionButton) || false;
      }
      const label = button.querySelector("span:last-child");
      if (label) {
        label.textContent = originalLabel;
      }
    };

    if (action === "open-source") {
      try {
        if (!session.sourcePath) {
          showActionError(t("sourceMissing"), status);
          return;
        }

        setBusy(t("opening"));
        const result = hasHostBridge()
          ? await runHostAction("threadvault-open-path", {
            path: session.sourcePath,
            target: "source"
          }, 15000)
          : await postJson("/api/open", {
            sessionId: session.id,
            target: "source"
          });

        if (!result?.ok) {
          showActionError(result?.error || t("openSourceFailed"), status);
        } else {
          const message = result.message || t("sourceOpened");
          if (status) {
            status.textContent = message;
          }
          showToast(message, "success");
        }
      } catch (error) {
        showActionError(error, status);
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "open-workspace") {
      try {
        if (!session.workspacePath) {
          showActionError(t("workspaceMissing"), status);
          return;
        }

        setBusy(t("opening"));
        const result = hasHostBridge()
          ? await runHostAction("threadvault-open-path", {
            path: session.workspacePath,
            target: "workspace"
          }, 15000)
          : await postJson("/api/open", {
            sessionId: session.id,
            target: "workspace"
          });

        if (!result?.ok) {
          showActionError(result?.error || t("openWorkspaceFailed"), status);
        } else {
          const message = result.message || t("workspaceOpenRequested");
          if (status) {
            status.textContent = message;
          }
          showToast(message, "success");
        }
      } catch (error) {
        showActionError(error, status);
      } finally {
        resetBusy();
      }
      return;
    }

    const statusByAction = {
      "state-default": "default",
      "state-favorite": "favorite",
      "state-archived": "archived"
    };
    const nextStatus = statusByAction[action];
    if (nextStatus) {
      if (currentStatus === nextStatus) {
        return;
      }

      try {
        setBusy(t("saving"));
        const nextAnnotation = await saveAnnotation(session.id, annotationPayloadForStatus(nextStatus));
        const message = statusSavedMessage(nextAnnotation);
        showToast(message, "success");
        focusStateButton(annotationStatus(nextAnnotation));
      } catch (error) {
        showActionError(error, status);
      } finally {
        resetBusy();
      }
      return;
    }

    if (action === "export-markdown") {
      setBusy(t("exporting"));
      try {
        const result = await postJson("/api/export", { sessionId: session.id });
        if (!result.ok) {
          showActionError(result.error || t("exportFailed"), status);
          return;
        }
        const outputName = outputResultName(result);
        const message = `${t("exportedTo")} ${outputName}`;
        if (status) {
          status.textContent = message;
        }
        showToast(message, "success");
      } catch (error) {
        showActionError(error, status);
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
          showActionError(result.error || t("memoryFailed"), status);
          return;
        }
        const outputName = outputResultName(result);
        const message = `${t("memorySaved")} ${outputName}`;
        if (status) {
          status.textContent = message;
        }
        showToast(message, "success");
      } catch (error) {
        showActionError(error, status);
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
          showActionError(t("copyFailed"), status);
          return;
        }
        showToast(t("copySuccess"), "success");
        if (status) {
          status.textContent = t("copySuccess");
        }
      } catch (error) {
        showActionError(error, status);
      } finally {
        resetBusy();
      }
    }
  };

  restoreSessionDetailViewState(viewState);
}

function currentListStateLabel() {
  const segments = [];
  const normalizedQuery = normalizeSearchQuery(state.query);

  if (state.sourceFilter) {
    segments.push(state.sourceFilter.charAt(0).toUpperCase() + state.sourceFilter.slice(1));
  } else {
    segments.push(t("allSources"));
  }

  if (state.favoritesOnly) {
    segments.push(t("favorites"));
  }

  if (state.archivedOnly) {
    segments.push(t("archived"));
  }

  if (normalizedQuery) {
    segments.push(`${t("searchPrefix")}: "${normalizedQuery}"`);
  }

  return segments.join(" / ");
}

function renderNoSessionSelected() {
  updateSessionUrl("", true);
  elements.sessionDetail.classList.add("empty-state");
  elements.sessionDetail.innerHTML = `
    <h2>${escapeHtml(t("selectSession"))}</h2>
    <p class="muted">${escapeHtml(t("noSessionSelected"))}</p>
  `;
}

async function loadSessions() {
  const sequence = ++loadSequence;
  const params = new URLSearchParams();
  const normalizedQuery = normalizeSearchQuery(state.query);
  state.query = normalizedQuery;
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }
  if (state.sourceFilter) {
    params.set("sourceId", state.sourceFilter);
  }
  if (state.favoritesOnly) {
    params.set("favoritesOnly", "1");
  }
  if (state.archivedOnly) {
    params.set("archivedOnly", "1");
    params.set("includeArchived", "1");
  } else if (state.includeArchived) {
    params.set("includeArchived", "1");
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const payload = await requestJson(`/api/sessions${query}`);
  if (sequence !== loadSequence) {
    return;
  }

  state.sessions = filterSessionsForCurrentStatusView(payload.sessions || []);
  renderStats(payload.stats || {});

  const urlSessionId = sessionIdFromUrl();
  if (!state.selectedSessionId && urlSessionId) {
    state.selectedSessionId = urlSessionId;
  }
  const preserveUrlSelection = Boolean(urlSessionId && state.selectedSessionId === urlSessionId);

  if (!state.selectedSessionId && state.sessions.length > 0) {
    state.selectedSessionId = state.sessions[0].id;
  }

  if (state.selectedSessionId && !preserveUrlSelection && !state.sessions.find((session) => session.id === state.selectedSessionId)) {
    state.selectedSessionId = state.sessions[0]?.id || null;
  }

  renderSessionList();

  if (state.selectedSessionId) {
    const selectedSessionId = state.selectedSessionId;
    try {
      await selectSession(selectedSessionId, false);
      updateSessionUrl(state.selectedSessionId, true);
    } catch (error) {
      if (!preserveUrlSelection || selectedSessionId !== urlSessionId) {
        throw error;
      }

      showToast(safeDisplayError(error), "warning");
      state.selectedSessionId = state.sessions[0]?.id || null;
      renderSessionList();
      if (state.selectedSessionId) {
        await selectSession(state.selectedSessionId, false);
        updateSessionUrl(state.selectedSessionId, true);
      } else {
        renderNoSessionSelected();
      }
    }
  } else {
    renderNoSessionSelected();
  }
}

async function saveAnnotation(sessionId, payload) {
  const status = annotationStatusElement();
  if (status) {
    status.textContent = `${t("saving")}...`;
  }

  const isStateChange = Object.prototype.hasOwnProperty.call(payload, "favorite") || Object.prototype.hasOwnProperty.call(payload, "archived");
  const result = await postJson("/api/session-meta", {
    sessionId,
    ...payload
  });

  if (!result.ok) {
    throw new Error(result.error || t("saveFailed"));
  }

  const annotation = normalizeAnnotationState(result.annotation);
  if (isStateChange) {
    setStatusView(viewForAnnotationStatus(annotation));
    state.selectedSessionId = sessionId;
  }

  await loadSessions();

  const nextStatus = isStateChange ? actionStatusElement() : annotationStatusElement();
  if (nextStatus) {
    nextStatus.textContent = isStateChange ? statusSavedMessage(annotation) : `${t("saved")}.`;
  }

  return annotation;
}

async function selectSession(sessionId, rerenderList = true, syncUrl = true) {
  const normalizedSessionId = normalizeSessionId(sessionId || "");
  if (!normalizedSessionId) {
    return;
  }

  const sequence = ++selectSessionSequence;
  state.selectedSessionId = normalizedSessionId;
  if (syncUrl) {
    updateSessionUrl(normalizedSessionId, !rerenderList);
  }
  if (rerenderList) {
    renderSessionList();
  }

  const session = await requestJson(sessionDetailRequestUrl(normalizedSessionId, 0));
  if (sequence !== selectSessionSequence || state.selectedSessionId !== normalizedSessionId) {
    return;
  }
  renderSessionDetail(session);
}

async function runScan() {
  elements.scanButton.disabled = true;
  setButtonLabel(elements.scanButton, t("scanning"));
  try {
    const result = await requestJson("/api/scan", {
      method: "POST",
      timeoutMs: SCAN_REQUEST_TIMEOUT_MS
    });
    await loadSessions();
    const status = [
      `${t("scanImported")} ${result.importedSessions || 0}`,
      `${t("scanUpdated")} ${result.updatedSessions || 0}`,
      `${t("scanSkipped")} ${result.skippedSessions || 0}`,
      `${t("scanFailed")} ${result.failedSessions || 0}`,
      `${t("scanSourceFailed")} ${result.failedSources || 0}`
    ].join(", ");
    showToast(status, (result.failedSessions || result.failedSources) ? "warning" : "success");
  } finally {
    elements.scanButton.disabled = false;
    setButtonLabel(elements.scanButton, t("rescan"));
  }
}

elements.scanButton.addEventListener("click", () => {
  runScan().catch((error) => {
    showToast(safeDisplayError(error), "warning");
  });
});

elements.searchInput.addEventListener("input", () => {
  state.query = normalizeSearchQuery(elements.searchInput.value);
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    loadSessions().catch((error) => {
      showToast(safeDisplayError(error), "warning");
    });
  }, 140);
});

elements.favoritesOnly.addEventListener("change", () => {
  setStatusView(elements.favoritesOnly.checked ? "favorites" : "all");
  loadSessions().catch((error) => {
    showToast(safeDisplayError(error), "warning");
  });
});

elements.includeArchived.addEventListener("change", () => {
  setStatusView(elements.includeArchived.checked ? "archived" : "all");
  loadSessions().catch((error) => {
    showToast(safeDisplayError(error), "warning");
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
    } else {
      window.location.href = fallbackUrl;
    }
  } catch (error) {
    if (isEmbedMode) {
      window.location.href = fallbackUrl;
      return;
    }
    showToast(safeDisplayError(error), "warning");
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
    showToast(safeDisplayError(error), "warning");
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
    <p>${escapeHtml(safeDisplayError(error))}</p>
  `;
});
