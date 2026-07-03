'use strict';
import { state } from './state.js';
import { db } from './database.js';
import { closeModal } from './utils.js';
import { navigate } from './navigation.js';
import {
    applyGunFilter,
    confirmDeleteGun,
    deleteGun,
    markGunAsSold,
    openEditGun,
    returnGunToInventory,
    showGunDetail
} from './guns.js';
import {
    confirmDeleteSession,
    deleteSession,
    openLogSession,
    openEditSession,
    saveSession
} from './sessions.js';
import {
    applyAmmoFilter,
    confirmDeleteAmmo,
    deleteAmmo,
    openEditAmmo,
    showAmmoDetail,
    updateAmmoRounds
} from './ammo.js';
export function initializeEventListeners() {
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('input', handleSearchInput);
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', handleModalOverlayClick);
    });
    document.addEventListener('click', handleMobileOverlayClick);
    document.addEventListener('click', handleNavItemClick);
    initializeImportHandlers();
}
function initializeImportHandlers() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                window.app.confirmImport(); 
            }
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                window.app.confirmImport(); 
            }
        });
    }
}
function handleGlobalClick(e) {
    const target = e.target.closest(
        '[data-action], [data-modal], [data-page], [data-gun-id], [data-ammo-id], .filter-chip, .gun-card, .ammo-card, .session-item'
    );
    if (!target) return;
    const action = target.getAttribute('data-action');
    const modal = target.getAttribute('data-modal');
    const page = target.getAttribute('data-page');
    const gunId = target.getAttribute('data-gun-id');
    const ammoId = target.getAttribute('data-ammo-id');
    if (modal) {
        closeModal(modal);
    }
    else if (page) {
        navigate(page);
    }
    else if (target.classList.contains('gun-card')) {
        showGunDetail(gunId);
    }
    else if (target.classList.contains('ammo-card')) {
        showAmmoDetail(ammoId);
    }
    else if (target.classList.contains('session-item') && gunId) {
        showGunDetail(gunId);
    }
    else if (action) {
        handleActionClick(target, action, gunId, ammoId);
    }
    else if (target.classList.contains('filter-chip')) {
        handleFilterClick(target);
    }
}
function handleActionClick(target, action, gunId, ammoId) {
    const sessionType = target.getAttribute('data-session-type');
    const sessionIndex = Number(target.getAttribute('data-session-index'));
    switch (action) {
        case 'log-range':
            openLogSession(gunId, 'range');
            break;
        case 'log-cleaning':
            openLogSession(gunId, 'cleaning');
            break;
        case 'save-session':
            saveSession(gunId, sessionType);
            break;
        case 'edit-gun':
            openEditGun(gunId);
            break;
        case 'delete-gun':
            confirmDeleteGun(gunId);
            break;
        case 'confirm-delete-gun':
            deleteGun(gunId);
            break;
        case 'mark-sold':
            markGunAsSold(gunId);
            break;
        case 'return-inventory':
            returnGunToInventory(gunId);
            break;
        case 'edit-session':
            openEditSession(gunId, sessionType, sessionIndex);
            break;
        case 'delete-session':
            confirmDeleteSession(gunId, sessionType, sessionIndex);
            break;
        case 'confirm-delete-session':
            deleteSession(gunId, sessionType, sessionIndex);
            break;
        case 'update-ammo-rounds':
            updateAmmoRounds(ammoId);
            break;
        case 'edit-ammo':
            openEditAmmo(ammoId);
            break;
        case 'delete-ammo':
            confirmDeleteAmmo(ammoId);
            break;
        case 'confirm-delete-ammo':
            deleteAmmo(ammoId);
            break;
        case 'filter-guns-by-type':
            {
                const gunType = target.getAttribute('data-gun-type');
                if (gunType) {
                    navigate('guns');
                    setTimeout(() => {
                        const filterChip = document.querySelector(`#gun-filter-bar [data-filter="${gunType}"]`);
                        if (filterChip) {
                            document.querySelectorAll('#gun-filter-bar .filter-chip:not([data-filter="hide-sold"])').forEach(chip => {
                                chip.classList.remove('active');
                            });
                            filterChip.classList.add('active');
                            const searchQuery = (document.getElementById('gun-search')?.value || '').toLowerCase();
                            applyGunFilter(gunType, searchQuery);
                        }
                    }, 50);
                }
            }
            break;
        case 'filter-ammo-by-caliber':
            {
                const caliber = target.getAttribute('data-caliber');
                if (caliber) {
                    navigate('ammo');
                    setTimeout(() => {
                        const filterChip = Array.from(document.querySelectorAll('#ammo-filter-bar .filter-chip'))
                            .find(chip => chip.getAttribute('data-filter') === caliber);
                        if (filterChip) {
                            document.querySelectorAll('#ammo-filter-bar .filter-chip').forEach(chip => {
                                chip.classList.remove('active');
                            });
                            filterChip.classList.add('active');
                            const searchQuery = (document.getElementById('ammo-search')?.value || '').toLowerCase();
                            applyAmmoFilter(caliber, searchQuery);
                        }
                    }, 50);
                }
            }
            break;
        case 'navigate-to-sessions':
            navigate('sessions');
            break;
        case 'view-most-fired':
            if (gunId) {
                showGunDetail(gunId);
            }
            break;
        case 'navigate-to-page':
            {
                const page = target.getAttribute('data-page');
                if (page) {
                    navigate(page);
                }
            }
            break;
        case 'clear-search':
            {
                const searchId = target.closest('[data-search-id]')?.getAttribute('data-search-id');
                const searchInput = document.getElementById(searchId);
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    const wrapper = searchInput.closest('.search-wrapper');
                    if (wrapper) {
                        wrapper.classList.remove('has-value');
                    }
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            break;
    }
}
function handleFilterClick(target) {
    const parent = target.parentElement;
    const filter = target.getAttribute('data-filter');
    if (parent.id === 'gun-filter-bar' && filter === 'hide-sold') {
        target.classList.toggle('active');
        state.hideSold = target.classList.contains('active');
        db.save();
        const activeTypeChip = parent.querySelector('.filter-chip.active:not([data-filter="hide-sold"])');
        const typeFilter = activeTypeChip ? activeTypeChip.getAttribute('data-filter') : 'all';
        applyGunFilter(typeFilter, (document.getElementById('gun-search')?.value || '').toLowerCase());
    } else if (parent.id === 'gun-filter-bar') {
        parent.querySelectorAll('.filter-chip:not([data-filter="hide-sold"])').forEach(chip => {
            chip.classList.remove('active');
        });
        target.classList.add('active');
        applyGunFilter(filter, (document.getElementById('gun-search')?.value || '').toLowerCase());
    } else if (parent.id === 'ammo-filter-bar') {
        parent.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        target.classList.add('active');
        applyAmmoFilter(filter, (document.getElementById('ammo-search')?.value || '').toLowerCase());
    }
}
function handleSearchInput(e) {
    const wrapper = e.target.closest('.search-wrapper');
    if (wrapper) {
        if (e.target.value.length > 0) {
            wrapper.classList.add('has-value');
        } else {
            wrapper.classList.remove('has-value');
        }
    }
    if (e.target.id === 'gun-search') {
        const query = e.target.value.toLowerCase();
        const activeFilter = document.querySelector('#gun-filter-bar .filter-chip.active:not([data-filter="hide-sold"])');
        const filter = activeFilter ? (activeFilter.getAttribute('data-filter') || 'all') : 'all';
        applyGunFilter(filter, query);
    } else if (e.target.id === 'ammo-search') {
        const query = e.target.value.toLowerCase();
        const activeFilter = document.querySelector('#ammo-filter-bar .filter-chip.active');
        const filter = activeFilter ? (activeFilter.getAttribute('data-filter') || 'all') : 'all';
        applyAmmoFilter(filter, query);
    }
}
function handleModalOverlayClick(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
}
function handleMobileOverlayClick(e) {
    if (e.target.id === 'mobile-overlay') {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
}
function handleNavItemClick(e) {
    if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
}