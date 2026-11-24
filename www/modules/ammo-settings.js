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
export const AMMO_CATEGORIES = [
    ['pistol', 'Pistol'],
    ['rifle', 'Rifle'],
    ['shotgun', 'Shotgun'],
    ['bb', 'BB'],
    ['airsoft', 'Airsoft']
];
export function getAmmoCategory(caliber = '') {
    const cal = String(caliber).toLowerCase();
    if (cal.includes('.177') || cal.includes('bb')) return 'bb';
    if (cal.includes('6mm') || cal.includes('airsoft')) return 'airsoft';
    if (/gauge|\bga\b|\bga\./.test(cal)) return 'shotgun';
    if (
        cal.includes('.22') || cal.includes('.223') || cal.includes('5.56') ||
        cal.includes('.308') || cal.includes('.30') || cal.includes('7.62') ||
        cal.includes('.300') || cal.includes('6.5') || cal.includes('.277') ||
        cal.includes('.243') || cal.includes('.260') ||
        cal.includes('blackout') || cal.includes('.300') || cal.startsWith('300')
    ) {
        return 'rifle';
    }
    return 'pistol';
}
export function getAmmoStatus(caliber, rounds) {
    if (rounds === 0) return 'empty';
    const category = getAmmoCategory(caliber);
    const threshold = state.ammoThresholds[category] ?? state.ammoThresholds.pistol;
    return rounds < threshold ? 'low' : 'stocked';
}