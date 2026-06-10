'use strict';
import { state } from './state.js';
import { escapeHtml, getTypeIcon, getUniqueCalibers, parseSessionDate } from './utils.js';
import { APP_VERSION } from '../main.js'; 
export function renderDashboard() {
    const totalShots = state.guns.reduce((sum, gun) => sum + gun.shots, 0);
    const totalCleanings = state.guns.reduce((sum, gun) => sum + gun.cleanings, 0);
    const totalRangeSessions = state.guns.reduce((sum, gun) => sum + gun.rangeSessions.length, 0);
    const totalAmmoRounds = state.ammo.reduce((sum, ammo) => sum + ammo.rounds, 0);
    const mostUsedGun = [...state.guns].sort((a, b) => b.shots - a.shots)[0];
    const caliberMap = {};
    state.ammo.forEach(ammo => {
        const caliber = ammo.caliber || 'Unknown';
        caliberMap[caliber] = (caliberMap[caliber] || 0) + ammo.rounds;
    });
    const caliberEntries = Object.entries(caliberMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); 
    const maxCaliberCount = caliberEntries[0]?.[1] || 1;
    const typeCount = {};
    state.guns.forEach(gun => {
        const type = gun.type || 'other';
        typeCount[type] = (typeCount[type] || 0) + 1;
    });
    const allSessions = [];
    state.guns.forEach(gun => {
        gun.rangeSessions.forEach(session => {
            allSessions.push({
                text: session.text,
                gun: gun.name,
                date: parseSessionDate(session.text)
            });
        });
    });
    const recentSessions = allSessions
    .sort((a, b) => b.date - a.date)
    .slice(0, 8);
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-chart-line"></i> Dashboard
    </div>
    <div class="topbar-actions">
    <button class="btn btn-primary btn-sm" onclick="window.app.openAddGun()">
    <i class="fas fa-plus"></i> Add Firearm
    </button>
    </div>
    </div>
    <div class="content">
    <!-- Statistics Cards -->
    <div class="grid-4" style="margin-bottom:22px">
    <div class="stat-card">
    <div class="stat-label">Total Firearms</div>
    <div class="stat-value stat-accent">${state.guns.length}</div>
    <div class="stat-sub">${state.soldGuns.length} sold</div>
    </div>
    <div class="stat-card">
    <div class="stat-label">Total Shots Fired</div>
    <div class="stat-value">${totalShots.toLocaleString()}</div>
    <div class="stat-sub">across all firearms</div>
    </div>
    <div class="stat-card">
    <div class="stat-label">Range Sessions</div>
    <div class="stat-value">${totalRangeSessions}</div>
    <div class="stat-sub">${totalCleanings} cleanings</div>
    </div>
    <div class="stat-card">
    <div class="stat-label">Ammo on Hand</div>
    <div class="stat-value stat-accent">${totalAmmoRounds.toLocaleString()}</div>
    <div class="stat-sub">${state.ammo.length} entries</div>
    </div>
    </div>
    <!-- Charts Section -->
    <div class="grid-2" style="margin-bottom:22px">
    <!-- Ammo Inventory Chart -->
    <div class="card">
    <div class="card-title">
    <i class="fas fa-chart-bar"></i> Ammo Inventory by Caliber
    </div>
    ${caliberEntries.length === 0
        ? '<div style="color:var(--text3);font-size:13px">No ammo data</div>'
        : caliberEntries.map(([caliber, count]) => `
        <div class="caliber-row">
        <div class="caliber-name">${caliber}</div>
        <div class="caliber-bar-wrap">
        <div class="caliber-bar" style="width:${Math.round(count / maxCaliberCount * 100)}%"></div>
        </div>
        <div class="caliber-count">${count}</div>
        </div>
        `).join('')
    }
    </div>
    <!-- Fleet Overview -->
    <div class="card">
    <div class="card-title">
    <i class="fas fa-layer-group"></i> Fleet Overview
    </div>
    ${Object.entries(typeCount).map(([type, count]) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">
        <span class="gun-type-badge type-${type.toLowerCase()}">
        ${getTypeIcon(type)}${type}
        </span>
        </div>
        <span style="font-size:20px;font-weight:700;color:var(--accent)">${count}</span>
        </div>
        `).join('')}
        ${mostUsedGun ? `
            <div style="margin-top:16px;padding:14px;background:var(--surface2);border-radius:var(--radius-sm)">
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;font-weight:600;letter-spacing:0.5px">
            MOST FIRED
            </div>
            <div style="font-weight:600;font-size:15px">${mostUsedGun.name}</div>
            <div style="font-size:13px;color:var(--accent);margin-top:2px">
            ${mostUsedGun.shots.toLocaleString()} shots
            </div>
            </div>
            ` : ''}
            </div>
            </div>
            <!-- Recent Sessions -->
            <div class="card">
            <div class="card-title">
            <i class="fas fa-history"></i> Recent Range Sessions
            </div>
            ${recentSessions.length === 0
                ? '<div style="color:var(--text3);font-size:13px">No sessions logged</div>'
                : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
                ${recentSessions.map(session => `
                    <div class="session-item">
                    <span class="session-dot"></span>
                    <div>
                    <div style="font-size:12px;color:var(--text)">${session.text}</div>
                    <div style="font-size:11px;color:var(--text3)">${session.gun}</div>
                    </div>
                    </div>
                    `).join('')}
                    </div>`
            }
            </div>
            </div>
            `;
}
export function renderGuns() {
    const allGuns = [...state.guns, ...state.soldGuns].sort((a, b) => a.name.localeCompare(b.name));
    const displayGuns = state.hideSold ? allGuns.filter(gun => !gun.sold) : allGuns;
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-gun"></i> Firearms
    <span class="badge" style="margin-left:10px">${state.guns.length}</span>
    </div>
    <div class="topbar-actions">
    <div class="search-wrapper">
    <i class="fas fa-search"></i>
    <input class="search-bar" id="gun-search" placeholder="Search firearms..." style="padding-left:38px">
    </div>
    <button class="btn btn-primary btn-sm" onclick="window.app.openAddGun()">
    <i class="fas fa-plus"></i> Add
    </button>
    </div>
    </div>
    <div class="content">
    <!-- Filter Bar -->
    <div class="filter-bar" id="gun-filter-bar">
    <span style="font-size:12px;color:var(--text3);font-weight:600">FILTER:</span>
    <div class="filter-chip active" data-filter="all">All (${allGuns.length})</div>
    <div class="filter-chip" data-filter="pistol">
    <i class="fas fa-gun"></i> Pistol
    </div>
    <div class="filter-chip" data-filter="rifle">
    <i class="fas fa-crosshairs"></i> Rifle
    </div>
    <div class="filter-chip" data-filter="shotgun">
    <i class="fas fa-bullseye"></i> Shotgun
    </div>
    <div class="filter-chip" data-filter="other">
    <i class="fas fa-question"></i> Other
    </div>
    <div class="filter-chip" data-filter="sold">
    Sold (${state.soldGuns.length})
    </div>
    <div class="filter-chip filter-toggle${state.hideSold ? ' active' : ''}" data-filter="hide-sold">
    <i class="fas fa-eye-slash"></i> Hide Sold
    </div>
    </div>
    <!-- Gun Grid -->
    <div class="gun-grid" id="gun-grid">
    ${displayGuns.map(renderGunCard).join('')}
    </div>
    </div>
    `;
}
export function renderGunCard(gun) {
    const typeClass = gun.sold ? 'type-sold' : `type-${(gun.type || 'other').toLowerCase()}`;
    const typeLabel = gun.sold ? 'SOLD' : gun.type || 'Other';
    const typeIcon = gun.sold ? '<i class="fas fa-ban"></i> ' : getTypeIcon(gun.type || '');
    return `
    <div class="gun-card" data-gun-id="${gun.id}">
    <div class="gun-card-header">
    <div>
    <div class="gun-card-name">${gun.name}</div>
    <div class="gun-card-meta">
    <i class="fas fa-circle"></i> ${gun.caliber}
    <i class="fas fa-barcode" style="margin-left:6px"></i> ${gun.serial || 'N/A'}
    </div>
    <div class="gun-card-meta" style="margin-top:2px">
    <i class="fas fa-palette"></i> ${gun.color || 'N/A'}
    </div>
    </div>
    <span class="gun-type-badge ${typeClass}">
    ${typeIcon}${typeLabel}
    </span>
    </div>
    <div class="gun-card-stats">
    <div class="gun-stat-item">
    <div class="gun-stat-val">${(gun.shots || 0).toLocaleString()}</div>
    <div class="gun-stat-lbl">Shots</div>
    </div>
    <div class="gun-stat-item">
    <div class="gun-stat-val">${gun.rangeSessions.length}</div>
    <div class="gun-stat-lbl">Sessions</div>
    </div>
    <div class="gun-stat-item">
    <div class="gun-stat-val">${gun.cleanings || 0}</div>
    <div class="gun-stat-lbl">Cleanings</div>
    </div>
    </div>
    </div>
    `;
}
export function renderAmmo() {
    const calibers = getUniqueCalibers(state.ammo);
    const filterChips = calibers.map(caliber =>
    `<div class="filter-chip" data-filter="${escapeHtml(caliber)}">${caliber}</div>`
    ).join('');
    const sortedAmmo = [...state.ammo].sort((a, b) => a.brand.localeCompare(b.brand));
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-circle"></i> Ammunition
    <span class="badge" style="margin-left:10px">${state.ammo.length}</span>
    </div>
    <div class="topbar-actions">
    <div class="search-wrapper">
    <i class="fas fa-search"></i>
    <input class="search-bar" id="ammo-search" placeholder="Search ammo..." style="padding-left:38px">
    </div>
    <button class="btn btn-primary btn-sm" onclick="window.app.openAddAmmo()">
    <i class="fas fa-plus"></i> Add
    </button>
    </div>
    </div>
    <div class="content">
    <!-- Filter Bar -->
    <div class="filter-bar" id="ammo-filter-bar">
    <span style="font-size:12px;color:var(--text3);font-weight:600">FILTER:</span>
    <div class="filter-chip active" data-filter="all">All</div>
    ${filterChips}
    <div class="filter-chip" data-filter="stocked">
    <i class="fas fa-check"></i> Stocked
    </div>
    <div class="filter-chip" data-filter="low">
    <i class="fas fa-exclamation"></i> Low
    </div>
    <div class="filter-chip" data-filter="empty">
    <i class="fas fa-times"></i> Empty
    </div>
    </div>
    <!-- Ammo Grid -->
    <div class="ammo-grid" id="ammo-grid">
    ${sortedAmmo.map(renderAmmoCard).join('')}
    </div>
    </div>
    `;
}
export function renderAmmoCard(ammo) {
    const rounds = Number(ammo.rounds) || 0;
    let statusPill;
    if (rounds === 0) {
        statusPill = '<span class="pill pill-red"><i class="fas fa-times"></i> Empty</span>';
    } else if (rounds < 100) {
        statusPill = '<span class="pill pill-orange"><i class="fas fa-exclamation"></i> Low</span>';
    } else {
        statusPill = '<span class="pill pill-green"><i class="fas fa-check"></i> Stocked</span>';
    }
    return `
    <div class="ammo-card" data-ammo-id="${ammo.id}">
    <div class="ammo-name">${ammo.brand}</div>
    <div class="ammo-cal">${ammo.caliber}</div>
    <div class="ammo-details">
    <div class="ammo-detail-row">
    <span>Type</span>
    <span>${ammo.type || 'N/A'}</span>
    </div>
    <div class="ammo-detail-row">
    <span>Subtype</span>
    <span>${ammo.subtype || 'N/A'}</span>
    </div>
    ${ammo.price ? `
        <div class="ammo-detail-row">
        <span>Price</span>
        <span>${ammo.price}</span>
        </div>
        ` : ''}
        </div>
        <div style="margin-top:12px;display:flex;align-items:flex-end;justify-content:space-between">
        <div>
        <div class="ammo-rounds">${rounds.toLocaleString()}</div>
        <div class="ammo-rounds-lbl">rounds on hand</div>
        </div>
        ${statusPill}
        </div>
        </div>
        `;
}
export function renderSessions() {
    const allSessions = [];
    state.guns.forEach(gun => {
        gun.rangeSessions.forEach(session => {
            allSessions.push({
                text: session.text,
                gun: gun.name,
                gunId: gun.id,
                type: gun.type,
                date: parseSessionDate(session.text)
            });
        });
    });
    allSessions.sort((a, b) => b.date - a.date);
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-calendar-alt"></i> Range Sessions
    </div>
    </div>
    <div class="content">
    <div class="card">
    ${allSessions.length === 0
        ? `<div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No range sessions logged</p>
        </div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
        ${allSessions.map(session => `
            <div class="session-item" data-gun-id="${session.gunId}" style="cursor:pointer">
            <span class="session-dot"></span>
            <div>
            <div style="font-size:13px;color:var(--text)">${session.text}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">
            ${session.gun} ·
            <span class="gun-type-badge type-${(session.type || 'other').toLowerCase()}"
            style="padding:2px 7px;font-size:9px">
            ${session.type || '?'}
            </span>
            </div>
            </div>
            </div>
            `).join('')}
            </div>`
    }
    </div>
    </div>
    `;
}
export function renderCleanings() {
    const allCleanings = [];
    state.guns.forEach(gun => {
        gun.cleaningSessions.forEach(session => {
            allCleanings.push({
                text: session.text,
                gun: gun.name,
                gunId: gun.id,
                date: parseSessionDate(session.text)
            });
        });
    });
    allCleanings.sort((a, b) => b.date - a.date);
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-spray-can"></i> Cleaning Log
    </div>
    </div>
    <div class="content">
    <div class="card">
    ${allCleanings.length === 0
        ? `<div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>No cleanings logged</p>
        </div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
        ${allCleanings.map(cleaning => `
            <div class="session-item" data-gun-id="${cleaning.gunId}" style="cursor:pointer">
            <span class="session-dot" style="background:var(--green)"></span>
            <div>
            <div style="font-size:13px;color:var(--text)">${cleaning.text}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${cleaning.gun}</div>
            </div>
            </div>
            `).join('')}
            </div>`
    }
    </div>
    </div>
    `;
}
export function renderImport() {
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-file-import"></i> Import / Export
    </div>
    </div>
    <div class="content">
    <div class="grid-2">
    <!-- Import Section -->
    <div class="card">
    <div class="card-title">
    <i class="fas fa-file-upload"></i> Import Data
    </div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:18px;line-height:1.6">
    Import a JSON backup file. Existing records with matching IDs will be replaced.
    </p>
    <!-- Drop Zone -->
    <div class="drop-zone" id="drop-zone">
    <i class="fas fa-cloud-upload-alt"></i>
    <p>Click or drag & drop JSON file</p>
    <small>2a-toolbox_backup_*.json</small>
    </div>
    <input type="file" id="file-input" accept=".json" style="display:none">
    </div>
    <!-- Export Section -->
    <div class="card">
    <div class="card-title">
    <i class="fas fa-file-download"></i> Export Data
    </div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:18px;line-height:1.6">
    Export all your data as a JSON backup file.
    </p>
    <button class="btn btn-primary" onclick="window.app.exportData()">
    <i class="fas fa-download"></i> Export Backup
    </button>
    <!-- Data Summary -->
    <div style="margin-top:26px">
    <div class="card-title">
    <i class="fas fa-database"></i> Current Data Summary
    </div>
    <div class="info-row">
    <span class="info-label">Firearms</span>
    <span class="info-value">${state.guns.length}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Sold Firearms</span>
    <span class="info-value">${state.soldGuns.length}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Ammo Entries</span>
    <span class="info-value">${state.ammo.length}</span>
    </div>
    <div class="info-row">
    <span class="info-label">Total Rounds</span>
    <span class="info-value">
    ${state.ammo.reduce((sum, ammo) => sum + Number(ammo.rounds), 0).toLocaleString()}
    </span>
    </div>
    </div>
    <!-- Danger Zone -->
    <div style="margin-top:26px">
    <div class="card-title" style="color:var(--red)">
    <i class="fas fa-exclamation-triangle"></i> Danger Zone
    </div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:12px;line-height:1.5">
    Clear all local data. This action cannot be undone.
    </p>
    <button class="btn btn-danger btn-sm" onclick="window.app.confirmClearAll()">
    <i class="fas fa-trash"></i> Clear All Data
    </button>
    </div>
    </div>
    </div>
    </div>
    `;
}
export function renderAbout() {
    return `
    <div class="topbar">
    <button class="mobile-menu-btn" onclick="window.app.toggleMobileMenu()">
    <i class="fas fa-bars"></i>
    </button>
    <div class="topbar-title">
    <i class="fas fa-info-circle"></i> About
    </div>
    </div>
    <div class="content">
    <div class="card" style="max-width:600px;margin:0 auto;">
    <div class="card-title">
    <i class="fas fa-crosshairs"></i> 2A Toolbox
    </div>
    <!-- Version Info -->
    <div style="margin-bottom:24px;">
    <div style="font-size:32px;font-weight:700;color:var(--accent);margin-bottom:8px;">
    Version ${APP_VERSION}
    </div>
    <div style="font-size:14px;color:var(--text2);line-height:1.6;">
    Arsenal Management System for tracking firearms, ammunition,
    range sessions, and maintenance records.
    </div>
    </div>
    <!-- Author Section -->
    <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px;">
    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
    Author
    </div>
    <div style="font-size:15px;color:var(--text);margin-bottom:16px;">
    Developed by <strong>Jordan DiPasquale using Gab AI</strong>
    </div>
    <a href="https://github.com/jd-code76/2a-toolbox"
    target="_blank"
    rel="noopener noreferrer"
    class="about-link"
    style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;">
    <i class="fab fa-github"></i> View on GitHub
    </a>
    </div>
    <!-- Features Section -->
    <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px;">
    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
    Features
    </div>
    <ul style="list-style:none;padding:0;margin:0;">
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Track firearms inventory and specifications
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Manage ammunition stockpile
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Log range sessions with round tracking
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Automatic ammo deduction from inventory
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Maintenance and cleaning logs
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Works completely offline
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Data persists in browser storage
    </li>
    <li style="padding:8px 0;font-size:13px;color:var(--text2);display:flex;align-items:center;gap:10px;">
    <i class="fas fa-check" style="color:var(--green)"></i>
    Import/Export backup functionality
    </li>
    </ul>
    </div>
    <!-- Technology Section -->
    <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px;">
    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
    Technology
    </div>
    <div style="font-size:13px;color:var(--text2);line-height:1.8;">
    Built with vanilla JavaScript, IndexedDB for persistent storage,
    Service Workers for offline functionality, and a responsive design
    optimized for desktop and mobile devices.
    </div>
    </div>
    <!-- Attributions Section -->
    <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px;">
    <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">
    Attributions
    </div>
    <div style="font-size:12px;color:var(--text3);line-height:1.6;">
    Inspired by <a href="https://github.com/DavidCabal/gun-tracker-downloads"
    target="_blank"
    rel="noopener noreferrer"
    class="about-link">David Cabal's GunTracker</a>.
    </div>
    <div style="font-size:12px;color:var(--text3);line-height:1.6;">
    Created using various AI models within <a href="https://gab.ai/app"
    target="_blank"
    rel="noopener noreferrer"
    class="about-link">Gab AI</a>.
    </div>
    <div style="font-size:12px;color:var(--text3);line-height:1.6;">
    Hosted using <a href="https://pages.cloudflare.com"
    target="_blank"
    rel="noopener noreferrer"
    class="about-link">Cloudflare Pages</a>.
    </div>
    </div>
    <!-- License -->
    <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:20px;text-align:center;font-size:12px;color:var(--text3);line-height:1.6;">
    2A Toolbox is free, open source software licensed under
    <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text"
    target="_blank"
    rel="noopener noreferrer"
    class="about-link">GPLv3</a>.
    </div>
    </div>
    </div>
    `;
}