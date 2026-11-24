'use strict';
import { state } from './state.js';
export function parseSessionDate(text) {
    if (!text) return 0;
    const datePart = text.split(' — ')[0].trim();
    let date = new Date(datePart);
    if (!isNaN(date.getTime())) return date.getTime();
    const withComma = datePart.replace(/(\d{1,2})\s+(\d{4})/, '$1, $2');
    date = new Date(withComma);
    if (!isNaN(date.getTime())) return date.getTime();
    const slashMatch = datePart.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
        const year = slashMatch[3].length === 2 ? '20' + slashMatch[3] : slashMatch[3];
        date = new Date(Number(year), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
        if (!isNaN(date.getTime())) return date.getTime();
    }
    const isoMatch = datePart.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        if (!isNaN(date.getTime())) return date.getTime();
    }
    return 0; 
}
export function escapeHtml(str) {
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
export function getTypeIcon(type) {
    const icons = {
        pistol: '<i class="fas fa-gun"></i> ',
        rifle: '<i class="fas fa-crosshairs"></i> ',
        shotgun: '<i class="fas fa-bullseye"></i> '
    };
    return icons[type.toLowerCase()] || '';
}
export function getUniqueCalibers(ammo) {
    const calibers = new Set();
    ammo.forEach(ammoItem => {
        if (ammoItem.caliber) {
            calibers.add(ammoItem.caliber.trim());
        }
    });
    return Array.from(calibers).sort();
}
export const AMMO_STATUS_FILTERS = [
    ['all', 'All ammo'],
    ['in-stock', 'In stock (hide empty)'],
    ['stocked', 'Stocked only'],
    ['low', 'Low only'],
    ['empty', 'Empty only']
];
export function isAmmoStatusFilter(value) {
    return AMMO_STATUS_FILTERS.some(([option]) => option === value);
}
export function getVisibleCalibers(ammo, category = 'all') {
    const calibers = getUniqueCalibers(Array.isArray(ammo) ? ammo : []);
    if (!category || category === 'all') return calibers;
    return calibers.filter((caliber) => getAmmoCategory(caliber) === category);
}
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
    setTimeout(() => {
        toastElement.style.opacity = '0';
        toastElement.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            toastElement.remove();
        }, 300);
    }, 3000);
}
export function openModal(id) {
    document.getElementById(id).classList.add('open');
}
export function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
export function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}
export function countLogEntries(key) {
    const guns = Array.isArray(state.guns) ? state.guns : [];
    return guns.reduce(
        (sum, gun) => sum + (Array.isArray(gun[key]) ? gun[key].length : 0), 0);
}
export function getAmmoCategory(caliber = '') {
    const cal = String(caliber).toLowerCase();
    if (cal.includes('.177') || cal.includes('bb')) return 'bb';
    if (cal.includes('6mm') || cal.includes('airsoft')) return 'airsoft';
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
        return 'rifle';
    }
    return 'pistol';
}
export function updateBadges(gunsCount, ammoCount, permitAlerts) {
    const gunsBadge = document.getElementById('guns-badge');
    if (gunsBadge) gunsBadge.textContent = gunsCount;
    const ammoBadge = document.getElementById('ammo-badge');
    if (ammoBadge) ammoBadge.textContent = ammoCount;
    const sessionsBadge = document.getElementById('sessions-badge');
    if (sessionsBadge) sessionsBadge.textContent = countUniqueRangeSessions(state.guns);
    const cleaningsBadge = document.getElementById('cleanings-badge');
    if (cleaningsBadge) cleaningsBadge.textContent = countLogEntries('cleaningSessions');
    if (typeof permitAlerts === 'number') {
        const permitsBadge = document.getElementById('permits-badge');
        if (permitsBadge) permitsBadge.textContent = permitAlerts;
    }
}
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
export function syncClearButton(scope) {
    if (!scope) return;
    const button = document.querySelector(`[data-action="clear-filters"][data-scope="${scope}"]`);
    if (button) button.hidden = !isFilterActive(scope);
}
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
export function countUniqueRangeSessions(guns) {
    if (!Array.isArray(guns)) return 0;
    const days = new Set();
    let unparsed = 0;
    guns.forEach((gun) => {
        const sessions = Array.isArray(gun?.rangeSessions) ? gun.rangeSessions : [];
        sessions.forEach((session) => {
            const text = typeof session === 'string' ? session : session?.text || '';
            const stamp = parseSessionDate(text);
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