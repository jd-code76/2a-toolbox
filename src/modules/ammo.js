/*=====================================================================
  2A Toolbox – ammo.js
  Ammunition storage/inventory
=====================================================================*/

'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { closeModal, escapeHtml, openModal, toast, updateBadges } from './utils.js';
import { navigate } from './navigation.js';
import { renderAmmoCard } from './renderers.js';

/**
 * Show detailed view of ammunition in a modal
 * @param {string} id - Ammo ID to display
 */
export function showAmmoDetail(id) {
    const ammo = state.ammo.find(a => a.id === id);
    if (!ammo) return;

    document.getElementById('ammo-detail-title').textContent = ammo.brand;

    document.getElementById('ammo-detail-body').innerHTML = `
    <div class="info-row">
    <span class="info-label">Brand</span>
    <span class="info-value">${ammo.brand}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Caliber</span>
    <span class="info-value" style="color:var(--accent)">${ammo.caliber}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Type</span>
    <span class="info-value">${ammo.type || 'N/A'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Subtype</span>
    <span class="info-value">${ammo.subtype || 'N/A'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Price</span>
    <span class="info-value">${ammo.price || 'N/A'}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Notes</span>
    <span class="info-value">${ammo.notes || 'N/A'}</span>
    </div>

    <!-- Round Count Display -->
    <div style="margin-top:20px;padding:20px;background:var(--surface2);border-radius:var(--radius);text-align:center">
    <div style="font-size:40px;font-weight:700;color:var(--accent)">
    ${(Number(ammo.rounds) || 0).toLocaleString()}
    </div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">
    rounds on hand
    </div>
    </div>

    <!-- Quick Update -->
    <div class="form-group" style="margin-top:18px">
    <label class="form-label">Update Round Count</label>
    <div style="display:flex;gap:10px">
    <input class="form-input" type="number" id="ammo-rounds-input" value="${ammo.rounds}" min="0">
    <button class="btn btn-primary"
    data-action="update-ammo-rounds"
    data-ammo-id="${id}">
    <i class="fas fa-sync"></i> Update
    </button>
    </div>
    </div>
    `;

    document.getElementById('ammo-detail-footer').innerHTML = `
    <button class="btn btn-ghost btn-sm" data-modal="ammo-detail-modal">Close</button>
    <button class="btn btn-ghost btn-sm"
    data-action="edit-ammo"
    data-ammo-id="${id}">
    <i class="fas fa-edit"></i> Edit
    </button>
    <button class="btn btn-danger btn-sm"
    data-action="delete-ammo"
    data-ammo-id="${id}">
    <i class="fas fa-trash"></i> Delete
    </button>
    `;

    openModal('ammo-detail-modal');

    // Reset scroll position
    setTimeout(() => {
        const modalBody = document.querySelector('#ammo-detail-modal .modal-body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }, 0);
}

/**
 * Update ammunition round count from detail modal
 * @param {string} id - Ammo ID to update
 */
export function updateAmmoRounds(id) {
    const ammo = state.ammo.find(a => a.id === id);
    if (!ammo) return;

    const value = Number(document.getElementById('ammo-rounds-input').value);
    ammo.rounds = isNaN(value) ? 0 : value;

    db.save();
    closeModal('ammo-detail-modal');
    toast('Round count updated', 'success');
    navigate('ammo');
}

/**
 * Open modal to add new ammunition
 */
export function openAddAmmo() {
    state.editingAmmoId = null;
    document.getElementById('ammo-modal-title').textContent = 'Add Ammunition';
    renderAmmoForm(null);
    openModal('ammo-modal');
}

/**
 * Open modal to edit existing ammunition
 * @param {string} id - Ammo ID to edit
 */
export function openEditAmmo(id) {
    closeModal('ammo-detail-modal');

    const ammo = state.ammo.find(a => a.id === id);
    if (!ammo) return;

    state.editingAmmoId = id;
    document.getElementById('ammo-modal-title').textContent = 'Edit Ammunition';
    renderAmmoForm(ammo);
    openModal('ammo-modal');
}

/**
 * Render ammunition form for adding or editing
 * @param {Object|null} ammo - Ammo object to edit, or null for new ammo
 */
function renderAmmoForm(ammo) {
    const a = ammo || {};

    document.getElementById('ammo-modal-body').innerHTML = `
    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Brand *</label>
    <input class="form-input" id="af-brand" value="${escapeHtml(a.brand || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Caliber *</label>
    <input class="form-input" id="af-caliber" value="${escapeHtml(a.caliber || '')}">
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Type (e.g. 115gr, FMJ)</label>
    <input class="form-input" id="af-type" value="${escapeHtml(a.type || '')}">
    </div>
    <div class="form-group">
    <label class="form-label">Subtype (e.g. brass)</label>
    <input class="form-input" id="af-subtype" value="${escapeHtml(a.subtype || '')}">
    </div>
    </div>

    <div class="form-row">
    <div class="form-group">
    <label class="form-label">Rounds on Hand</label>
    <input class="form-input" type="number" id="af-rounds" value="${a.rounds || 0}" min="0">
    </div>
    <div class="form-group">
    <label class="form-label">Price</label>
    <input class="form-input" id="af-price" value="${escapeHtml(a.price || '')}">
    </div>
    </div>

    <div class="form-group">
    <label class="form-label">Notes</label>
    <textarea class="form-textarea" id="af-notes">${escapeHtml(a.notes || '')}</textarea>
    </div>

    <div class="modal-footer" style="padding:0;border:none;margin-top:12px">
    <button class="btn btn-ghost" data-modal="ammo-modal">Cancel</button>
    <button class="btn btn-primary" onclick="window.app.saveAmmo()">
    <i class="fas fa-save"></i> Save
    </button>
    </div>
    `;
}

/**
 * Save ammunition (add new or update existing)
 */
export function saveAmmo() {
    const brand = document.getElementById('af-brand').value.trim();
    const caliber = document.getElementById('af-caliber').value.trim();

    if (!brand || !caliber) {
        toast('Brand and Caliber required', 'error');
        return;
    }

    const ammo = {
        id: state.editingAmmoId || String(Date.now()),
        brand: brand,
        caliber: caliber,
        type: document.getElementById('af-type').value.trim(),
        subtype: document.getElementById('af-subtype').value.trim(),
        rounds: Number(document.getElementById('af-rounds').value) || 0,
        price: document.getElementById('af-price').value.trim(),
        notes: document.getElementById('af-notes').value.trim(),
        status: true
    };

    if (state.editingAmmoId) {
        // Update existing
        const index = state.ammo.findIndex(a => a.id === state.editingAmmoId);
        if (index >= 0) {
            state.ammo[index] = ammo;
        }
    } else {
        // Add new
        state.ammo.push(ammo);
    }

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('ammo-modal');
    toast(`${state.editingAmmoId ? 'Updated' : 'Added'} ${brand}`, 'success');
    navigate('ammo');
}

/**
 * Confirm ammunition deletion
 * @param {string} id - Ammo ID to delete
 */
export function confirmDeleteAmmo(id) {
    closeModal('ammo-detail-modal');

    const ammo = state.ammo.find(a => a.id === id);
    if (!ammo) return;

    document.getElementById('confirm-modal-body').innerHTML = `
    <p style="color:var(--text2);margin-bottom:6px">Delete ammo entry:</p>
    <p style="font-weight:600;font-size:16px;margin-bottom:18px">
    ${ammo.brand} — ${ammo.caliber}
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" data-modal="confirm-modal">Cancel</button>
    <button class="btn btn-danger btn-sm"
    data-action="confirm-delete-ammo"
    data-ammo-id="${id}">
    <i class="fas fa-trash"></i> Delete
    </button>
    </div>
    `;

    openModal('confirm-modal');
}

/**
 * Delete ammunition permanently
 * @param {string} id - Ammo ID to delete
 */
export function deleteAmmo(id) {
    state.ammo = state.ammo.filter(a => a.id !== id);

    db.save();
    updateBadges(state.guns.length, state.ammo.length);
    closeModal('confirm-modal');
    toast('Ammo deleted', 'info');
    navigate('ammo');
}

/**
 * Apply filter and search to ammo list
 * @param {string} filter - Filter type (all, caliber name, stocked, low, empty)
 * @param {string} query - Search query string
 */
export function applyAmmoFilter(filter, searchQuery = '') {
    const ammoCards = document.querySelectorAll('#ammo-grid .ammo-card');
    
    ammoCards.forEach(card => {
        const brand = card.querySelector('.ammo-name')?.textContent.toLowerCase() || '';
        const caliber = card.querySelector('.ammo-cal')?.textContent.toLowerCase() || '';
        const cardStatus = card.getAttribute('data-status');
        
        let matchesFilter = false;
        
        if (filter === 'all') {
            matchesFilter = true;
        } else if (filter === 'stocked' || filter === 'low' || filter === 'empty') {
            matchesFilter = cardStatus === filter;
        } else {
            // It's a specific caliber filter
            matchesFilter = caliber === filter.toLowerCase();
        }
        
        const matchesSearch = !searchQuery || 
            brand.includes(searchQuery) || 
            caliber.includes(searchQuery);
            
        if (matchesFilter && matchesSearch) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}
