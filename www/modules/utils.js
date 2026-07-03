'use strict';
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
export function updateBadges(gunsCount, ammoCount) {
    document.getElementById('guns-badge').textContent = gunsCount;
    document.getElementById('ammo-badge').textContent = ammoCount;
}
export function countUniqueRangeSessions(guns) {
    const uniqueDates = new Set();
    guns.forEach(gun => {
        (gun.rangeSessions || []).forEach(session => {
            const dateMatch = session.text.match(/^([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/);
            if (dateMatch) {
                const rawDate = dateMatch[1];
                const parts = rawDate
                    .replace(/(\d+)(st|nd|rd|th)/, '$1')  
                    .replace(/,/g, '')                     
                    .replace(/\s+/g, ' ')                  
                    .trim()
                    .split(' ');
                if (parts.length === 3) {
                    const [monthStr, day, year] = parts;
                    const monthMap = {
                        'january': 'Jan', 'jan': 'Jan',
                        'february': 'Feb', 'feb': 'Feb',
                        'march': 'Mar', 'mar': 'Mar',
                        'april': 'Apr', 'apr': 'Apr',
                        'may': 'May',
                        'june': 'Jun', 'jun': 'Jun',
                        'july': 'Jul', 'jul': 'Jul',
                        'august': 'Aug', 'aug': 'Aug',
                        'september': 'Sep', 'sep': 'Sep',
                        'october': 'Oct', 'oct': 'Oct',
                        'november': 'Nov', 'nov': 'Nov',
                        'december': 'Dec', 'dec': 'Dec'
                    };
                    const normalizedMonth = monthMap[monthStr.toLowerCase()] || monthStr;
                    const normalizedDay = day.padStart(2, '0');  
                    const normalizedDate = `${normalizedMonth} ${normalizedDay} ${year}`;
                    uniqueDates.add(normalizedDate);
                }
            }
        });
    });
    return uniqueDates.size;
}