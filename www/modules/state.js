'use strict';
export const DEFAULT_AMMO_THRESHOLDS = {
    pistol: 250,
    rifle: 500,
    shotgun: 50,
    bb: 1000,
    airsoft: 1500
};
export const state = {
    guns: [],
    soldGuns: [],
    ammo: [],
    currentPage: 'dashboard',
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
    permits: [],
    editingPermitId: null,
    permitNotifyEnabled: false,
    permitLeadDays: 30
};