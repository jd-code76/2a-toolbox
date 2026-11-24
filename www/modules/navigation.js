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
const PAGE_RENDERERS = {
    dashboard: renderDashboard,
    guns: renderGuns,
    ammo: renderAmmo,
    sessions: renderSessions,
    cleanings: renderCleanings,
    data: renderData,
    import: renderData,
    settings: renderAmmoThresholds,
    permits: renderPermits,
    about: renderAbout
};
export const DEFAULT_PAGE = 'dashboard';
const LEGACY_PAGES = { import: 'data' };
export function normalizePage(page) {
    return LEGACY_PAGES[page] || page;
}
export const VALID_PAGES = Object.keys(PAGE_RENDERERS).filter(page => !LEGACY_PAGES[page]);
const afterRenderHooks = new Set();
export function onAfterRender(fn) {
    if (typeof fn === 'function') afterRenderHooks.add(fn);
}
function runAfterRenderHooks(page) {
    afterRenderHooks.forEach(fn => {
        try {
            fn(page);
        } catch (_) {
        }
    });
}
export function isValidPage(page) {
    return typeof page === 'string' && Object.prototype.hasOwnProperty.call(PAGE_RENDERERS, page);
}
export function pageFromUrl() {
    if (typeof location === 'undefined') return null;
    let raw = (location.hash || '').replace(/^#\/?/, '');
    try {
        raw = decodeURIComponent(raw);
    } catch (_) {
    }
    const page = normalizePage(raw.split('?')[0].trim());
    return isValidPage(page) ? page : null;
}
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
        location.hash = page;
    }
}
export function navigate(page, options = {}) {
    page = normalizePage(page);
    if (!isValidPage(page)) page = DEFAULT_PAGE;
    const previousPage = state.currentPage;
    state.currentPage = page;
    if (!options.fromHistory) {
        syncUrl(page, options.replace === true);
    }
    state.lastPage = page;
    if (typeof db.rememberPage === 'function') db.rememberPage(page);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    const mainContent = document.getElementById('main-content');
    const renderer = PAGE_RENDERERS[page];
    mainContent.innerHTML = renderer ? renderer() : '';
    runAfterRenderHooks(page);
    if (page === 'permits' || page === 'dashboard') {
        maybeNotifyExpiring();
    }
    attachImportEventListeners();
    const mainElement = document.querySelector('.main');
    if (mainElement) {
        mainElement.scrollTop = 0;
    }
    if (previousPage !== page) {
        Promise.resolve()
            .then(() => db.save())
            .catch(() => {});
    }
}
let routerStarted = false;
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
function attachImportEventListeners() {
    if (state.currentPage !== 'data') return;
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
}