
'use strict';

import { state, DEFAULT_AMMO_THRESHOLDS } from './state.js';

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

            // Some privacy modes never deliver success or error; without this
            // the whole boot sequence would wait on a request that never ends.
            request.onblocked = () => reject(new Error('IndexedDB blocked'));

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
     * Save current state to IndexedDB (and mirror to localStorage)
     * @returns {Promise} Resolves when save is complete
     */
    async save() {
        const data = {
            key: '2a-toolbox_data',
            guns: state.guns,
            ammo: state.ammo,
            soldGuns: state.soldGuns,
            hideSold: state.hideSold,
            lastPage: state.lastPage,
            gunFilter: state.gunFilter,
            ammoCategory: state.ammoCategory,
            ammoFilter: state.ammoFilter,
            sessionFilter: state.sessionFilter,
            cleaningFilter: state.cleaningFilter,
            ammoThresholds: state.ammoThresholds,
            permits: state.permits,
            permitNotifyEnabled: state.permitNotifyEnabled,
            permitLeadDays: state.permitLeadDays
        };

        let idbError = null;

        try {
            if (!this.db) await this.init();

            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['data'], 'readwrite');
                const store = transaction.objectStore('data');
                const request = store.put(data);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            idbError = error;
        }

        // Mirror to localStorage so the fallback read path is never stale. This
        // also keeps data alive in private windows and other contexts where
        // IndexedDB is blocked, discarded, or over quota.
        let mirrored = true;
        try {
            localStorage.setItem('2a-toolbox_data', JSON.stringify(data));
        } catch (_) {
            mirrored = false;
        }

        if (idbError && !mirrored) throw idbError;
    },

    /**
     * Load state from IndexedDB, fallback to localStorage if unavailable
     * @returns {Promise} Resolves when load is complete
     */
    /**
     * Apply a stored record to the in-memory state
     * @param {Object|null} record - Record read from IndexedDB or localStorage
     * @returns {boolean} True when the record was usable
     */
    applyRecord(record) {
        if (!record || typeof record !== 'object') return false;

        state.guns = record.guns || [];
        state.ammo = record.ammo || [];
        state.soldGuns = record.soldGuns || [];
        state.hideSold = record.hideSold || false;
        state.lastPage = typeof record.lastPage === 'string'
            ? record.lastPage
            : 'dashboard';
        state.gunFilter = typeof record.gunFilter === 'string' ? record.gunFilter : 'all';
        state.ammoCategory = typeof record.ammoCategory === 'string' ? record.ammoCategory : 'all';
        state.ammoFilter = typeof record.ammoFilter === 'string' ? record.ammoFilter : 'all';
        state.sessionFilter = typeof record.sessionFilter === 'string' ? record.sessionFilter : 'all';
        state.cleaningFilter = typeof record.cleaningFilter === 'string' ? record.cleaningFilter : 'all';
        state.ammoThresholds = record.ammoThresholds || { ...DEFAULT_AMMO_THRESHOLDS };
        state.permits = record.permits || [];
        state.permitNotifyEnabled = record.permitNotifyEnabled === true;
        state.permitLeadDays = Number.isFinite(Number(record.permitLeadDays))
            ? Number(record.permitLeadDays)
            : 30;
        return true;
    },

    /**
     * Reject if a storage promise takes longer than the given grace period so a
     * hung IndexedDB request can never strand the app before its first render.
     * @param {Promise} promise
     * @param {number} ms
     * @returns {Promise}
     */
    withTimeout(promise, ms) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Storage timed out')), ms);
            Promise.resolve(promise).then(
                value => {
                    clearTimeout(timer);
                    resolve(value);
                },
                error => {
                    clearTimeout(timer);
                    reject(error);
                }
            );
        });
    },

    /**
     * Load state from IndexedDB, fallback to localStorage if unavailable
     * @returns {Promise} Resolves when load is complete
     */
    async load() {
        let settled = false;

        const settle = () => {
            settled = true;
        };

        try {
            if (!this.db) await this.withTimeout(this.init(), 1500);

            await this.withTimeout(new Promise((resolve) => {
                const transaction = this.db.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');
                const request = store.get('2a-toolbox_data');

                request.onsuccess = () => {
                    if (!settled) {
                        settle();
                        // A record that cannot be read leaves the mirror in charge
                        if (!this.applyRecord(request.result)) {
                            this.loadFromLocalStorage();
                        }
                    }
                    resolve();
                };

                request.onerror = () => resolve();
            }), 1500);
        } catch (e) {
            // IndexedDB blocked, hung, or unavailable
        }

        if (!settled) {
            settle();
            this.loadFromLocalStorage();
        }
    },

    /**
     * Record the current page in the localStorage mirror immediately, without
     * waiting for a full IndexedDB save. A refresh right after a navigation
     * then still has a fallback page even if the async save never lands.
     * @param {string} page - Page identifier
     */
    rememberPage(page) {
        if (typeof localStorage === 'undefined' || typeof page !== 'string') return;

        try {
            const raw = localStorage.getItem('2a-toolbox_data');
            const record = raw ? JSON.parse(raw) : null;
            const next = record && typeof record === 'object' ? record : {};
            next.key = '2a-toolbox_data';
            next.lastPage = page;
            localStorage.setItem('2a-toolbox_data', JSON.stringify(next));
        } catch (_) {
            // Private mode or a corrupt mirror: the URL hash still covers reloads
        }
    },

    /**
     * Load state from localStorage (fallback method)
     */
    loadFromLocalStorage() {
        let data = null;
        try {
            data = localStorage.getItem('2a-toolbox_data');
        } catch (_) {
            // localStorage blocked (privacy mode): nothing to restore
            return;
        }
        if (!data) return;

        let parsed = null;
        try {
            parsed = JSON.parse(data);
        } catch (_) {
            // Corrupt entry: keep the in-memory defaults rather than crashing boot
            return;
        }
        if (!parsed || typeof parsed !== 'object') return;

        this.applyRecord(parsed);
    }
};
