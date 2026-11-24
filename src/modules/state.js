
'use strict';

export const DEFAULT_AMMO_THRESHOLDS = {
    pistol: 250,
    rifle: 500,
    shotgun: 50,
    bb: 1000,
    airsoft: 1500
};

/**
 * Global application state module
 * Manages all data and UI state for the application
 */
export const state = {
    guns: [],
    soldGuns: [],
    ammo: [],
    currentPage: 'dashboard',
    // Last page the user was viewing, persisted so a refresh returns them there
    lastPage: 'dashboard',
    hideSold: false,
    editingGunId: null,
    editingAmmoId: null,
    editingSessionGunId: null,
    editingSessionIndex: null,
    editingSessionType: null,
    selectedAmmoForDeduction: null,
    ammoFilter: 'all',
    ammoCategory: 'all',
    gunFilter: 'all',
    sessionFilter: 'all',
    cleaningFilter: 'all',
    ammoThresholds: { ...DEFAULT_AMMO_THRESHOLDS },

    // CCW / pistol permit tracking
    permits: [],
    editingPermitId: null,
    permitNotifyEnabled: false,
    permitLeadDays: 30
};
