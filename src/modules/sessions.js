'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { escapeHtml, toast, openModal, closeModal } from './utils.js';
import { showGunDetail } from './guns.js';

/**
 * Open modal to log a range session or cleaning
 * @param {string} gunId - Gun ID to log session for
 * @param {string} type - Session type ('range' or 'cleaning')
 */
export function openLogSession(gunId, type) {
    closeModal('detail-modal');

    const gun = state.guns.find(g => g.id === gunId);
    if (!gun) return;

    const isRange = type === 'range';
    document.getElementById('session-modal-title').textContent =
    `${isRange ? 'Log Range Session' : 'Log Cleaning'} — ${gun.name}`;

    // Generate today's date in readable format
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).replace(',', '');

    document.getElementById('session-modal-body').innerHTML = `
    <div class="form-group">
    <label class="form-label">Date</label>
    <input class="form-input" id="session-date" value="${dateStr}">
    </div>

    ${isRange ? `
        <div class="form-group">
        <label class="form-label">Shots Fired This Session</label>
        <input class="form-input" type="number" id="session-shots" placeholder="e.g. 50" min="0">
        </div>
        ` : ''}

        <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="session-notes" placeholder="e.g. 100rds Federal 115gr">
        </div>
        `;

        document.getElementById('session-modal-footer').innerHTML = `
        <button class="btn btn-ghost btn-sm" data-modal="session-modal">Cancel</button>
        <button class="btn btn-primary btn-sm"
        data-action="save-session"
        data-gun-id="${gunId}"
        data-session-type="${type}">
        <i class="fas fa-save"></i> Save
        </button>
        `;

        openModal('session-modal');
}

/**
 * Save a range session or cleaning session
 * @param {string} gunId - Gun ID to save session for
 * @param {string} type - Session type ('range' or 'cleaning')
 */
export function saveSession(gunId, type) {
    const gun = state.guns.find(g => g.id === gunId);
    if (!gun) return;

    const date = document.getElementById('session-date').value.trim();
    const notes = (document.getElementById('session-notes')?.value || '').trim();
    const text = notes ? `${date} — ${notes}` : date;

    if (type === 'range') {
        const shots = Number(document.getElementById('session-shots')?.value) || 0;

        if (shots > 0) {
            // Store session info and open ammo deduction modal
            state.editingSessionGunId = gunId;
            state.editingSessionType = type;
            closeModal('session-modal');
            window.app.openAmmoDeductionModal(gun, shots, text);
        } else {
            // Log session without ammo deduction
            gun.rangeSessions.push({ text: text });
            db.save();
            closeModal('session-modal');
            toast('Session logged', 'success');
            showGunDetail(gunId);
        }
    } else {
        // Cleaning session
        gun.cleaningSessions.push({ text: text });
        gun.cleanings++;
        db.save();
        closeModal('session-modal');
        toast('Session logged', 'success');
        showGunDetail(gunId);
    }
}

/**
 * Open modal to edit an existing session
 * @param {string} gunId - Gun ID
 * @param {string} sessionType - Session type ('range' or 'cleaning')
 * @param {number} sessionIndex - Index of session in array
 */
export function openEditSession(gunId, sessionType, sessionIndex) {
    closeModal('detail-modal');

    const gun = state.guns.find(g => g.id === gunId);
    if (!gun) return;

    state.editingSessionGunId = gunId;
    state.editingSessionIndex = sessionIndex;
    state.editingSessionType = sessionType;

    const sessions = sessionType === 'range' ? gun.rangeSessions : gun.cleaningSessions;
    const session = sessions[sessionIndex];
    if (!session) return;

    document.getElementById('session-edit-modal-title').textContent =
    `Edit ${sessionType === 'range' ? 'Range Session' : 'Cleaning'}`;

    document.getElementById('session-edit-modal-body').innerHTML = `
    <div class="form-group">
    <label class="form-label">Session Text</label>
    <input class="session-edit-input" id="edit-session-text" value="${escapeHtml(session.text)}">
    </div>
    `;

    document.getElementById('session-edit-modal-footer').innerHTML = `
    <button class="btn btn-ghost btn-sm" data-modal="session-edit-modal">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="window.app.saveEditedSession()">
    <i class="fas fa-save"></i> Save
    </button>
    `;

    openModal('session-edit-modal');
}

/**
 * Save edited session
 */
export function saveEditedSession() {
    const gun = state.guns.find(g => g.id === state.editingSessionGunId);
    if (!gun) return;

    const newText = document.getElementById('edit-session-text').value.trim();
    if (!newText) {
        toast('Session text cannot be empty', 'error');
        return;
    }

    const sessions = state.editingSessionType === 'range'
    ? gun.rangeSessions
    : gun.cleaningSessions;
    sessions[state.editingSessionIndex].text = newText;

    db.save();
    closeModal('session-edit-modal');
    toast('Session updated', 'success');
    showGunDetail(state.editingSessionGunId);
}

/**
 * Confirm session deletion
 * @param {string} gunId - Gun ID
 * @param {string} sessionType - Session type ('range' or 'cleaning')
 * @param {number} sessionIndex - Index of session in array
 */
export function confirmDeleteSession(gunId, sessionType, sessionIndex) {
    closeModal('detail-modal');

    const gun = state.guns.find(g => g.id === gunId);
    if (!gun) return;

    const sessions = sessionType === 'range' ? gun.rangeSessions : gun.cleaningSessions;
    const session = sessions[sessionIndex];
    if (!session) return;

    document.getElementById('confirm-modal-body').innerHTML = `
    <p style="color:var(--text2);margin-bottom:6px">
    Delete this ${sessionType === 'range' ? 'range session' : 'cleaning'}?
    </p>
    <p style="font-weight:500;font-size:14px;margin-bottom:18px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm)">
    ${session.text}
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" data-modal="confirm-modal">Cancel</button>
    <button class="btn btn-danger btn-sm"
    data-action="confirm-delete-session"
    data-gun-id="${gunId}"
    data-session-type="${sessionType}"
    data-session-index="${sessionIndex}">
    <i class="fas fa-trash"></i> Delete
    </button>
    </div>
    `;

    openModal('confirm-modal');
}

/**
 * Delete a session
 * @param {string} gunId - Gun ID
 * @param {string} sessionType - Session type ('range' or 'cleaning')
 * @param {number} sessionIndex - Index of session in array
 */
export function deleteSession(gunId, sessionType, sessionIndex) {
    const gun = state.guns.find(g => g.id === gunId);
    if (!gun) return;

    if (sessionType === 'range') {
        gun.rangeSessions.splice(sessionIndex, 1);
    } else {
        gun.cleaningSessions.splice(sessionIndex, 1);
        if (gun.cleanings > 0) gun.cleanings--;
    }

    db.save();
    closeModal('confirm-modal');
    toast('Session deleted', 'info');
    showGunDetail(gunId);
}
