
'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { clearFilterControls, closeModal, filterSessionItems, isAmmoStatusFilter, resetAmmoStatusFilter } from './utils.js';
import { navigate, onAfterRender } from './navigation.js';
import {
    applyGunFilter,
    confirmDeleteGun,
    deleteGun,
    markGunAsSold,
    openEditGun,
    returnGunToInventory,
    showGunDetail
} from './guns.js';
import {
    confirmDeleteSession,
    deleteSession,
    openLogSession,
    openEditSession,
    saveSession
} from './sessions.js';
import {
    applyAmmoFilter,
    confirmDeleteAmmo,
    deleteAmmo,
    openEditAmmo,
    showAmmoDetail,
    updateAmmoRounds
} from './ammo.js';
import {
    confirmDeletePermit,
    deletePermit,
    enableBrowserNotifications,
    openAddPermit,
    openEditPermit,
    openRenewPermit,
    savePermit,
    setPermitLeadDays,
    togglePermitNotify
} from './permits.js';

/**
 * Re-apply the saved gun/ammo/log filters to a page that was just rendered.
 * The dropdowns already show the stored value; this makes the list agree with
 * them on load instead of showing every record.
 * @param {string} page - page identifier that was just rendered
 */
export function applyStoredFilters(page) {
    if (page === 'guns') {
        const select = document.getElementById('gun-filter-select');
        const filter = (select && select.value) || state.gunFilter || 'all';
        const query = (document.getElementById('gun-search')?.value || '').toLowerCase();
        applyGunFilter(filter, query);
        return;
    }

    if (page === 'ammo') {
        const select = document.getElementById('ammo-filter-select');
        const filter = (select && select.value) || state.ammoFilter || 'all';
        const query = (document.getElementById('ammo-search')?.value || '').toLowerCase();
        applyAmmoFilter(filter, query, state.ammoCategory || 'all');
        return;
    }

    const logSelect = page === 'sessions'
        ? document.getElementById('session-filter-select')
        : page === 'cleanings'
            ? document.getElementById('cleaning-filter-select')
            : null;

    if (logSelect) filterSessionItems(logSelect);
}

// Register at module evaluation, not from initializeEventListeners(): main.js
// calls navigate() for the first page *before* initializing listeners, so a
// hook registered there would miss the refresh render entirely and the cards
// would show every record while the dropdowns still displayed the saved value.
onAfterRender(applyStoredFilters);

/**
 * Initialize all event listeners
 */
export function initializeEventListeners() {
    // Global click event handler using event delegation
    document.addEventListener('click', handleGlobalClick);

    // Search input handler
    document.addEventListener('input', handleSearchInput);

    // Select-based controls (select elements do not emit the global click action)
    document.addEventListener('change', e => {
        const leadDaysSelect = e.target.closest('[data-action="set-permit-lead-days"]');
        if (leadDaysSelect) {
            setPermitLeadDays(leadDaysSelect.value);
            return;
        }

        const ammoFilterSelect = e.target.closest('#ammo-filter-select');
        if (ammoFilterSelect) {
            state.ammoFilter = ammoFilterSelect.value || 'all';
            db.save();
            const searchQuery = (document.getElementById('ammo-search')?.value || '').toLowerCase();
            applyAmmoFilter(ammoFilterSelect.value, searchQuery, state.ammoCategory || 'all');
            return;
        }

        const gunFilterSelect = e.target.closest('#gun-filter-select');
        if (gunFilterSelect) {
            state.gunFilter = gunFilterSelect.value || 'all';
            db.save();
            applyGunFilter(gunFilterSelect.value, (document.getElementById('gun-search')?.value || '').toLowerCase());
            return;
        }

        const hideSoldToggle = e.target.closest('#hide-sold-toggle');
        if (hideSoldToggle) {
            state.hideSold = hideSoldToggle.checked;
            db.save();
            const gunSelect = document.getElementById('gun-filter-select');
            applyGunFilter(gunSelect ? gunSelect.value : 'all', (document.getElementById('gun-search')?.value || '').toLowerCase());
            return;
        }

        const sessionFilterSelect = e.target.closest('.filter-select[data-list]');
        if (sessionFilterSelect) {
            if (sessionFilterSelect.id === 'session-filter-select') {
                state.sessionFilter = sessionFilterSelect.value;
            } else if (sessionFilterSelect.id === 'cleaning-filter-select') {
                state.cleaningFilter = sessionFilterSelect.value;
            }
            db.save();
            filterSessionItems(sessionFilterSelect);
        }
    });

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', handleModalOverlayClick);
    });

    // Mobile overlay click to close sidebar
    document.addEventListener('click', handleMobileOverlayClick);

    // Close mobile menu when nav item is clicked on mobile
    document.addEventListener('click', handleNavItemClick);

    // Import file handling
    initializeImportHandlers();
}

/**
 * Initialize import file handlers (drop zone and file input)
 */
function initializeImportHandlers() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone && fileInput) {
        // Click drop zone to open file picker
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag over effect
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        // Drag leave effect
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        // Drop file handler
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                window.app.confirmImport(); // Show confirmation instead of auto-import
            }
        });

        // File input change handler
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                window.app.confirmImport(); // Show confirmation instead of auto-import
            }
        });
    }
}

/**
 * Global click event handler using event delegation
 * Handles all button clicks, navigation, and interactions
 */
function handleGlobalClick(e) {
    const target = e.target.closest(
        '[data-action], [data-modal], [data-page], [data-gun-id], [data-ammo-id], [data-permit-id], .filter-pill, .gun-card, .ammo-card, .session-item'
    );

    if (!target) return;

    const action = target.getAttribute('data-action');
    const modal = target.getAttribute('data-modal');
    const page = target.getAttribute('data-page');
    const gunId = target.getAttribute('data-gun-id');
    const ammoId = target.getAttribute('data-ammo-id');

    // Handle modal close buttons
    if (modal) {
        closeModal(modal);
    }
    // Handle navigation
    else if (page) {
        navigate(page);
    }
    // Handle gun card clicks
    else if (target.classList.contains('gun-card')) {
        showGunDetail(gunId);
    }
    // Handle ammo card clicks
    else if (target.classList.contains('ammo-card')) {
        showAmmoDetail(ammoId);
    }
    // Handle session item clicks (navigate to gun detail)
    else if (target.classList.contains('session-item') && gunId) {
        showGunDetail(gunId);
    }
    // Handle all data-action buttons
    else if (action) {
        handleActionClick(target, action, gunId, ammoId);
    }
    // Handle ammo type pills
    else if (target.classList.contains('filter-pill')) {
        handleAmmoPillClick(target);
    }
}

/**
 * Handle action button clicks
 */
function handleActionClick(target, action, gunId, ammoId) {
    const sessionType = target.getAttribute('data-session-type');
    const sessionIndex = Number(target.getAttribute('data-session-index'));

    switch (action) {
        case 'log-range':
            openLogSession(gunId, 'range');
            break;
        case 'log-cleaning':
            openLogSession(gunId, 'cleaning');
            break;
        case 'save-session':
            saveSession(gunId, sessionType);
            break;
        case 'edit-gun':
            openEditGun(gunId);
            break;
        case 'delete-gun':
            confirmDeleteGun(gunId);
            break;
        case 'confirm-delete-gun':
            deleteGun(gunId);
            break;
        case 'mark-sold':
            markGunAsSold(gunId);
            break;
        case 'return-inventory':
            returnGunToInventory(gunId);
            break;
        case 'edit-session':
            openEditSession(gunId, sessionType, sessionIndex);
            break;
        case 'delete-session':
            confirmDeleteSession(gunId, sessionType, sessionIndex);
            break;
        case 'confirm-delete-session':
            deleteSession(gunId, sessionType, sessionIndex);
            break;
        case 'update-ammo-rounds':
            updateAmmoRounds(ammoId);
            break;
        case 'edit-ammo':
            openEditAmmo(ammoId);
            break;
        case 'delete-ammo':
            confirmDeleteAmmo(ammoId);
            break;
        case 'confirm-delete-ammo':
            deleteAmmo(ammoId);
            break;
        case 'clear-filters':
            clearFilters(target.getAttribute('data-scope'));
            break;
        case 'filter-guns-by-type':
            {
                const gunType = target.getAttribute('data-gun-type');
                if (gunType) {
                    navigate('guns');
                    setTimeout(() => {
                        const filterSelect = document.getElementById('gun-filter-select');
                        if (!filterSelect) return;

                        const hasType = Array.from(filterSelect.options).some(option => option.value === gunType);
                        const nextFilter = hasType ? gunType : 'all';

                        filterSelect.value = nextFilter;
                        state.gunFilter = nextFilter;
                        const searchQuery = (document.getElementById('gun-search')?.value || '').toLowerCase();
                        applyGunFilter(nextFilter, searchQuery);
                    }, 50);
                }
            }
            break;
        case 'filter-ammo-by-caliber':
            {
                const caliber = target.getAttribute('data-caliber');
                if (caliber) {
                    // The menu is scoped to the active category, so jump back to
                    // All before looking for this caliber; otherwise a rifle
                    // caliber would be invisible under a Pistol menu.
                    state.ammoCategory = 'all';
                    navigate('ammo');
                    setTimeout(() => {
                        const filterSelect = document.getElementById('ammo-filter-select');
                        if (!filterSelect) return;

                        // Only filter by a caliber that still has boxes; otherwise
                        // fall back to showing everything.
                        const hasCaliber = Array.from(filterSelect.options)
                            .some(option => option.value === caliber);
                        const nextFilter = hasCaliber ? caliber : 'all';

                        filterSelect.value = nextFilter;
                        const searchQuery = (document.getElementById('ammo-search')?.value || '').toLowerCase();
                        applyAmmoFilter(nextFilter, searchQuery);
                    }, 50);
                }
            }
            break;
        case 'navigate-to-sessions':
            navigate('sessions');
            break;
        case 'view-most-fired':
            if (gunId) {
                showGunDetail(gunId);
            }
            break;
        case 'navigate-to-page':
            {
                const page = target.getAttribute('data-page');
                if (page) {
                    navigate(page);
                }
            }
            break;
        case 'add-permit':
            openAddPermit();
            break;
        case 'edit-permit':
            openEditPermit(target.getAttribute('data-permit-id'));
            break;
        case 'renew-permit':
            openRenewPermit(target.getAttribute('data-permit-id'));
            break;
        case 'save-permit':
            savePermit();
            break;
        case 'confirm-delete-permit':
            confirmDeletePermit(target.getAttribute('data-permit-id'));
            break;
        case 'delete-permit':
            deletePermit(target.getAttribute('data-permit-id'));
            break;
        case 'toggle-permit-notify':
            togglePermitNotify();
            break;
        case 'enable-browser-notifications':
            enableBrowserNotifications();
            break;
        case 'clear-search':
            {
                const searchId = target.closest('[data-search-id]')?.getAttribute('data-search-id');
                const searchInput = document.getElementById(searchId);
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    const wrapper = searchInput.closest('.search-wrapper');
                    if (wrapper) {
                        wrapper.classList.remove('has-value');
                    }
                    // Trigger input event to update results
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            break;
    }
}

/**
 * Handle ammo type pill clicks
 */
/**
 * Reset a view's filters (dropdowns, search box, ammo pills, Hide Sold) and
 * re-apply that view's renderer so the visible list matches the cleared state.
 * Shared by every Clear button in the filter bar.
 * @param {string} [scope] - guns | ammo | sessions | cleanings; omit to reset all
 */
export function clearFilters(scope) {
    const scopes = clearFilterControls(scope);

    if (scopes.includes('guns')) {
        applyGunFilter('all', '');
    }

    if (scopes.includes('ammo')) {
        applyAmmoFilter('all', '', 'all');
    }

    ['sessions', 'cleanings'].forEach((key) => {
        if (!scopes.includes(key)) return;
        const select = document.getElementById(key === 'sessions' ? 'session-filter-select' : 'cleaning-filter-select');
        if (select) filterSessionItems(select);
    });

    db.save();
}

function handleAmmoPillClick(target) {
    const pills = target.parentElement;
    const category = target.getAttribute('data-ammo-category') || 'all';

    pills.querySelectorAll('.filter-pill').forEach(pill => {
        const isActive = pill === target;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-pressed', String(isActive));
    });

    // Status choices (All ammo, In stock, Stocked, Low, Empty) mean the same
    // thing in every group, so they survive a category switch. A caliber does
    // not: "9mm" has no meaning under Rifle, so that case resets to All ammo.
    if (category !== (state.ammoCategory || 'all') && !isAmmoStatusFilter(state.ammoFilter || 'all')) {
        resetAmmoStatusFilter();
    }

    const filterSelect = document.getElementById('ammo-filter-select');
    const filter = filterSelect ? (filterSelect.value || 'all') : 'all';
    const searchQuery = (document.getElementById('ammo-search')?.value || '').toLowerCase();
    applyAmmoFilter(filter, searchQuery, category);
    db.save();
}

/**
 * Handle search input changes
 */
function handleSearchInput(e) {
    const wrapper = e.target.closest('.search-wrapper');
    if (wrapper) {
        if (e.target.value.length > 0) {
            wrapper.classList.add('has-value');
        } else {
            wrapper.classList.remove('has-value');
        }
    }

    if (e.target.id === 'gun-search') {
        const query = e.target.value.toLowerCase();
        const filterSelect = document.getElementById('gun-filter-select');
        const filter = filterSelect ? (filterSelect.value || 'all') : 'all';
        applyGunFilter(filter, query);

    } else if (e.target.id === 'ammo-search') {
        const query = e.target.value.toLowerCase();
        const filterSelect = document.getElementById('ammo-filter-select');
        const filter = filterSelect ? (filterSelect.value || 'all') : 'all';
        applyAmmoFilter(filter, query, state.ammoCategory || 'all');
    }
}

/**
 * Handle clicks on modal overlay (close modal)
 */
function handleModalOverlayClick(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
}

/**
 * Handle mobile overlay click to close sidebar
 */
function handleMobileOverlayClick(e) {
    if (e.target.id === 'mobile-overlay') {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
}

/**
 * Handle nav item click on mobile (close sidebar)
 */
function handleNavItemClick(e) {
    if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
}
