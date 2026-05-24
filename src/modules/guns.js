'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { escapeHtml, getTypeIcon, parseSessionDate, toast, openModal, closeModal, updateBadges } from './utils.js';
import { navigate } from './navigation.js';
import { renderGunCard } from './renderers.js';

/**
 * Show detailed view of a gun in a modal
 * @param {string} id - Gun ID to display
 */
export function showGunDetail(id) {
    const gun = [...state.guns, ...state.soldGuns].find(g => g.id === id);
    if (!gun) return;

    // Parse modifications
    const mods = (gun.mods || '').split('\n').filter(m => m.trim());
    const optic = gun.optics || {};

    // Sort sessions by date (newest first), preserving original indices for editing
    const sortedRangeSessions = gun.rangeSessions
    .map((session, index) => ({
        text: session.text,
        originalIndex: index,
        date: parseSessionDate(session.text)
    }))
    .sort((a, b) => b.date - a.date);

    const sortedCleaningSessions = gun.cleaningSessions
    .map((session, index) => ({
        text: session.text,
        originalIndex: index,
        date: parseSessionDate(session.text)
    }))
    .sort((a, b) => b.date - a.date);

    // Update modal title
    document.getElementById('detail-modal-title').textContent = gun.name;

    // Render modal body
    document.getElementById('detail-modal-body').innerHTML = `
    ${gun.sold ? `
        <div class="sold-banner">
        <i class="fas fa-exclamation-triangle"></i>
        This firearm has been marked as sold.
        </div>
        ` : ''}

        <!-- Gun Type and Caliber -->
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:20px">
        <span class="gun-type-badge type-${gun.sold ? 'sold' : (gun.type || 'other').toLowerCase()}">
        ${gun.sold ? '<i class="fas fa-ban"></i> SOLD' : getTypeIcon(gun.type || '') + (gun.type || 'Unknown')}
        </span>
        <span style="color:var(--text2);font-size:14px">
        <i class="fas fa-circle" style="font-size:8px;margin-right:6px"></i>${gun.caliber}
        </span>
        </div>

        <!-- Statistics Cards -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px">
        <div class="stat-card" style="padding:14px 16px">
        <div class="stat-label">Shots Fired</div>
        <div class="stat-value stat-accent">${(gun.shots || 0).toLocaleString()}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px">
        <div class="stat-label">Range Sessions</div>
        <div class="stat-value">${gun.rangeSessions.length}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px">
        <div class="stat-label">Cleanings</div>
        <div class="stat-value">${gun.cleanings || 0}</div>
        </div>
        </div>

        <!-- Details Grid -->
        <div class="detail-grid">
        <div>
        <!-- Basic Details -->
        <div class="card" style="margin-bottom:16px">
        <div class="card-title">
        <i class="fas fa-info-circle"></i> Details
        </div>
        <div class="info-row">
        <span class="info-label">Serial Number</span>
        <span class="info-value">${gun.serial || 'N/A'}</span>
        </div>
        <div class="info-row">
        <span class="info-label">Color</span>
        <span class="info-value">${gun.color || 'N/A'}</span>
        </div>
        <div class="info-row">
        <span class="info-label">Condition</span>
        <span class="info-value">${gun.oldNew || 'N/A'}</span>
        </div>
        <div class="info-row">
        <span class="info-label">Purchase Date</span>
        <span class="info-value">${gun.date || 'N/A'}</span>
        </div>
        <div class="info-row">
        <span class="info-label">Purchase Price</span>
        <span class="info-value">${gun.purchasePrice || 'N/A'}</span>
        </div>
        ${optic.name ? `
            <div class="info-row">
            <span class="info-label">Optic</span>
            <span class="info-value">
            <span class="optic-badge">
            <span class="optic-name">${optic.name}</span>
            <span class="optic-mag">${optic.magnification || ''}</span>
            </span>
            </span>
            </div>
            ` : ''}
            ${gun.specialNotes ? `
                <div class="info-row">
                <span class="info-label">Notes</span>
                <span class="info-value" style="white-space:pre-line;line-height:1.6">
                ${gun.specialNotes}
                </span>
                </div>
                ` : ''}
                </div>

                <!-- Modifications -->
                ${mods.length > 0 ? `
                    <div class="card" style="margin-bottom:16px">
                    <div class="card-title">
                    <i class="fas fa-wrench"></i> Modifications
                    </div>
                    <div class="mods-list">
                    ${mods.map(mod => `
                        <div class="mod-item">
                        <i class="fas fa-circle"></i>${mod}
                        </div>
                        `).join('')}
                        </div>
                        </div>
                        ` : ''}
                        </div>

                        <div>
                        <!-- Range Sessions -->
                        <div class="card" style="margin-bottom:16px">
                        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
                        <span><i class="fas fa-bullseye"></i> Range Sessions</span>
                        ${!gun.sold ? `
                            <button class="btn btn-sm btn-ghost"
                            data-action="log-range"
                            data-gun-id="${gun.id}">
                            <i class="fas fa-plus"></i> Log
                            </button>
                            ` : ''}
                            </div>
                            <div class="session-list">
                            ${sortedRangeSessions.length === 0
                                ? '<div style="color:var(--text3);font-size:13px">No sessions logged</div>'
                                : sortedRangeSessions.map(session => `
                                <div class="session-item editable">
                                <span class="session-dot"></span>
                                <span class="session-text">${session.text}</span>
                                <div class="session-actions">
                                <button class="btn btn-xs btn-ghost"
                                data-action="edit-session"
                                data-gun-id="${gun.id}"
                                data-session-type="range"
                                data-session-index="${session.originalIndex}">
                                <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-xs btn-danger"
                                data-action="delete-session"
                                data-gun-id="${gun.id}"
                                data-session-type="range"
                                data-session-index="${session.originalIndex}">
                                <i class="fas fa-trash"></i>
                                </button>
                                </div>
                                </div>
                                `).join('')
                            }
                            </div>
                            </div>

                            <!-- Cleaning Log -->
                            <div class="card">
                            <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
                            <span><i class="fas fa-spray-can"></i> Cleaning Log</span>
                            ${!gun.sold ? `
                                <button class="btn btn-sm btn-ghost"
                                data-action="log-cleaning"
                                data-gun-id="${gun.id}">
                                <i class="fas fa-plus"></i> Log
                                </button>
                                ` : ''}
                                </div>
                                <div class="session-list">
                                ${sortedCleaningSessions.length === 0
                                    ? '<div style="color:var(--text3);font-size:13px">No cleanings logged</div>'
                                    : sortedCleaningSessions.map(session => `
                                    <div class="session-item editable">
                                    <span class="session-dot" style="background:var(--green)"></span>
                                    <span class="session-text">${session.text}</span>
                                    <div class="session-actions">
                                    <button class="btn btn-xs btn-ghost"
                                    data-action="edit-session"
                                    data-gun-id="${gun.id}"
                                    data-session-type="cleaning"
                                    data-session-index="${session.originalIndex}">
                                    <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-xs btn-danger"
                                    data-action="delete-session"
                                    data-gun-id="${gun.id}"
                                    data-session-type="cleaning"
                                    data-session-index="${session.originalIndex}">
                                    <i class="fas fa-trash"></i>
                                    </button>
                                    </div>
                                    </div>
                                    `).join('')
                                }
                                </div>
                                </div>
                                </div>
                                </div>
                                `;

                                // Render modal footer with action buttons
                                document.getElementById('detail-modal-footer').innerHTML = `
                                <button class="btn btn-ghost btn-sm" data-modal="detail-modal">Close</button>
                                ${!gun.sold ? `
                                    <button class="btn btn-ghost btn-sm"
                                    data-action="edit-gun"
                                    data-gun-id="${gun.id}">
                                    <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-ghost btn-sm"
                                    style="color:var(--orange);border-color:var(--orange)"
                                    data-action="mark-sold"
                                    data-gun-id="${gun.id}">
                                    <i class="fas fa-dollar-sign"></i> Mark Sold
                                    </button>
                                    ` : `
                                    <button class="btn btn-ghost btn-sm"
                                    data-action="return-inventory"
                                    data-gun-id="${gun.id}">
                                    <i class="fas fa-undo"></i> Return to Inventory
                                    </button>
                                    `}
                                    <button class="btn btn-danger btn-sm"
                                    data-action="delete-gun"
                                    data-gun-id="${gun.id}">
                                    <i class="fas fa-trash"></i> Delete
                                    </button>
                                    `;

                                    openModal('detail-modal');
}

/**
 * Open modal to add a new gun
 */
export function openAddGun() {
    state.editingGunId = null;
    document.getElementById('gun-modal-title').textContent = 'Add Firearm';
    renderGunForm(null);
    openModal('gun-modal');
}

/**
 * Open modal to edit an existing gun
 * @param {string} id - Gun ID to edit
 */
export function openEditGun(id) {
    closeModal('detail-modal');

    const gun = [...state.guns, ...state.soldGuns].find(g => g.id === id);
    if (!gun) return;

    state.editingGunId = id;
    document.getElementById('gun-modal-title').textContent = 'Edit Firearm';
    renderGunForm(gun);
    openModal('gun-modal');
}

/**
 * Render gun form for adding or editing
 * @param {Object|null} gun - Gun object to edit, or null for new gun
 */
function renderGunForm(gun) {
    const g = gun || {};
    const isSold = g.sold || false;

    document.getElementById('gun-modal-body').innerHTML = `
    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Name *</label>
    <input class="form-input" id="gf-name" value="${escapeHtml(g.name || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Type</label>
    <select class="form-select" id="gf-type">
    <option value="" ${!g.type ? 'selected' : ''}>Select...</option>
    <option value="pistol" ${g.type === 'pistol' ? 'selected' : ''}>Pistol</option>
    <option value="rifle" ${g.type === 'rifle' ? 'selected' : ''}>Rifle</option>
    <option value="shotgun" ${g.type === 'shotgun' ? 'selected' : ''}>Shotgun</option>
    <option value="other" ${g.type === 'other' ? 'selected' : ''}>Other</option>
    </select>
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Caliber</label>
    <input class="form-input" id="gf-caliber" value="${escapeHtml(g.caliber || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Color</label>
    <input class="form-input" id="gf-color" value="${escapeHtml(g.color || '')}">
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Serial Number</label>
    <input class="form-input" id="gf-serial" value="${escapeHtml(g.serial || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Purchase Date</label>
    <input class="form-input" id="gf-date" value="${escapeHtml(g.date || '')}">
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Purchase Price</label>
    <input class="form-input" id="gf-price" value="${escapeHtml(g.purchasePrice || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Condition</label>
    <select class="form-select" id="gf-oldnew">
    <option value="New" ${(g.oldNew || 'New') === 'New' ? 'selected' : ''}>New</option>
    <option value="Used" ${g.oldNew === 'Used' ? 'selected' : ''}>Used</option>
    </select>
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Optic Name</label>
    <input class="form-input" id="gf-optic-name" value="${escapeHtml((g.optics || {}).name || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Optic Magnification</label>
    <input class="form-input" id="gf-optic-mag" value="${escapeHtml((g.optics || {}).magnification || '')}">
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Shots Fired</label>
    <input class="form-input" type="number" id="gf-shots" value="${g.shots || 0}">
    </div>
    <div class="form-group">
    <label class="form-label">Cleanings</label>
    <input class="form-input" type="number" id="gf-cleanings" value="${g.cleanings || 0}">
    </div>
    </div>

    <div class="form-group">
    <label class="form-label">Modifications (one per line)</label>
    <textarea class="form-textarea" id="gf-mods">${escapeHtml(g.mods || '')}</textarea>
    </div>

    <div class="form-group">
    <label class="form-label">Special Notes</label>
    <textarea class="form-textarea" id="gf-notes">${escapeHtml(g.specialNotes || '')}</textarea>
    </div>

    <div class="form-group" style="padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm)">
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:${isSold ? 'var(--red)' : 'var(--text2)'};font-weight:500">
    <input type="checkbox" id="gf-sold" ${isSold ? 'checked' : ''}
    style="width:16px;height:16px;accent-color:var(--accent)">
    Mark as Sold
    </label>
    </div>

    <div class="modal-footer" style="padding:0;border:none;margin-top:12px">
    <button class="btn btn-ghost" data-modal="gun-modal">Cancel</button>
    <button class="btn btn-primary" onclick="window.app.saveGun()">
    <i class="fas fa-save"></i> Save Firearm
    </button>
    </div>
    `;
}

/**
 * Save gun (add new or update existing)
 */
export function saveGun() {
    const name = document.getElementById('gf-name').value.trim();
    if (!name) {
        toast('Name is required', 'error');
        return;
    }

    const markSold = document.getElementById('gf-sold').checked;

    const gun = {
        id: state.editingGunId || String(Date.now()),
        name: name,
        type: document.getElementById('gf-type').value,
        caliber: document.getElementById('gf-caliber').value.trim(),
        color: document.getElementById('gf-color').value.trim(),
        serial: document.getElementById('gf-serial').value.trim(),
        date: document.getElementById('gf-date').value.trim(),
        purchasePrice: document.getElementById('gf-price').value.trim(),
        oldNew: document.getElementById('gf-oldnew').value,
        optics: {
            name: document.getElementById('gf-optic-name').value.trim(),
            magnification: document.getElementById('gf-optic-mag').value.trim()
        },
        shots: Number(document.getElementById('gf-shots').value) || 0,
        cleanings: Number(document.getElementById('gf-cleanings').value) || 0,
        mods: document.getElementById('gf-mods').value.trim(),
        specialNotes: document.getElementById('gf-notes').value.trim(),
        status: true,
        sold: markSold,
        rangeSessions: [],
        cleaningSessions: [],
        dryfire: 0,
        failures: 0
    };

    if (state.editingGunId) {
        // Editing existing gun - preserve sessions
        const existing = [...state.guns, ...state.soldGuns].find(g => g.id === state.editingGunId);
        if (existing) {
            gun.rangeSessions = existing.rangeSessions;
            gun.cleaningSessions = existing.cleaningSessions;
        }

        // Remove from both arrays
        state.guns = state.guns.filter(g => g.id !== state.editingGunId);
        state.soldGuns = state.soldGuns.filter(g => g.id !== state.editingGunId);

        // Add to correct array based on sold status
        if (markSold) {
            state.soldGuns.push(gun);
        } else {
            state.guns.push(gun);
        }
    } else {
        // Adding new gun
        if (markSold) {
            state.soldGuns.push(gun);
        } else {
            state.guns.push(gun);
        }
    }

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('gun-modal');
    toast(`${state.editingGunId ? 'Updated' : 'Added'} ${name}`, 'success');
    navigate('guns');
}

/**
 * Mark a gun as sold
 * @param {string} id - Gun ID to mark as sold
 */
export function markGunAsSold(id) {
    const index = state.guns.findIndex(g => g.id === id);
    if (index < 0) return;

    const gun = state.guns.splice(index, 1)[0];
    gun.sold = true;
    state.soldGuns.push(gun);

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('detail-modal');
    toast(`${gun.name} marked as sold`, 'info');
    navigate('guns');
}

/**
 * Return a sold gun back to active inventory
 * @param {string} id - Gun ID to return to inventory
 */
export function returnGunToInventory(id) {
    const index = state.soldGuns.findIndex(g => g.id === id);
    if (index < 0) return;

    const gun = state.soldGuns.splice(index, 1)[0];
    gun.sold = false;
    state.guns.push(gun);

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('detail-modal');
    toast(`${gun.name} returned to inventory`, 'success');
    navigate('guns');
}

/**
 * Confirm gun deletion
 * @param {string} id - Gun ID to delete
 */
export function confirmDeleteGun(id) {
    closeModal('detail-modal');

    const gun = [...state.guns, ...state.soldGuns].find(g => g.id === id);
    if (!gun) return;

    document.getElementById('confirm-modal-body').innerHTML = `
    <p style="color:var(--text2);margin-bottom:6px">
    Are you sure you want to delete:
    </p>
    <p style="font-weight:600;font-size:16px;margin-bottom:18px">${gun.name}</p>
    <p style="font-size:12px;color:var(--text3)">
    This action cannot be undone.
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" data-modal="confirm-modal">Cancel</button>
    <button class="btn btn-danger btn-sm"
    data-action="confirm-delete-gun"
    data-gun-id="${id}">
    <i class="fas fa-trash"></i> Delete
    </button>
    </div>
    `;

    openModal('confirm-modal');
}

/**
 * Delete a gun permanently
 * @param {string} id - Gun ID to delete
 */
export function deleteGun(id) {
    state.guns = state.guns.filter(g => g.id !== id);
    state.soldGuns = state.soldGuns.filter(g => g.id !== id);

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('confirm-modal');
    toast('Firearm deleted', 'info');
    navigate('guns');
}

/**
 * Apply filter and search to gun list
 * @param {string} filter - Filter type (all, pistol, rifle, shotgun, other, sold)
 * @param {string} query - Search query string
 */
export function applyGunFilter(filter, query) {
    let allGuns = [...state.guns, ...state.soldGuns];
    let filtered = allGuns;

    // Apply type filter
    if (filter === 'sold') {
        filtered = state.soldGuns;
    } else if (filter === 'other') {
        filtered = state.guns.filter(gun => !gun.type || gun.type.toLowerCase() === 'other');
    } else if (filter !== 'all') {
        filtered = state.guns.filter(gun => (gun.type || '').toLowerCase() === filter);
    }

    // Apply hide sold filter
    if (state.hideSold && filter !== 'sold') {
        filtered = filtered.filter(gun => !gun.sold);
    }

    // Apply search query
    if (query) {
        filtered = filtered.filter(gun =>
        gun.name.toLowerCase().includes(query) ||
        (gun.caliber || '').toLowerCase().includes(query) ||
        (gun.serial || '').toLowerCase().includes(query)
        );
    }

    // Sort alphabetically
    filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));

    // Render results
    const grid = document.getElementById('gun-grid');
    if (grid) {
        grid.innerHTML = filtered.length
        ? filtered.map(renderGunCard).join('')
        : '<div class="empty-state"><i class="fas fa-inbox"></i><p>No firearms found</p></div>';
    }
}
