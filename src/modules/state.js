'use strict';

/**
 * Global application state module
 * Manages all data and UI state for the application
 */
export const state = {
    guns: [],                      // Array of active firearms
    ammo: [],                      // Array of ammunition entries
    soldGuns: [],                  // Array of sold firearms
    currentPage: 'dashboard',      // Current navigation page
    editingGunId: null,            // ID of gun being edited (null if adding new)
    editingAmmoId: null,           // ID of ammo being edited (null if adding new)
    editingSessionGunId: null,     // ID of gun for session being edited
    editingSessionIndex: null,     // Index of session being edited
    editingSessionType: null,      // Type of session being edited ('range' or 'cleaning')
    selectedAmmoForDeduction: null,// ID of ammo selected for round deduction
    hideSold: false                // Whether to hide sold guns in the firearms view
};
