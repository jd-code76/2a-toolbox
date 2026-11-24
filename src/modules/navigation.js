
'use strict';

import { state } from './state.js';
import {
    renderAbout,
    renderAmmo,
    renderAmmoThresholds,
    renderCleanings,
    renderDashboard,
    renderGuns,
    renderData,
    renderSessions
} from './renderers.js';
import { renderPermits, maybeNotifyExpiring } from './permits.js';
import { db } from './database.js';

/**
 * Page identifier -> renderer. Kept at module scope so page validity can be
 * checked (e.g. when restoring the last page after a refresh) without rendering.
 */
const PAGE_RENDERERS = {
    dashboard: renderDashboard,
    guns: renderGuns,
    ammo: renderAmmo,
    sessions: renderSessions,
    cleanings: renderCleanings,
    data: renderData,
    // Legacy hash. Old bookmarks (#import) and a stored lastPage of "import"
    // still resolve; navigate() rewrites them to the canonical "data".
    import: renderData,
    settings: renderAmmoThresholds,
    permits: renderPermits,
    about: renderAbout
};

/**
 * Page shown when nothing else is known
 */
export const DEFAULT_PAGE = 'dashboard';

/**
 * Old page names that still need to resolve, mapped to their current name
 */
const LEGACY_PAGES = { import: 'data' };

/**
 * Map a legacy page identifier onto its current name
 * @param {string} page
 * @returns {string}
 */
export function normalizePage(page) {
    return LEGACY_PAGES[page] || page;
}

/**
 * All navigable page identifiers (canonical names only)
 */
export const VALID_PAGES = Object.keys(PAGE_RENDERERS).filter(page => !LEGACY_PAGES[page]);

/**
 * Callbacks run after a page renders, used to re-apply saved filters to the
 * freshly written markup. Kept as a registry so navigation stays free of
 * imports from the pages it renders (no module cycles).
 */
const afterRenderHooks = new Set();

/**
 * Register a post-render callback
 * @param {(page: string) => void} fn
 */
export function onAfterRender(fn) {
    if (typeof fn === 'function') afterRenderHooks.add(fn);
}

/**
 * Run every registered post-render callback, isolating failures so a broken
 * filter cannot stop navigation.
 * @param {string} page
 */
function runAfterRenderHooks(page) {
    afterRenderHooks.forEach(fn => {
        try {
            fn(page);
        } catch (_) {
            // A filter failing to re-apply must not break the rendered page.
        }
    });
}

/**
 * Check whether a string is a real page identifier
 * @param {string} page
 * @returns {boolean}
 */
export function isValidPage(page) {
    return typeof page === 'string' && Object.prototype.hasOwnProperty.call(PAGE_RENDERERS, page);
}

/**
 * Read the page identifier out of the URL hash (#guns -> "guns")
 * @returns {string|null} A valid page identifier, or null
 */
export function pageFromUrl() {
    if (typeof location === 'undefined') return null;

    let raw = (location.hash || '').replace(/^#\/?/, '');
    try {
        raw = decodeURIComponent(raw);
    } catch (_) {
        // Malformed escape sequence: use it as-is
    }

    const page = normalizePage(raw.split('?')[0].trim());
    return isValidPage(page) ? page : null;
}

/**
 * Write the current page into the URL so a refresh (and the back/forward
 * buttons) land on the same view.
 * @param {string} page - Page identifier
 * @param {boolean} replace - Replace the current history entry instead of adding one
 */
function syncUrl(page, replace) {
    if (typeof location === 'undefined' || typeof history === 'undefined') return;

    const target = `#${page}`;
    if (location.hash === target) return;

    try {
        if (replace) {
            history.replaceState({ page }, '', target);
        } else {
            history.pushState({ page }, '', target);
        }
    } catch (_) {
        // file:// or a sandboxed context rejects pushState: a plain hash
        // assignment still gives us the reload behaviour.
        location.hash = page;
    }
}

/**
 * Navigate to a different page/view
 * @param {string} page - Page identifier (dashboard, guns, ammo, etc.)
 * @param {object} [options]
 * @param {boolean} [options.replace] - Replace the history entry (used on boot)
 * @param {boolean} [options.fromHistory] - Navigation came from the URL itself
 */
export function navigate(page, options = {}) {
    page = normalizePage(page);
    if (!isValidPage(page)) page = DEFAULT_PAGE;

    const previousPage = state.currentPage;
    state.currentPage = page;

    // Keep the address bar in step with the view before anything renders. If a
    // renderer throws (bad record, missing node) the URL still points at the
    // page the user asked for, so a refresh does not fall back to dashboard.
    // Skipped when the URL is what sent us here, otherwise back/forward would
    // keep pushing new entries.
    if (!options.fromHistory) {
        syncUrl(page, options.replace === true);
    }

    // Mirror the page synchronously so a reload immediately after this
    // navigation still has a fallback when the URL carries no hash.
    state.lastPage = page;
    if (typeof db.rememberPage === 'function') db.rememberPage(page);

    // Update active nav item styling
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Render page content
    const mainContent = document.getElementById('main-content');
    const renderer = PAGE_RENDERERS[page];
    mainContent.innerHTML = renderer ? renderer() : '';

    // Re-apply saved filters to the markup that was just written, so a restored
    // gun/ammo/log filter matches the list instead of only the dropdown.
    runAfterRenderHooks(page);

    if (page === 'permits' || page === 'dashboard') {
        maybeNotifyExpiring();
    }

    // Attach event listeners for import page (drag & drop)
    attachImportEventListeners();

    // Scroll to top when navigating to new page
    const mainElement = document.querySelector('.main');
    if (mainElement) {
        mainElement.scrollTop = 0;
    }

    // Remember the page as a fallback for when the URL carries no hash (bare
    // install link, or a browser that stripped it).
    if (previousPage !== page) {
        // Fire-and-forget: navigation must never wait on (or fail from) storage.
        Promise.resolve()
            .then(() => db.save())
            .catch(() => {});
    }
}

let routerStarted = false;

/**
 * Keep the rendered page in sync with back/forward navigation and manual
 * hash edits. Call once, after the first navigate().
 */
export function startRouter() {
    if (routerStarted || typeof window === 'undefined') return;
    routerStarted = true;

    const handleUrlChange = () => {
        const page = pageFromUrl();
        if (page && page !== state.currentPage) {
            navigate(page, { fromHistory: true });
        }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
}

/**
 * Attach event listeners for file import functionality
 * Must be called after import page is rendered
 */
function attachImportEventListeners() {
    if (state.currentPage !== 'data') return;

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag over effect
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    // Remove drag over effect
    dropZone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });

    // Handle file drop
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Access importData through global app object
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    // Handle file selection via input
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Access importData through global app object
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
}
