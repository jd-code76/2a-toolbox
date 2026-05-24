'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { toast, openModal, closeModal } from './utils.js';
import { showGunDetail } from './guns.js';
import { openLogSession } from './sessions.js';

/**
 * Caliber compatibility mapping
 * Maps calibers that are interchangeable or closely related
 */
const CALIBER_COMPATIBILITY = {
    // 5.56 NATO and .223 Remington
    '5.56': ['5.56', '.223', '5.56x45', '5.56mm', '5.56 nato', '.223 remington', '.223 rem'],
    '.223': ['5.56', '.223', '5.56x45', '5.56mm', '5.56 nato', '.223 remington', '.223 rem'],
    '5.56x45': ['5.56', '.223', '5.56x45', '5.56mm', '5.56 nato', '.223 remington', '.223 rem'],

    // .38 Special and .357 Magnum (357 can shoot 38, but not vice versa in reality)
    '.357': ['.357', '.357 magnum', '.357 mag', '.38 special', '.38 spl', '38 special'],
    '.38 special': ['.38 special', '.38 spl', '38 special', '.38'],
    '.38': ['.38 special', '.38 spl', '38 special', '.38'],

    // 7.62x51 NATO and .308 Winchester
    '7.62x51': ['7.62x51', '7.62', '.308', '.308 win', '.308 winchester', '7.62 nato'],
    '.308': ['7.62x51', '7.62', '.308', '.308 win', '.308 winchester', '7.62 nato'],

    // 9mm Luger/Parabellum (various names)
    '9mm': ['9mm', '9x19', '9mm luger', '9mm parabellum', '9mm para'],
    '9x19': ['9mm', '9x19', '9mm luger', '9mm parabellum', '9mm para'],

    // .45 ACP and .45 Auto (same round, different names)
    '.45 acp': ['.45 acp', '.45 auto', '.45'],
    '.45 auto': ['.45 acp', '.45 auto', '.45'],
    '.45': ['.45 acp', '.45 auto', '.45'],

    // .40 S&W variations
    '.40': ['.40', '.40 sw', '.40 s&w'],
    '.40 sw': ['.40', '.40 sw', '.40 s&w'],

    // 10mm Auto
    '10mm': ['10mm', '10mm auto'],

    // .380 ACP (also called 9mm Short, 9mm Kurz)
    '.380': ['.380', '.380 acp', '9mm short', '9mm kurz'],
    '.380 acp': ['.380', '.380 acp', '9mm short', '9mm kurz'],

    // 7.62x39 (AK-47 round)
    '7.62x39': ['7.62x39', '7.62'],

    // .22 LR and variations
    '.22': ['.22', '.22lr', '.22 lr', '.22 long rifle'],
    '.22lr': ['.22', '.22lr', '.22 lr', '.22 long rifle'],

    // 12 gauge variations
    '12 gauge': ['12 gauge', '12ga', '12 ga'],
    '12ga': ['12 gauge', '12ga', '12 ga'],

    // 20 gauge variations
    '20 gauge': ['20 gauge', '20ga', '20 ga'],
    '20ga': ['20 gauge', '20ga', '20 ga'],

    // .30-06 Springfield
    '.30-06': ['.30-06', '30-06', '.30-06 springfield'],
    '30-06': ['.30-06', '30-06', '.30-06 springfield'],

    // .300 Blackout / .300 AAC
    '.300 blackout': ['.300 blackout', '.300 blk', '300 aac', '.300 aac blackout'],
    '.300 blk': ['.300 blackout', '.300 blk', '300 aac', '.300 aac blackout'],

    // 6.5 Creedmoor
    '6.5': ['6.5', '6.5 creedmoor', '6.5cm'],
    '6.5 creedmoor': ['6.5', '6.5 creedmoor', '6.5cm'],
};

/**
 * Check if two calibers are compatible
 * @param {string} gunCaliber - Gun's caliber
 * @param {string} ammoCaliber - Ammo's caliber
 * @returns {boolean} True if calibers are compatible
 */
function areCalibersCompatible(gunCaliber, ammoCaliber) {
    const gun = gunCaliber.toLowerCase().trim();
    const ammo = ammoCaliber.toLowerCase().trim();

    // Exact match
    if (gun === ammo) return true;

    // Check compatibility map
    for (const [key, compatibles] of Object.entries(CALIBER_COMPATIBILITY)) {
        if (gun.includes(key.toLowerCase()) || key.toLowerCase().includes(gun)) {
            // Check if ammo caliber matches any compatible caliber
            return compatibles.some(compat =>
            ammo.includes(compat.toLowerCase()) || compat.toLowerCase().includes(ammo)
            );
        }
    }

    // Fallback to substring matching (original behavior)
    return gun.includes(ammo) || ammo.includes(gun);
}

/**
 * Open modal to select ammunition for deduction after logging range session
 * @param {Object} gun - Gun object
 * @param {number} shots - Number of shots fired
 * @param {string} sessionText - Session text to log
 */
export function openAmmoDeductionModal(gun, shots, sessionText) {
    // Find matching ammunition using compatibility mapping
    const matchingAmmo = state.ammo.filter(ammo =>
    areCalibersCompatible(gun.caliber, ammo.caliber)
    );

    if (matchingAmmo.length === 0) {
        // No matching ammo found
        document.getElementById('ammo-select-body').innerHTML = `
        <div class="ammo-select-empty">
        <i class="fas fa-inbox"></i>
        <p>No matching ammunition found for ${gun.caliber}</p>
        <p style="margin-top:8px;font-size:12px">
        The session will be logged without deducting rounds.
        </p>
        </div>
        `;

        document.getElementById('ammo-select-footer').innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="window.app.cancelAmmoDeduction()">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="window.app.saveSessionWithoutDeduction()">
        Log Without Deduction
        </button>
        `;
    } else {
        // Show matching ammo for selection
        document.getElementById('ammo-select-body').innerHTML = `
        <p style="color:var(--text2);font-size:13px;margin-bottom:14px">
        Select ammunition to deduct ${shots} rounds from:
        </p>
        <div class="ammo-select-list">
        ${matchingAmmo.map(ammo => `
            <div class="ammo-select-item" data-ammo-id="${ammo.id}">
            <div class="ammo-select-info">
            <div class="ammo-select-name">${ammo.brand}</div>
            <div class="ammo-select-details">
            ${ammo.caliber} · ${ammo.type || 'N/A'}
            </div>
            </div>
            <div class="ammo-select-rounds">${ammo.rounds}</div>
            </div>
            `).join('')}
            </div>
            <div class="ammo-deduct-input">
            <label>Rounds to deduct:</label>
            <input class="form-input" type="number" id="ammo-deduct-amount" value="${shots}" min="0">
            </div>
            `;

            document.getElementById('ammo-select-footer').innerHTML = `
            <button class="btn btn-ghost btn-sm" onclick="window.app.cancelAmmoDeduction()">Cancel</button>
            <button class="btn btn-ghost btn-sm" onclick="window.app.saveSessionWithoutDeduction()">Skip Deduction</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveSessionWithDeduction()">
            <i class="fas fa-check"></i> Deduct & Log
            </button>
            `;

            // Attach click handlers for ammo selection
            setTimeout(() => {
                document.querySelectorAll('.ammo-select-item').forEach(item => {
                    item.addEventListener('click', function() {
                        document.querySelectorAll('.ammo-select-item').forEach(i => i.classList.remove('selected'));
                        this.classList.add('selected');
                        state.selectedAmmoForDeduction = this.getAttribute('data-ammo-id');
                    });
                });
            }, 0);
    }

    openModal('ammo-select-modal');
}

/**
 * Cancel ammo deduction and return to session modal
 */
export function cancelAmmoDeduction() {
    closeModal('ammo-select-modal');
    state.selectedAmmoForDeduction = null;
    openLogSession(state.editingSessionGunId, state.editingSessionType);
}

/**
 * Save session without deducting ammunition
 */
export function saveSessionWithoutDeduction() {
    const gun = state.guns.find(g => g.id === state.editingSessionGunId);
    if (!gun) return;

    const date = document.getElementById('session-date')?.value ||
    new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).replace(',', '');
    const notes = document.getElementById('session-notes')?.value || '';
    const text = notes ? `${date} — ${notes}` : date;
    const shots = Number(document.getElementById('session-shots')?.value) || 0;

    gun.rangeSessions.push({ text: text });
    gun.shots += shots;

    db.save();
    closeModal('ammo-select-modal');
    toast('Session logged (ammo not deducted)', 'success');
    showGunDetail(state.editingSessionGunId);
    state.selectedAmmoForDeduction = null;
}

/**
 * Save session and deduct selected ammunition
 */
export function saveSessionWithDeduction() {
    if (!state.selectedAmmoForDeduction) {
        toast('Please select an ammunition entry', 'error');
        return;
    }

    const gun = state.guns.find(g => g.id === state.editingSessionGunId);
    const ammo = state.ammo.find(a => a.id === state.selectedAmmoForDeduction);
    if (!gun || !ammo) return;

    const deductAmount = Number(document.getElementById('ammo-deduct-amount').value) || 0;

    if (deductAmount > ammo.rounds) {
        toast(`Not enough rounds available (${ammo.rounds} available)`, 'error');
        return;
    }

    const date = document.getElementById('session-date')?.value ||
    new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).replace(',', '');
    const notes = document.getElementById('session-notes')?.value || '';
    const text = notes ? `${date} — ${notes}` : date;
    const shots = Number(document.getElementById('session-shots')?.value) || 0;

    gun.rangeSessions.push({ text: text });
    gun.shots += shots;
    ammo.rounds -= deductAmount;

    db.save();
    closeModal('ammo-select-modal');
    toast(`Session logged and ${deductAmount} rounds deducted`, 'success');
    showGunDetail(state.editingSessionGunId);
    state.selectedAmmoForDeduction = null;
}
