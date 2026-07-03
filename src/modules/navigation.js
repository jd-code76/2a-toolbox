/*=====================================================================
  2A Toolbox – navigation.js
  App navigation and basic page content
=====================================================================*/

'use strict';

import { state } from './state.js';
import {
    renderAbout,
    renderAmmo,
    renderAmmoThresholds,
    renderCleanings,
    renderDashboard,
    renderGuns,
    renderImport,
    renderSessions
} from './renderers.js';

/**
 * Navigate to a different page/view
 * @param {string} page - Page identifier (dashboard, guns, ammo, etc.)
 */
export function navigate(page) {
    state.currentPage = page;

    // Update active nav item styling
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Render page content
    const mainContent = document.getElementById('main-content');
    const pageRenderers = {
        dashboard: renderDashboard,
        guns: renderGuns,
        ammo: renderAmmo,
        sessions: renderSessions,
        cleanings: renderCleanings,
        import: renderImport,
        settings: renderAmmoThresholds,
        about: renderAbout
    };

    const renderer = pageRenderers[page];
    mainContent.innerHTML = renderer ? renderer() : '';

    // Attach event listeners for import page (drag & drop)
    attachImportEventListeners();

    // Scroll to top when navigating to new page
    const mainElement = document.querySelector('.main');
    if (mainElement) {
        mainElement.scrollTop = 0;
    }
}

/**
 * Attach event listeners for file import functionality
 * Must be called after import page is rendered
 */
function attachImportEventListeners() {
    if (state.currentPage !== 'import') return;

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag over effect
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    // Remove drag over effect
    dropZone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });

    // Handle file drop
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Access importData through global app object
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    // Handle file selection via input
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Access importData through global app object
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
}
