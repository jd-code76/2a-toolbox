
'use strict';

import { state } from './state.js';

/**
 * Parse date from session text and convert to timestamp
 * Handles multiple date formats: natural language, slash/dash format, ISO format
 * @param {string} text - Session text containing date
 * @returns {number} Unix timestamp (milliseconds) or 0 if parsing fails
 */
export function parseSessionDate(text) {
    if (!text) return 0;

    // Extract date portion (before the " — " separator if present)
    const datePart = text.split(' — ')[0].trim();

    // Try parsing as natural language date
    let date = new Date(datePart);
    if (!isNaN(date.getTime())) return date.getTime();

    // Try adding comma for formats like "Jan 15 2024"
    const withComma = datePart.replace(/(\d{1,2})\s+(\d{4})/, '$1, $2');
    date = new Date(withComma);
    if (!isNaN(date.getTime())) return date.getTime();

    // Try parsing slash/dash format (MM/DD/YYYY or MM-DD-YYYY)
    const slashMatch = datePart.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
        const year = slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3];
        date = new Date(Number(year), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
        if (!isNaN(date.getTime())) return date.getTime();
    }

    // Try parsing ISO format (YYYY-MM-DD)
    const isoMatch = datePart.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        if (!isNaN(date.getTime())) return date.getTime();
    }

    return 0; // Return 0 if all parsing attempts fail
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML insertion
 */
export function escapeHtml(str) {
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get Font Awesome icon for firearm type
 * @param {string} type - Firearm type (pistol, rifle, shotgun)
 * @returns {string} HTML string with icon
 */
export function getTypeIcon(type) {
    const icons = {
        pistol: '<i class="fas fa-gun"></i> ',
        rifle: '<i class="fas fa-crosshairs"></i> ',
        shotgun: '<i class="fas fa-bullseye"></i> '
    };
    return icons[type.toLowerCase()] || '';
}

/**
 * Get array of unique calibers from ammunition inventory
 * @param {Array} ammo - Array of ammunition objects
 * @returns {string[]} Sorted array of unique caliber names
 */
export function getUniqueCalibers(ammo) {
    const calibers = new Set();
    ammo.forEach(ammoItem => {
        if (ammoItem.caliber) {
            calibers.add(ammoItem.caliber.trim());
        }
    });
    return Array.from(calibers).sort();
}

/**
 * Ammo filter menu, in display order. 'in-stock' sits directly under
 * 'All ammo' because it is the nearest thing to "all": everything except
 * empty boxes.
 * @type {Array<[string, string]>}
 */
export const AMMO_STATUS_FILTERS = [
    ['all', 'All ammo'],
    ['in-stock', 'In stock (hide empty)'],
    ['stocked', 'Stocked only'],
    ['low', 'Low only'],
    ['empty', 'Empty only']
];

/**
 * Is this filter value one of the status options (as opposed to a caliber)?
 * @param {string} value
 * @returns {boolean}
 */
export function isAmmoStatusFilter(value) {
    return AMMO_STATUS_FILTERS.some(([option]) => option === value);
}

/**
 * Calibers that belong to a category. A category pill narrows the caliber
 * choices so the menu can never offer a caliber the grid is hiding.
 * @param {Array<Object>} ammo
 * @param {string} category - all | pistol | rifle | shotgun | bb | airsoft
 * @returns {string[]}
 */
export function getVisibleCalibers(ammo, category = 'all') {
    const calibers = getUniqueCalibers(Array.isArray(ammo) ? ammo : []);
    if (!category || category === 'all') return calibers;
    return calibers.filter((caliber) => getAmmoCategory(caliber) === category);
}

/**
 * Build the ammo filter menu: status options first, then the calibers that
 * belong to the active category.
 * @param {Array<Object>} ammo
 * @param {string} category
 * @param {string} activeFilter
 * @returns {string} inner HTML for #ammo-filter-select
 */
export function buildAmmoFilterOptions(ammo, category = 'all', activeFilter = 'all') {
    const statusOptions = AMMO_STATUS_FILTERS
        .map(([value, label]) => `<option value="${value}"${activeFilter === value ? ' selected' : ''}>${label}</option>`)
        .join("");

    const caliberOptions = getVisibleCalibers(ammo, category)
        .map((caliber) => {
            const selected = activeFilter === caliber ? ' selected' : '';
            return `<option value="${escapeHtml(caliber)}"${selected}>${escapeHtml(caliber)}</option>`;
        })
        .join("");

    return `<optgroup label="Status">${statusOptions}</optgroup>`
        + (caliberOptions ? `<optgroup label="Caliber">${caliberOptions}</optgroup>` : '');
}

/**
 * Display toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info)
 */
export function toast(message, type) {
    const container = document.getElementById('toast-container');
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${type || 'info'}`;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    const icon = iconMap[type] || iconMap.info;

    toastElement.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
    `;

    container.appendChild(toastElement);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toastElement.style.opacity = '0';
        toastElement.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            toastElement.remove();
        }, 300);
    }, 3000);
}

/**
 * Open a modal by ID
 * @param {string} id - Modal element ID
 */
export function openModal(id) {
    document.getElementById(id).classList.add('open');
}

/**
 * Close a modal by ID
 * @param {string} id - Modal element ID
 */
export function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

/**
 * Toggle mobile menu sidebar
 */
export function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

/**
 * Total log entries across every gun.
 * Range and cleaning sessions live on the gun records, so the counts come from
 * the same source the log pages render. Missing or malformed arrays count as 0.
 * @param {'rangeSessions'|'cleaningSessions'} key - Log array on each gun
 * @returns {number} Total entries
 */
export function countLogEntries(key) {
    const guns = Array.isArray(state.guns) ? state.guns : [];
    return guns.reduce(
        (sum, gun) => sum + (Array.isArray(gun[key]) ? gun[key].length : 0), 0);
}

/**
 * Classify a caliber string into an ammo category.
 * Single source of truth for thresholds, card badges and the type filters.
 * @param {string} caliber - Ammo caliber
 * @returns {string} One of 'pistol', 'rifle', 'shotgun', 'bb', 'airsoft'
 */
export function getAmmoCategory(caliber = '') {
    const cal = String(caliber).toLowerCase();

    if (cal.includes('.177') || cal.includes('bb')) return 'bb';
    if (cal.includes('6mm') || cal.includes('airsoft')) return 'airsoft';
    // Shotgun bores are written many ways: "12 Gauge", "20 ga", and just as
    // often "12ga" / "20ga". A plain \bga\b test misses the unspaced forms
    // because the digit and the letters are both word characters, so those
    // rounds fell through to the pistol default. .410 bore did too.
    if (
        cal.includes('gauge') ||
        /\d\s*ga\b/.test(cal) ||
        /(^|\D)410(\D|$)/.test(cal)
    ) return 'shotgun';
    if (
        cal.includes('.22') || cal.includes('.223') || cal.includes('5.56') ||
        cal.includes('.308') || cal.includes('.30') || cal.includes('7.62') ||
        cal.includes('.300') || cal.includes('6.5') || cal.includes('.277') ||
        cal.includes('.243') || cal.includes('.260') ||
        cal.includes('blackout') || cal.includes('.300') || cal.startsWith('300')
    ) {
        // .22LR, .22WMR, .223, 5.56, .308, etc. all count as rifle calibers
        return 'rifle';
    }

    // Default to pistol for handgun calibers (9mm, .45, .40, etc.)
    return 'pistol';
}

/**
 * Update navigation badge counts
 * @param {number} gunsCount - Number of active guns
 * @param {number} ammoCount - Number of ammo entries
 * @param {number} [permitAlerts] - Permit count; omitted leaves the badge alone
 */
export function updateBadges(gunsCount, ammoCount, permitAlerts) {
    const gunsBadge = document.getElementById('guns-badge');
    if (gunsBadge) gunsBadge.textContent = gunsCount;

    const ammoBadge = document.getElementById('ammo-badge');
    if (ammoBadge) ammoBadge.textContent = ammoCount;

    // Plain totals for the two logs, read from state so callers that only know
    // about guns/ammo still refresh them.
    const sessionsBadge = document.getElementById('sessions-badge');
    // Range sessions are days, not log rows: two guns on one day are one
    // session, matching the number the dashboard shows.
    if (sessionsBadge) sessionsBadge.textContent = countUniqueRangeSessions(state.guns);

    const cleaningsBadge = document.getElementById('cleanings-badge');
    if (cleaningsBadge) cleaningsBadge.textContent = countLogEntries('cleaningSessions');

    // Only update the permit badge when a count is supplied, so unrelated
    // edits elsewhere in the app do not reset it.
    if (typeof permitAlerts === 'number') {
        const permitsBadge = document.getElementById('permits-badge');
        if (permitsBadge) permitsBadge.textContent = permitAlerts;
    }
}

/**
 * Show or hide cleaning/range-session cards by firearm type.
 * Both logs share one markup pattern: each card carries data-session-type and
 * the select names the list it controls plus its count and empty-state targets.
 * @param {HTMLSelectElement} select - Filter dropdown for one log
 */
/** Filter controls per view, in the order they appear in the state record. */
const FILTER_CONTROLS = {
    guns: {
        keys: ['gunFilter'],
        select: 'gun-filter-select',
        search: 'gun-search',
        toggle: 'hide-sold-toggle'
    },
    ammo: {
        keys: ['ammoFilter', 'ammoCategory'],
        select: 'ammo-filter-select',
        search: 'ammo-search',
        pills: 'ammo-category-pills'
    },
    sessions: { keys: ['sessionFilter'], select: 'session-filter-select' },
    cleanings: { keys: ['cleaningFilter'], select: 'cleaning-filter-select' }
};

/**
 * Put filter controls back to their unfiltered defaults ("all", empty search).
 * One place owns the reset so every toolbar's Clear button behaves identically.
 * Callers re-apply the render filters afterwards (see clearFilters in events.js).
 * @param {string} [scope] - guns | ammo | sessions | cleanings; omit to reset all
 * @returns {string[]} The scopes that were actually reset
 */
export function clearFilterControls(scope) {
    const scopes = scope && FILTER_CONTROLS[scope] ? [scope] : Object.keys(FILTER_CONTROLS);

    scopes.forEach((key) => {
        const controls = FILTER_CONTROLS[key];

        controls.keys.forEach((stateKey) => {
            state[stateKey] = 'all';
        });

        const select = document.getElementById(controls.select);
        if (select) select.value = 'all';

        if (controls.search) {
            const input = document.getElementById(controls.search);
            if (input) input.value = '';
        }

        if (controls.toggle) {
            const toggle = document.getElementById(controls.toggle);
            if (toggle) toggle.checked = false;
        }

        if (key === 'guns') state.hideSold = false;

        if (controls.pills) {
            const pills = document.querySelectorAll(`#${controls.pills} .filter-pill`);
            pills.forEach((pill) => {
                const isDefault = pill.getAttribute('data-ammo-category') === 'all';
                pill.classList.toggle('active', isDefault);
                pill.setAttribute('aria-pressed', String(isDefault));
            });
        }
    });

    return scopes;
}

/**
 * True when the given view is actually narrowed by a filter.
 * Used to decide whether a list should report "N of M shown" and whether the
 * Clear Filters button is worth showing.
 * @param {string} scope - guns | ammo | sessions | cleanings
 * @returns {boolean}
 */
export function isFilterActive(scope) {
    const valueOf = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    const isChecked = (id) => {
        const el = document.getElementById(id);
        return Boolean(el && el.checked);
    };

    switch (scope) {
        case 'guns':
            return valueOf('gun-filter-select') !== 'all'
                || Boolean(valueOf('gun-search'))
                || isChecked('hide-sold-toggle')
                || state.hideSold === true;
        case 'ammo':
            return valueOf('ammo-filter-select') !== 'all'
                || Boolean(valueOf('ammo-search'))
                || (state.ammoCategory || 'all') !== 'all';
        case 'sessions':
            return valueOf('session-filter-select') !== 'all';
        case 'cleanings':
            return valueOf('cleaning-filter-select') !== 'all';
        default:
            return false;
    }
}

/**
 * Show the view's Clear Filters button only while that view is filtered.
 * One place owns the rule so every toolbar behaves the same.
 * @param {string} scope - guns | ammo | sessions | cleanings
 */
export function syncClearButton(scope) {
    if (!scope) return;
    const button = document.querySelector(`[data-action="clear-filters"][data-scope="${scope}"]`);
    if (button) button.hidden = !isFilterActive(scope);
}

/**
 * Reset the ammo status/caliber dropdown back to All ammo.
 * Switching caliber groups (Pistol → Rifle) must not carry over a status or
 * caliber choice, or the new group renders empty.
 */
export function resetAmmoStatusFilter() {
    if (state) state.ammoFilter = 'all';
    const select = document.getElementById('ammo-filter-select');
    if (select) select.value = 'all';
}

export function filterSessionItems(select) {
    const listId = select.getAttribute('data-list');
    const countId = select.getAttribute('data-count');
    const noResultsId = select.getAttribute('data-no-results');
    const list = listId ? document.getElementById(listId) : null;
    if (!list) return;

    const type = select.value || 'all';
    const items = list.querySelectorAll('.session-item');
    let visible = 0;

    items.forEach(item => {
        const matches = type === 'all' || item.getAttribute('data-session-type') === type;
        item.hidden = !matches;
        // `.session-item` sets `display: flex` in the stylesheet, which outranks
        // the browser's `[hidden] { display: none }` rule. Without the inline
        // display the attribute is set but the card stays on screen.
        item.style.display = matches ? '' : 'none';
        if (matches) visible += 1;
    });

    const counter = countId ? document.getElementById(countId) : null;
    if (counter) {
        counter.textContent = type === 'all' ? '' : `${visible} of ${items.length}`;
    }

    const noResults = noResultsId ? document.getElementById(noResultsId) : null;
    if (noResults) {
        noResults.hidden = visible > 0 || items.length === 0;
    }

    syncClearButton(listId === 'cleaning-list' ? 'cleanings' : 'sessions');
}

/**
 * Count unique range-session days across the given guns.
 * The dashboard total, the per-gun stat and the sidebar badge all call this, so
 * two firearms used on the same day count as one session everywhere.
 * Written dates are free text, so normalization goes through parseSessionDate
 * (natural, comma, slash and ISO forms) instead of matching one literal shape.
 * @param {Array} guns - Gun records (any non-array input counts as zero)
 * @returns {number} Number of distinct session days
 */
export function countUniqueRangeSessions(guns) {
    if (!Array.isArray(guns)) return 0;

    const days = new Set();
    let unparsed = 0;

    guns.forEach((gun) => {
        const sessions = Array.isArray(gun?.rangeSessions) ? gun.rangeSessions : [];
        sessions.forEach((session) => {
            const text = typeof session === 'string' ? session : session?.text || '';
            const stamp = parseSessionDate(text);
            // An unrecognizable date cannot be proven to share a day, so it is
            // counted on its own rather than dropped or force-merged.
            if (!stamp) {
                unparsed++;
                return;
            }
            const date = new Date(stamp);
            days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
        });
    });

    return days.size + unparsed;
}
