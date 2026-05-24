'use strict';

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
 * Update navigation badge counts
 * @param {number} gunsCount - Number of active guns
 * @param {number} ammoCount - Number of ammo entries
 */
export function updateBadges(gunsCount, ammoCount) {
    document.getElementById('guns-badge').textContent = gunsCount;
    document.getElementById('ammo-badge').textContent = ammoCount;
}
