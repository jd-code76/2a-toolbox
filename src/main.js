/*=====================================================================
  2A Toolbox – main.js
  Main app execution
=====================================================================*/

'use strict';

import { db } from './modules/database.js';
import { initializeEventListeners } from './modules/events.js';
import { navigate } from './modules/navigation.js';
import { saveAmmoThresholds, resetAmmoThresholds } from './modules/ammo-settings.js';
import { state } from './modules/state.js';
import { toast, updateBadges } from './modules/utils.js';

// Attach state to window so it's accessible globally
window.state = state;

// Import all functions that need to be exposed globally
import { toggleMobileMenu } from './modules/utils.js';
import { openAddGun, saveGun, showGunDetail } from './modules/guns.js';
import { openAddAmmo, saveAmmo } from './modules/ammo.js';
import { saveEditedSession } from './modules/sessions.js';
import {
    importData,
    exportData,
    confirmImport,
    cancelImport,
    executeImport,
    confirmClearAll,
    clearAll
} from './modules/import-export.js';
import {
    openAmmoDeductionModal,
    cancelAmmoDeduction,
    saveSessionWithoutDeduction,
    saveSessionWithDeduction
} from './modules/ammo-deduction.js';

// APP_VERSION is used by renderers.js for about section
export const APP_VERSION = '1.0.8'

/**
 * Register service worker for offline functionality
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(reg => {
            console.log('Service Worker registered');
            // Send version to service worker
            if (reg.active) {
                reg.active.postMessage({ type: 'VERSION', version: APP_VERSION });
            }
            // Also send on controller change
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'VERSION',
                        version: APP_VERSION
                    });
                }
            });
        })
        .catch(err => console.log('Service Worker registration failed:', err));
    });
}

/**
 * Monitor online/offline status and update UI accordingly
 */
window.addEventListener('online', () => {
    document.getElementById('offline-indicator').classList.add('hidden');
    toast('Connection established. Switching to online mode.', 'success');
});

window.addEventListener('offline', () => {
    document.getElementById('offline-indicator').classList.remove('hidden');
    toast('Connection lost. Switching to offline mode.', 'info');
});

// Check initial online status
if (!navigator.onLine) {
    document.getElementById('offline-indicator').classList.remove('hidden');
}

/**
 * Initialize application on page load
 * Load data from IndexedDB and render dashboard
 */
async function initializeApp() {
    await db.load();
    updateBadges(window.state.guns.length, window.state.ammo.length);
    navigate('dashboard');
    initializeEventListeners();
}

// Expose necessary functions to global scope for inline event handlers
window.app = {
    // Utils
    toggleMobileMenu,

    // Gun functions
    openAddGun,
    saveGun,
    showGunDetail,

    // Ammo functions
    openAddAmmo,
    saveAmmo,

    // Session functions
    saveEditedSession,

    // Import/Export functions
    importData,
    exportData,
    confirmImport,
    cancelImport,
    executeImport,
    confirmClearAll,
    clearAll,

    // Ammo deduction functions
    openAmmoDeductionModal,
    cancelAmmoDeduction,
    saveSessionWithoutDeduction,
    saveSessionWithDeduction,

    // Settings functions
    saveAmmoThresholds,
    resetAmmoThresholds
};

// Start the application
initializeApp();
