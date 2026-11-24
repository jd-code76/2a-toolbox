'use strict';
import { DEFAULT_AMMO_THRESHOLDS, state } from './state.js';
import { db } from './database.js';
import { getAmmoCategory, toast } from './utils.js';
export { getAmmoCategory };
import { navigate } from './navigation.js';
export function saveAmmoThresholds() {
    const pistol = Number(document.getElementById('threshold-pistol').value) || DEFAULT_AMMO_THRESHOLDS.pistol;
    const rifle = Number(document.getElementById('threshold-rifle').value) || DEFAULT_AMMO_THRESHOLDS.rifle;
    const shotgun = Number(document.getElementById('threshold-shotgun').value) || DEFAULT_AMMO_THRESHOLDS.shotgun;
    const bb = Number(document.getElementById('threshold-bb').value) || DEFAULT_AMMO_THRESHOLDS.bb;
    const airsoft = Number(document.getElementById('threshold-airsoft').value) || DEFAULT_AMMO_THRESHOLDS.airsoft;
    state.ammoThresholds = {
        pistol,
        rifle,
        shotgun,
        bb,
        airsoft
    };
    db.save();
    toast('Ammo thresholds saved', 'success');
}
export function resetAmmoThresholds() {
    state.ammoThresholds = { ...DEFAULT_AMMO_THRESHOLDS };
    db.save();
    toast('Thresholds reset to defaults', 'info');
    navigate('settings');
}
export const AMMO_CATEGORIES = [
    ['pistol', 'Pistol'],
    ['rifle', 'Rifle'],
    ['shotgun', 'Shotgun'],
    ['bb', 'BB'],
    ['airsoft', 'Airsoft']
];
export function getAmmoStatus(caliber, rounds) {
    if (rounds === 0) return 'empty';
    const category = getAmmoCategory(caliber);
    const threshold = state.ammoThresholds[category] ?? state.ammoThresholds.pistol;
    return rounds < threshold ? 'low' : 'stocked';
}