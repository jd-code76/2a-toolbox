'use strict';
import { db } from './modules/database.js';
import { updateBadges, toast } from './modules/utils.js';
import { navigate } from './modules/navigation.js';
import { initializeEventListeners } from './modules/events.js';
import { state } from './modules/state.js';
window.state = state;
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
export const APP_VERSION = '1.0.2'
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
        .then(reg => {
            console.log('Service Worker registered');
            if (reg.active) {
                reg.active.postMessage({ type: 'VERSION', version: APP_VERSION });
            }
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
window.addEventListener('online', () => {
    document.getElementById('offline-indicator').classList.add('hidden');
    toast('Connection established. Switching to online mode.', 'success');
});
window.addEventListener('offline', () => {
    document.getElementById('offline-indicator').classList.remove('hidden');
    toast('Connection lost. Switching to offline mode.', 'info');
});
if (!navigator.onLine) {
    document.getElementById('offline-indicator').classList.remove('hidden');
}
async function initializeApp() {
    await db.load();
    updateBadges(window.state.guns.length, window.state.ammo.length);
    navigate('dashboard');
    initializeEventListeners();
}
window.app = {
    toggleMobileMenu,
    openAddGun,
    saveGun,
    showGunDetail,
    openAddAmmo,
    saveAmmo,
    saveEditedSession,
    importData,
    exportData,
    confirmImport,
    cancelImport,
    executeImport,
    confirmClearAll,
    clearAll,
    openAmmoDeductionModal,
    cancelAmmoDeduction,
    saveSessionWithoutDeduction,
    saveSessionWithDeduction
};
initializeApp();