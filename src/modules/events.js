'use strict';

import { state } from './state.js';
import { db } from './database.js';
import { closeModal } from './utils.js';
import { navigate } from './navigation.js';
import {
    showGunDetail,
    openEditGun,
    confirmDeleteGun,
    deleteGun,
    markGunAsSold,
    returnGunToInventory,
    applyGunFilter
} from './guns.js';
import {
    openLogSession,
    saveSession,
    openEditSession,
    confirmDeleteSession,
    deleteSession
} from './sessions.js';
import {
    showAmmoDetail,
    updateAmmoRounds,
    openEditAmmo,
    confirmDeleteAmmo,
    deleteAmmo,
    applyAmmoFilter
} from './ammo.js';

/**
 * Initialize all event listeners
 */
export function initializeEventListeners() {
    // Global click event handler using event delegation
    document.addEventListener('click', handleGlobalClick);

    // Search input handler
    document.addEventListener('input', handleSearchInput);

    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', handleModalOverlayClick);
    });

    // Mobile overlay click to close sidebar
    document.addEventListener('click', handleMobileOverlayClick);

    // Close mobile menu when nav item is clicked on mobile
    document.addEventListener('click', handleNavItemClick);

    // Import file handling
    initializeImportHandlers();
}

/**
 * Initialize import file handlers (drop zone and file input)
 */
function initializeImportHandlers() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone && fileInput) {
        // Click drop zone to open file picker
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag over effect
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        // Drag leave effect
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        // Drop file handler
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                window.app.confirmImport(); // Show confirmation instead of auto-import
            }
        });

        // File input change handler
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                window.app.confirmImport(); // Show confirmation instead of auto-import
            }
        });
    }
}

/**
 * Global click event handler using event delegation
 * Handles all button clicks, navigation, and interactions
 */
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

    // Handle modal close buttons
    if (modal) {
        closeModal(modal);
    }
    // Handle navigation
    else if (page) {
        navigate(page);
    }
    // Handle gun card clicks
    else if (target.classList.contains('gun-card')) {
        showGunDetail(gunId);
    }
    // Handle ammo card clicks
    else if (target.classList.contains('ammo-card')) {
        showAmmoDetail(ammoId);
    }
    // Handle session item clicks (navigate to gun detail)
    else if (target.classList.contains('session-item') && gunId) {
        showGunDetail(gunId);
    }
    // Handle all data-action buttons
    else if (action) {
        handleActionClick(target, action, gunId, ammoId);
    }
    // Handle filter chips
    else if (target.classList.contains('filter-chip')) {
        handleFilterClick(target);
    }
}

/**
 * Handle action button clicks
 */
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
    }
}

/**
 * Handle filter chip clicks
 */
function handleFilterClick(target) {
    const parent = target.parentElement;
    const filter = target.getAttribute('data-filter');

    if (parent.id === 'gun-filter-bar' && filter === 'hide-sold') {
        // Toggle hide sold filter
        target.classList.toggle('active');
        state.hideSold = target.classList.contains('active');
        db.save();

        // Reapply current filter
        const activeTypeChip = parent.querySelector('.filter-chip.active:not([data-filter="hide-sold"])');
        const typeFilter = activeTypeChip ? activeTypeChip.getAttribute('data-filter') : 'all';
        applyGunFilter(typeFilter, (document.getElementById('gun-search')?.value || '').toLowerCase());

    } else if (parent.id === 'gun-filter-bar') {
        // Gun type filter
        parent.querySelectorAll('.filter-chip:not([data-filter="hide-sold"])').forEach(chip => {
            chip.classList.remove('active');
        });
        target.classList.add('active');
        applyGunFilter(filter, (document.getElementById('gun-search')?.value || '').toLowerCase());

    } else if (parent.id === 'ammo-filter-bar') {
        // Ammo filter
        parent.querySelectorAll('.filter-chip').forEach(chip => {
            chip.classList.remove('active');
        });
        target.classList.add('active');
        applyAmmoFilter(filter, (document.getElementById('ammo-search')?.value || '').toLowerCase());
    }
}

/**
 * Handle search input changes
 */
function handleSearchInput(e) {
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

/**
 * Handle clicks on modal overlay (close modal)
 */
function handleModalOverlayClick(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
}

/**
 * Handle mobile overlay click to close sidebar
 */
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

/**
 * Handle nav item click on mobile (close sidebar)
 */
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
