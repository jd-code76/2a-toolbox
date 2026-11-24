'use strict';
import { state } from './state.js';
import { db } from './database.js';
import {
    closeModal,
    escapeHtml,
    openModal,
    toast,
    updateBadges
} from './utils.js';
const PERMIT_TYPES = {
    ccw: { label: 'Concealed Carry', icon: 'fa-id-card' },
    pistol: { label: 'Possession', icon: 'fa-file-shield' },
    nonresident: { label: 'Non-resident', icon: 'fa-passport' },
    other: { label: 'Other', icon: 'fa-certificate' }
};
const MS_PER_DAY = 86400000;
function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function parsePermitDate(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value) {
    const date = parsePermitDate(value);
    if (!date) return '—';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
export function daysUntil(value) {
    const date = parsePermitDate(value);
    if (!date) return null;
    return Math.round((date - today()) / MS_PER_DAY);
}
function leadDays() {
    const fallback = Number(state.permitLeadDays);
    return Number.isFinite(fallback) && fallback >= 0 ? fallback : 30;
}
export function getPermitStatus(permit) {
    const days = daysUntil(permit.expirationDate);
    if (days === null) {
        return { level: 'none', days: null, label: 'No expiration set' };
    }
    if (days < 0) {
        return {
            level: 'expired',
            days,
            label: days === -1 ? 'Expired yesterday' : `Expired ${Math.abs(days)} days ago`
        };
    }
    if (days === 0) {
        return { level: 'expiring', days, label: 'Expires today' };
    }
    if (days <= leadDays()) {
        return {
            level: 'expiring',
            days,
            label: days === 1 ? 'Expires tomorrow' : `Expires in ${days} days`
        };
    }
    return {
        level: 'valid',
        days,
        label: days === 1 ? '1 day remaining' : `${days} days remaining`
    };
}
function byExpiration(a, b) {
    const da = daysUntil(a.expirationDate);
    const db_ = daysUntil(b.expirationDate);
    if (da === null && db_ === null) return 0;
    if (da === null) return 1;
    if (db_ === null) return -1;
    return da - db_;
}
export function getExpiringPermits() {
    return [...state.permits]
        .filter(p => {
            const status = getPermitStatus(p);
            return status.level === 'expired' || status.level === 'expiring';
        })
        .sort(byExpiration);
}
export function getPermitAlertCount() {
    return getExpiringPermits().length;
}
export function getPermitCount() {
    return Array.isArray(state.permits) ? state.permits.length : 0;
}
export function renderPermits() {
    const permits = [...state.permits].sort(byExpiration);
    const alerts = getExpiringPermits();
    const notifyEnabled = state.permitNotifyEnabled === true;
    const notifyPermission = browserNotifyState();
    const notifyHint =
        notifyPermission === 'granted'
            ? 'Browser notifications are allowed on this device.'
            : notifyPermission === 'denied'
              ? 'Browser notifications are blocked for this site. Alerts still appear in-app; allow notifications in your browser\u2019s site settings to get them outside the app.'
              : notifyPermission === 'unsupported'
                ? 'This browser does not support notifications, so alerts appear in-app only.'
                : 'Browser notifications need your permission. Alerts always appear in-app.';
    const allowNotifyButton =
        notifyEnabled && notifyPermission === 'default'
            ? `<button class="btn btn-ghost btn-sm" data-action="enable-browser-notifications">
    <i class="fas fa-bell"></i> Allow notifications
    </button>`
            : '';
    const alertBanner = alerts.length
        ? `
    <div class="permit-alert" role="status">
    <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
    <div class="permit-alert-text">
    <strong>${alerts.length === 1 ? '1 permit needs attention' : `${alerts.length} permits need attention`}</strong>
    <p>${alerts
        .slice(0, 3)
        .map(p => `${escapeHtml(p.label || 'Permit')} — ${escapeHtml(getPermitStatus(p).label)}`)
        .join('<br>')}</p>
    </div>
    </div>`
        : '';
    const cards = permits.length
        ? permits
              .map(permit => {
                  const status = getPermitStatus(permit);
                  const type = PERMIT_TYPES[permit.type] || PERMIT_TYPES.other;
                  const note = permit.notes
                      ? `<p class="permit-notes">${escapeHtml(permit.notes)}</p>`
                      : '';
                  return `
    <article class="permit-card permit-${status.level}">
    <div class="permit-card-head">
    <div class="permit-card-title">
    <i class="fas ${type.icon}" aria-hidden="true"></i>
    <div>
    <h3>${escapeHtml(permit.label || type.label)}</h3>
    <span class="permit-type">${escapeHtml(type.label)}${
                      permit.authority ? ` · ${escapeHtml(permit.authority)}` : ''
                  }</span>
    </div>
    </div>
    <span class="permit-status permit-status-${status.level}">${escapeHtml(status.label)}</span>
    </div>
    <dl class="permit-dates">
    <div><dt>Issued</dt><dd>${formatDate(permit.issueDate)}</dd></div>
    <div><dt>Expires</dt><dd>${formatDate(permit.expirationDate)}</dd></div>
    </dl>
    ${permit.number ? `<p class="permit-number">Permit # <span>${escapeHtml(permit.number)}</span></p>` : ''}
    ${note}
    <div class="permit-card-actions">
    <button class="btn btn-ghost btn-sm" data-action="edit-permit" data-permit-id="${escapeHtml(permit.id)}">
    <i class="fas fa-pen"></i> Edit
    </button>
    <button class="btn btn-primary btn-sm" data-action="renew-permit" data-permit-id="${escapeHtml(permit.id)}">
    <i class="fas fa-rotate"></i> Renew
    </button>
    <button class="btn btn-danger btn-sm" data-action="confirm-delete-permit" data-permit-id="${escapeHtml(permit.id)}">
    <i class="fas fa-trash"></i> Delete
    </button>
    </div>
    </article>`;
              })
              .join('')
        : `
    <div class="card empty-state">
    <i class="fas fa-id-card" aria-hidden="true"></i>
    <p>No permits tracked yet.</p>
    <p style="margin-top:8px;font-size:12px;color:var(--text3)">
    Add your CCW or pistol permit to watch its renewal and expiration dates.
    </p>
    <button class="btn btn-primary" style="margin-top:18px" data-action="add-permit">
    <i class="fas fa-plus"></i> Add Permit
    </button>
    </div>`;
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()" aria-label="Toggle menu">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title"><i class="fas fa-id-card"></i> Permits</div>
    <div class="topbar-actions">
    <button class="btn btn-primary btn-sm" data-action="add-permit">
    <i class="fas fa-plus"></i> <span>Add Permit</span>
    </button>
    </div>
    </div>
    <div class="content">
    ${alertBanner}
    <div class="card permit-settings">
    <div class="permit-settings-row">
    <div>
    <div class="card-title" style="margin-bottom:4px">
    <i class="fas fa-bell"></i> Expiration notifications
    </div>
    <p class="permit-settings-hint">
    Show an in-app alert when a permit is inside its notification window.
    ${notifyHint}
    </p>
    </div>
    <div class="permit-settings-actions">
    ${allowNotifyButton}
    <button class="btn ${notifyEnabled ? 'btn-primary' : 'btn-ghost'} btn-sm permit-notify-toggle"
    data-action="toggle-permit-notify"
    aria-pressed="${notifyEnabled}">
    <i class="fas ${notifyEnabled ? 'fa-bell' : 'fa-bell-slash'}"></i>
    ${notifyEnabled ? 'On' : 'Off'}
    </button>
    </div>
    </div>
    <div class="permit-settings-row">
    <label class="form-label" for="permit-lead-days" style="margin:0">
    Notify me this many days before expiration
    </label>
    <select class="form-select permit-lead-select" id="permit-lead-days" data-action="set-permit-lead-days">
    ${[7, 14, 30, 60, 90, 120, 180]
        .map(d => `<option value="${d}" ${Number(state.permitLeadDays) === d ? 'selected' : ''}>${d} days</option>`)
        .join('')}
    </select>
    </div>
    </div>
    <div class="permit-grid">
    ${cards}
    </div>
    </div>`;
}
export function renderPermitAlerts() {
    const alerts = getExpiringPermits();
    if (!state.permits.length) return '';
    const rows = alerts.length
        ? alerts
              .map(p => {
                  const status = getPermitStatus(p);
                  return `
    <div class="permit-dash-row">
    <div>
    <div class="permit-dash-title">${escapeHtml(p.label || 'Permit')}</div>
    <div class="permit-dash-sub">Expires ${formatDate(p.expirationDate)}</div>
    </div>
    <span class="permit-status permit-status-${status.level}">${escapeHtml(status.label)}</span>
    </div>`;
              })
              .join('')
        : `<p class="permit-dash-empty">All permits are current.</p>`;
    return `
    <div class="card permit-dash-card">
    <div class="card-title" style="margin-bottom:14px">
    <i class="fas fa-id-card"></i> Permits
    ${alerts.length ? `<span class="badge" style="margin-left:8px">${alerts.length}</span>` : ''}
    </div>
    ${rows}
    <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-page="permits">
    <i class="fas fa-arrow-right"></i> Manage permits
    </button>
    </div>`;
}
export function openAddPermit() {
    state.editingPermitId = null;
    renderPermitForm(null);
    openModal('permit-modal');
}
export function openEditPermit(id) {
    const permit = state.permits.find(p => p.id === id);
    if (!permit) return;
    state.editingPermitId = id;
    renderPermitForm(permit);
    openModal('permit-modal');
}
export function openRenewPermit(id) {
    const permit = state.permits.find(p => p.id === id);
    if (!permit) return;
    state.editingPermitId = id;
    renderPermitForm(permit, true);
    openModal('permit-modal');
}
function renderPermitForm(permit, renewing = false) {
    const p = permit || {};
    const title = document.getElementById('permit-modal-title');
    if (title) {
        title.textContent = renewing ? 'Renew Permit' : p.id ? 'Edit Permit' : 'Add Permit';
    }
    const body = document.getElementById('permit-modal-body');
    if (!body) return;
    const typeOptions = Object.entries(PERMIT_TYPES)
        .map(
            ([value, meta]) =>
                `<option value="${value}" ${(p.type || 'ccw') === value ? 'selected' : ''}>${meta.label}</option>`
        )
        .join('');
    body.innerHTML = `
    <div class="form-row">
    <div class="form-group">
    <label class="form-label" for="pf-label">Permit name *</label>
    <input class="form-input" id="pf-label" name="permit-label" type="text"
    placeholder="e.g. NC Concealed Handgun Permit"
    value="${escapeHtml(p.label || '')}" autocomplete="off">
    </div>
    <div class="form-group">
    <label class="form-label" for="pf-type">Permit type</label>
    <select class="form-select" id="pf-type" name="permit-type">${typeOptions}</select>
    </div>
    </div>
    <div class="form-row">
    <div class="form-group">
    <label class="form-label" for="pf-authority">Issuing authority</label>
    <input class="form-input" id="pf-authority" name="permit-authority" type="text"
    placeholder="e.g. Wake County Sheriff"
    value="${escapeHtml(p.authority || '')}" autocomplete="off">
    </div>
    <div class="form-group">
    <label class="form-label" for="pf-number">Permit number</label>
    <input class="form-input" id="pf-number" name="permit-number" type="text"
    value="${escapeHtml(p.number || '')}" autocomplete="off" spellcheck="false">
    </div>
    </div>
    <div class="form-row">
    <div class="form-group">
    <label class="form-label" for="pf-issue">Issue date</label>
    <input class="form-input" id="pf-issue" name="permit-issue" type="date"
    value="${escapeHtml(p.issueDate || '')}">
    </div>
    <div class="form-group">
    <label class="form-label" for="pf-expiration">Expiration date *</label>
    <input class="form-input" id="pf-expiration" name="permit-expiration" type="date"
    value="${escapeHtml(renewing ? '' : p.expirationDate || '')}">
    </div>
    </div>
    <div class="form-group">
    <label class="form-label" for="pf-notes">Notes</label>
    <textarea class="form-textarea" id="pf-notes" name="permit-notes" rows="2"
    placeholder="Restrictions, appointment date, renewal fee paid…">${escapeHtml(p.notes || '')}</textarea>
    </div>
    ${renewing ? `<p class="form-hint" style="margin-bottom:12px">
    Enter the new expiration date. The previous expiration (${formatDate(p.expirationDate)}) is kept in the notes.
    </p>` : ''}
    <div class="permit-form-actions">
    <button class="btn btn-ghost" data-modal="permit-modal">Cancel</button>
    <button class="btn btn-primary" data-action="save-permit">
    <i class="fas fa-check"></i> ${renewing ? 'Save Renewal' : 'Save Permit'}
    </button>
    </div>`;
    const labelInput = document.getElementById('pf-label');
    if (labelInput && !p.label) labelInput.focus();
}
export function savePermit() {
    const label = (document.getElementById('pf-label')?.value || '').trim();
    const expirationDate = document.getElementById('pf-expiration')?.value || '';
    const issueDate = document.getElementById('pf-issue')?.value || '';
    const renewing = document.getElementById('permit-modal-title')?.textContent === 'Renew Permit';
    if (!label) {
        toast('Give the permit a name', 'error');
        document.getElementById('pf-label')?.focus();
        return;
    }
    if (!expirationDate) {
        toast('An expiration date is required', 'error');
        document.getElementById('pf-expiration')?.focus();
        return;
    }
    if (issueDate && expirationDate < issueDate) {
        toast('Expiration must be after the issue date', 'error');
        document.getElementById('pf-expiration')?.focus();
        return;
    }
    const existing = state.editingPermitId
        ? state.permits.find(p => p.id === state.editingPermitId)
        : null;
    const previousExpiration = existing?.expirationDate || '';
    let notes = (document.getElementById('pf-notes')?.value || '').trim();
    if (renewing && previousExpiration && previousExpiration !== expirationDate) {
        const stamp = `Renewed ${new Date().toLocaleDateString()}; previous expiration ${formatDate(previousExpiration)}`;
        notes = notes ? `${notes}\n${stamp}` : stamp;
    }
    const permit = {
        id: existing?.id || `permit_${Date.now()}`,
        label,
        type: document.getElementById('pf-type')?.value || 'other',
        authority: (document.getElementById('pf-authority')?.value || '').trim(),
        number: (document.getElementById('pf-number')?.value || '').trim(),
        issueDate,
        expirationDate,
        notes,
        updatedAt: new Date().toISOString()
    };
    if (existing) {
        const index = state.permits.findIndex(p => p.id === existing.id);
        state.permits[index] = permit;
    } else {
        state.permits.push(permit);
    }
    db.save();
    updateBadges(state.guns.length, state.ammo.length, getPermitCount());
    closeModal('permit-modal');
    toast(`${existing ? 'Updated' : 'Added'} ${permit.label}`, 'success');
    state.editingPermitId = null;
    maybeNotifyExpiring(true);
    if (state.currentPage === 'permits') {
        navigateToPermits();
    }
}
function navigateToPermits() {
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = renderPermits();
}
export function confirmDeletePermit(id) {
    const permit = state.permits.find(p => p.id === id);
    if (!permit) return;
    const body = document.getElementById('confirm-modal-body');
    if (!body) return;
    body.innerHTML = `
    <p style="color:var(--text2);margin-bottom:6px">Are you sure you want to delete:</p>
    <p style="font-weight:600;font-size:16px;margin-bottom:18px">${escapeHtml(permit.label || 'Permit')}</p>
    <p style="font-size:12px;color:var(--text3)">This action cannot be undone.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" data-modal="confirm-modal">Cancel</button>
    <button class="btn btn-danger btn-sm" data-action="delete-permit" data-permit-id="${escapeHtml(id)}">
    <i class="fas fa-trash"></i> Delete
    </button>
    </div>`;
    openModal('confirm-modal');
}
export function deletePermit(id) {
    const permit = state.permits.find(p => p.id === id);
    if (!permit) return;
    state.permits = state.permits.filter(p => p.id !== id);
    db.save();
    updateBadges(state.guns.length, state.ammo.length, getPermitCount());
    closeModal('confirm-modal');
    toast(`${permit.label || 'Permit'} deleted`, 'info');
    if (state.currentPage === 'permits') {
        navigateToPermits();
    }
}
export function togglePermitNotify() {
    state.permitNotifyEnabled = !state.permitNotifyEnabled;
    db.save();
    if (state.permitNotifyEnabled) {
        toast('Permit expiration alerts turned on', 'success');
        requestBrowserNotificationPermission().then(permission => {
            if (permission === 'granted') {
                toast('Browser notifications allowed', 'success');
            } else if (permission === 'denied') {
                toast('Browser notifications are blocked — in-app alerts still work', 'info');
            }
            if (state.currentPage === 'permits') navigateToPermits();
        });
    } else {
        toast('Permit expiration alerts turned off', 'info');
    }
    if (state.currentPage === 'permits') {
        navigateToPermits();
    }
}
export function enableBrowserNotifications() {
    requestBrowserNotificationPermission().then(permission => {
        if (permission === 'granted') {
            toast('Browser notifications allowed', 'success');
        } else if (permission === 'denied') {
            toast('Notifications are blocked in your browser settings', 'info');
        } else {
            toast('No answer from the browser — in-app alerts stay on', 'info');
        }
        if (state.currentPage === 'permits') navigateToPermits();
    });
}
export function setPermitLeadDays(days) {
    const value = Number(days);
    state.permitLeadDays = Number.isFinite(value) && value >= 0 ? value : 30;
    db.save();
    updateBadges(state.guns.length, state.ammo.length, getPermitCount());
    if (state.currentPage === 'permits') {
        navigateToPermits();
    }
}
export function browserNotifyState() {
    try {
        if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
            return 'unsupported';
        }
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        return 'default';
    } catch (error) {
        return 'unsupported';
    }
}
function requestBrowserNotificationPermission() {
    const current = browserNotifyState();
    if (current !== 'default') return Promise.resolve(current);
    try {
        const result = Notification.requestPermission();
        if (result && typeof result.then === 'function') {
            return result.then(
                value => (typeof value === 'string' ? value : browserNotifyState()),
                () => browserNotifyState()
            );
        }
        return new Promise(resolve => {
            try {
                Notification.requestPermission(value => resolve(value || browserNotifyState()));
            } catch (error) {
                resolve(browserNotifyState());
            }
        });
    } catch (error) {
        return Promise.resolve(browserNotifyState());
    }
}
export function maybeNotifyExpiring(force = false) {
    if (!state.permitNotifyEnabled) return;
    const alerts = getExpiringPermits();
    if (!alerts.length) return;
    const key = '2a-permit-alert-shown';
    if (!force) {
        try {
            if (sessionStorage.getItem(key) === '1') return;
            sessionStorage.setItem(key, '1');
        } catch (error) {
        }
    }
    const summary =
        alerts.length === 1
            ? `${alerts[0].label || 'A permit'} ${getPermitStatus(alerts[0]).label.toLowerCase()}`
            : `${alerts.length} permits are expiring soon`;
    toast(summary, 'info');
    try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('2A Toolbox — permit expiration', {
                body: alerts
                    .slice(0, 4)
                    .map(p => `${p.label || 'Permit'}: ${getPermitStatus(p).label}`)
                    .join('\n'),
                tag: '2a-permit-expiration'
            });
        }
    } catch (error) {
    }
}