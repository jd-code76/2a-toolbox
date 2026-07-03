'use strict';
import { DEFAULT_AMMO_THRESHOLDS, state } from './state.js';
import { db } from './database.js';
import { toast } from './utils.js';
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
export function getAmmoStatus(caliber, rounds) {
    if (rounds === 0) return 'empty';
    const cal = caliber.toLowerCase();
    let threshold;
    if (cal.includes('.177')) {
        threshold = state.ammoThresholds.bb;
    } else if (cal.includes('6mm')) {
        threshold = state.ammoThresholds.airsoft;
    } else if (cal.includes('gauge') || cal.includes('ga')) {
        threshold = state.ammoThresholds.shotgun;
    } else if (cal.includes('.22') || cal.includes('.223') || cal.includes('5.56') || 
               cal.includes('.308') || cal.includes('.30') || cal.includes('7.62') || 
               cal.includes('.300') || cal.includes('6.5') || cal.includes('.277') || 
               cal.includes('.243')) {
        threshold = state.ammoThresholds.rifle;
    } else {
        threshold = state.ammoThresholds.pistol;
    }
    return rounds < threshold ? 'low' : 'stocked';
}