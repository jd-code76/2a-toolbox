'use strict';

import { state } from './state.js';

/**
 * Database module for persistent storage using IndexedDB with localStorage fallback
 */
export const db = {
    dbName: 'GunTrackerDB',
    version: 1,
    db: null,

    /**
     * Initialize IndexedDB connection
     * @returns {Promise} Resolves when database is ready
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            // Create object store on first run or version upgrade
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains('data')) {
                    database.createObjectStore('data', { keyPath: 'key' });
                }
            };
        });
    },

    /**
     * Save current state to IndexedDB
     * @returns {Promise} Resolves when save is complete
     */
    async save() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');

            const data = {
                key: '2a-toolbox_data',
                guns: state.guns,
                ammo: state.ammo,
                soldGuns: state.soldGuns,
                hideSold: state.hideSold
            };

            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Load state from IndexedDB, fallback to localStorage if unavailable
     * @returns {Promise} Resolves when load is complete
     */
    async load() {
        try {
            if (!this.db) await this.init();

            return new Promise((resolve) => {
                const transaction = this.db.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');
                const request = store.get('2a-toolbox_data');

                request.onsuccess = () => {
                    if (request.result) {
                        // Load from IndexedDB
                        state.guns = request.result.guns || [];
                        state.ammo = request.result.ammo || [];
                        state.soldGuns = request.result.soldGuns || [];
                        state.hideSold = request.result.hideSold || false;
                    } else {
                        // Fallback to localStorage
                        this.loadFromLocalStorage();
                    }
                    resolve();
                };

                request.onerror = () => {
                    // Fallback to localStorage on error
                    this.loadFromLocalStorage();
                    resolve();
                };
            });
        } catch (e) {
            // Fallback to localStorage if IndexedDB is unavailable
            this.loadFromLocalStorage();
        }
    },

    /**
     * Load state from localStorage (fallback method)
     */
    loadFromLocalStorage() {
        const data = localStorage.getItem('2a-toolbox_data');
        if (data) {
            const parsed = JSON.parse(data);
            state.guns = parsed.guns || [];
            state.ammo = parsed.ammo || [];
            state.soldGuns = parsed.soldGuns || [];
            state.hideSold = parsed.hideSold || false;
        }
    }
};
