'use strict';
import { state } from './state.js';
import {
    renderDashboard,
    renderGuns,
    renderAmmo,
    renderSessions,
    renderCleanings,
    renderImport,
    renderAbout
} from './renderers.js';
export function navigate(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    const mainContent = document.getElementById('main-content');
    const pageRenderers = {
        dashboard: renderDashboard,
        guns: renderGuns,
        ammo: renderAmmo,
        sessions: renderSessions,
        cleanings: renderCleanings,
        import: renderImport,
        about: renderAbout
    };
    const renderer = pageRenderers[page];
    mainContent.innerHTML = renderer ? renderer() : '';
    attachImportEventListeners();
}
function attachImportEventListeners() {
    if (state.currentPage !== 'import') return;
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                window.app.importData(event.target.result);
            };
            reader.readAsText(file);
        }
    });
}