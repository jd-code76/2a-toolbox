'use strict';
import { state } from './state.js';
import { db } from './database.js';
import { toast } from './utils.js';
import { navigate } from './navigation.js';
export function saveAmmoThresholds() {
    const pistolStocked = Number(document.getElementById('threshold-pistol-stocked').value) || 500;
    const pistolLow = Number(document.getElementById('threshold-pistol-low').value) || 100;
    const rifleStocked = Number(document.getElementById('threshold-rifle-stocked').value) || 500;
    const rifleLow = Number(document.getElementById('threshold-rifle-low').value) || 100;
    const shotgunStocked = Number(document.getElementById('threshold-shotgun-stocked').value) || 250;
    const shotgunLow = Number(document.getElementById('threshold-shotgun-low').value) || 50;
    if (pistolStocked < pistolLow) {
        toast('Pistol: Stocked threshold must be >= Low threshold', 'error');
        return;
    }
    if (rifleStocked < rifleLow) {
        toast('Rifle: Stocked threshold must be >= Low threshold', 'error');
        return;
    }
    if (shotgunStocked < shotgunLow) {
        toast('Shotgun: Stocked threshold must be >= Low threshold', 'error');
        return;
    }
    state.ammoThresholds = {
        pistol: { stocked: pistolStocked, low: pistolLow },
        rifle: { stocked: rifleStocked, low: rifleLow },
        shotgun: { stocked: shotgunStocked, low: shotgunLow }
    };
    db.save();
    toast('Ammo thresholds saved', 'success');
}
export function resetAmmoThresholds() {
    state.ammoThresholds = {
        pistol: { stocked: 500, low: 100 },
        rifle: { stocked: 500, low: 100 },
        shotgun: { stocked: 250, low: 50 }
    };
    db.save();
    toast('Thresholds reset to defaults', 'info');
    navigate('settings'); 
}
export function getAmmoStatus(caliber, rounds) {
    if (rounds === 0) return 'empty';
    const cal = caliber.toLowerCase();
    let thresholds;
    if (cal.includes('gauge') || cal.includes('ga')) {
        thresholds = state.ammoThresholds.shotgun;
    } else if (cal.includes('.22') || cal.includes('.177') || cal.includes('6mm')) {
        thresholds = state.ammoThresholds.pistol; 
    } else if (cal.includes('.308') || cal.includes('.223') || cal.includes('5.56') || 
               cal.includes('.30') || cal.includes('7.62') || cal.includes('.300')) {
        thresholds = state.ammoThresholds.rifle;
    } else {
        thresholds = state.ammoThresholds.pistol; 
    }
    if (rounds >= thresholds.stocked) return 'stocked';
    if (rounds < thresholds.low) return 'low';
    return 'stocked'; 
}