/*=====================================================================
  2A Toolbox – import-export.js
  Database import/export as JSON
=====================================================================*/

'use strict';

import { DEFAULT_AMMO_THRESHOLDS, state } from './state.js';
import { db } from './database.js';
import { closeModal, openModal, toast, updateBadges } from './utils.js';
import { navigate } from './navigation.js';

/**
 * Import data from JSON backup file
 * Replaces existing items with matching IDs, adds new items
 * @param {string|Object} jsonData - JSON string or parsed object to import
 */
export function importData(jsonData) {
    try {
        const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const items = parsed.data || [];
        let gunsAdded = 0;
        let ammoAdded = 0;
        let soldAdded = 0;
        let gunsUpdated = 0;
        let ammoUpdated = 0;
        let soldUpdated = 0;

        items.forEach(item => {
            const doc = item.doc;
            if (!doc) return;

            // Import based on internal identifier
            if (doc.internalIdentifier === 'gun') {
                const gun = parseGun(doc);
                const existingIndex = state.guns.findIndex(g => g.id === gun.id);

                if (existingIndex >= 0) {
                    state.guns[existingIndex] = gun;
                    gunsUpdated++;
                } else {
                    state.guns.push(gun);
                    gunsAdded++;
                }

            } else if (doc.internalIdentifier === 'soldGun') {
                const gun = parseGun(doc, true);
                const existingIndex = state.soldGuns.findIndex(g => g.id === gun.id);

                if (existingIndex >= 0) {
                    state.soldGuns[existingIndex] = gun;
                    soldUpdated++;
                } else {
                    state.soldGuns.push(gun);
                    soldAdded++;
                }

            } else if (doc.internalIdentifier === 'ammo') {
                const ammo = parseAmmo(doc);
                const existingIndex = state.ammo.findIndex(a => a.id === ammo.id);

                if (existingIndex >= 0) {
                    state.ammo[existingIndex] = ammo;
                    ammoUpdated++;
                } else {
                    state.ammo.push(ammo);
                    ammoAdded++;
                }
            }
        });

        // Import settings if present
        if (parsed.settings) {
            if (parsed.settings.ammoThresholds) {
                state.ammoThresholds = {
                    pistol: parsed.settings.ammoThresholds.pistol || DEFAULT_AMMO_THRESHOLDS.pistol,
                    rifle: parsed.settings.ammoThresholds.rifle || DEFAULT_AMMO_THRESHOLDS.rifle,
                    shotgun: parsed.settings.ammoThresholds.shotgun || DEFAULT_AMMO_THRESHOLDS.shotgun,
                    bb: parsed.settings.ammoThresholds.bb || DEFAULT_AMMO_THRESHOLDS.bb,
                    airsoft: parsed.settings.ammoThresholds.airsoft || DEFAULT_AMMO_THRESHOLDS.airsoft
                };
            }
        }

        db.save();

        const totalNew = gunsAdded + ammoAdded + soldAdded;
        const totalUpdated = gunsUpdated + ammoUpdated + soldUpdated;

        if (totalNew > 0 && totalUpdated > 0) {
            toast(`Import complete: ${totalNew} new, ${totalUpdated} updated`, 'success');
        } else if (totalNew > 0) {
            toast(`Import complete: ${totalNew} items added`, 'success');
        } else if (totalUpdated > 0) {
            toast(`Import complete: ${totalUpdated} items updated`, 'success');
        } else {
            toast('Import complete: No changes detected', 'info');
        }

        updateBadges(state.guns.length, state.ammo.length);
        navigate('dashboard');

    } catch (error) {
        toast('Import failed: ' + error.message, 'error');
    }
}

/**
 * Parse gun object from import data with field name normalization
 * @param {Object} doc - Raw gun document from import
 * @param {boolean} sold - Whether gun is marked as sold
 * @returns {Object} Normalized gun object
 */
function parseGun(doc, sold = false) {
    return {
        id: doc._id || doc.id || String(Date.now()),
        name: doc.name || '',
        color: doc.color || '',
        date: doc.date || '',
        serial: doc.serial || '',
        oldNew: doc.oldnew || doc.oldNew || 'New',
        specialNotes: doc.specialnotes || doc.specialNotes || '',
        shots: Number(doc.shots) || 0,
        cleanings: Number(doc.cleanings) || 0,
        // Filter out empty sessions
        cleaningSessions: (doc.cleaningsessions || doc.cleaningSessions || [])
        .filter(s => s.text && s.text.toLowerCase() !== 'empty'),
        rangeSessions: (doc.rangesessions || doc.rangeSessions || [])
        .filter(s => s.text && s.text.toLowerCase() !== 'empty'),
        dryfire: doc.dryfire || 0,
        failures: doc.failures || 0,
        purchasePrice: doc.purchaseprice || doc.purchasePrice || '',
        mods: doc.mods || '',
        type: doc.type || '',
        caliber: doc.caliber || '',
        optics: doc.optics || { name: '', magnification: '' },
        status: doc.status !== false,
        sold: sold,
        manualSort: doc.manualSort || 0
    };
}

/**
 * Parse ammo object from import data with field name normalization
 * @param {Object} doc - Raw ammo document from import
 * @returns {Object} Normalized ammo object
 */
function parseAmmo(doc) {
    return {
        id: doc._id || doc.id || String(Date.now()),
        brand: doc.brand || '',
        caliber: doc.caliber || '',
        rounds: isNaN(Number(doc.rounds)) ? 0 : Number(doc.rounds),
        type: doc.type || '',
        subtype: doc.subtype || '',
        price: doc.price || '',
        notes: doc.notes || '',
        status: doc.status !== false
    };
}

/**
 * Export all data as JSON backup file
 * Compatible with original GunTracker format
 */
export function exportData() {
    // Combine all data items
    const allItems = [...state.guns, ...state.soldGuns, ...state.ammo];

    const exportObj = {
        data: allItems.map(item => {
            // Determine item type and internal identifier
            const hasShots = item.shots !== undefined;
            const isSold = item.sold === true;

            let internalIdentifier;
            if (isSold) {
                internalIdentifier = 'soldGun';
            } else if (hasShots) {
                internalIdentifier = 'gun';
            } else {
                internalIdentifier = 'ammo';
            }

            return {
                id: item.id,
                doc: {
                    ...item,
                    _id: item.id,
                    internalIdentifier
                }
            };
        }),
        settings: {
            ammoThresholds: state.ammoThresholds
        },
        status: true,
        version: '1.1'
    };

    // Create human-readable timestamp for filename
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const humanTimestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    // Create and download file
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `2a-toolbox_backup_${humanTimestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast('Export complete', 'success');
}

/**
 * Confirm and import file from file input
 */
export function confirmImport() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        toast('No file selected', 'error');
        return;
    }

    document.getElementById('confirm-modal-body').innerHTML = `
    <p style="color:var(--text);font-weight:600;margin-bottom:10px;font-size:15px">
    <i class="fas fa-file-import"></i> Import Backup?
    </p>
    <p style="color:var(--text2);font-size:13px;margin-bottom:18px;line-height:1.5">
    File: <strong>${file.name}</strong>
    </p>
    <p style="color:var(--text3);font-size:12px;margin-bottom:18px;line-height:1.5">
    Existing items with matching IDs will be replaced with data from this backup.
    Settings will also be imported if present in the backup file.
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" onclick="window.app.cancelImport()">Cancel</button>
    <button class="btn btn-primary btn-sm" onclick="window.app.executeImport()">
    <i class="fas fa-check"></i> Import
    </button>
    </div>
    `;
    openModal('confirm-modal');
}

/**
 * Cancel import and clear file input
 */
export function cancelImport() {
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
    closeModal('confirm-modal');
}

/**
 * Execute the import after confirmation
 */
export function executeImport() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        toast('No file selected', 'error');
        closeModal('confirm-modal');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            importData(e.target.result);
            fileInput.value = ''; // Clear file input
            closeModal('confirm-modal');
        } catch (error) {
            toast('Import failed: ' + error.message, 'error');
            closeModal('confirm-modal');
        }
    };
    reader.readAsText(file);
}

/**
 * Confirm and clear all application data
 */
export function confirmClearAll() {
    document.getElementById('confirm-modal-body').innerHTML = `
    <p style="color:var(--red);font-weight:600;margin-bottom:10px;font-size:15px">
    <i class="fas fa-exclamation-triangle"></i> This will delete ALL data!
    </p>
    <p style="color:var(--text2);font-size:13px;margin-bottom:18px;line-height:1.5">
    Export a backup first if you want to keep your data.
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
    <button class="btn btn-ghost btn-sm" data-modal="confirm-modal">Cancel</button>
    <button class="btn btn-danger btn-sm" onclick="window.app.clearAll()">
    <i class="fas fa-trash"></i> Clear Everything
    </button>
    </div>
    `;
    openModal('confirm-modal');
}

/**
 * Clear all application data
 */
export function clearAll() {
    state.guns = [];
    state.ammo = [];
    state.soldGuns = [];
    state.ammoThresholds = { ...DEFAULT_AMMO_THRESHOLDS };
    db.save();
    updateBadges(0, 0);
    closeModal('confirm-modal');
    toast('All data cleared', 'info');
    navigate('import');
}
