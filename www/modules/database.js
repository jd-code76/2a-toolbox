'use strict';
import { state, DEFAULT_AMMO_THRESHOLDS } from './state.js';
import { updateBadges } from './utils.js';
export const db = {
    dbName: 'GunTrackerDB',
    version: 1,
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('IndexedDB blocked'));
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains('data')) {
                    database.createObjectStore('data', { keyPath: 'key' });
                }
            };
        });
    },
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
        let mirrored = true;
        try {
            localStorage.setItem('2a-toolbox_data', JSON.stringify(data));
        } catch (_) {
            mirrored = false;
        }
        updateBadges(state.guns.length, state.ammo.length);
        if (idbError && !mirrored) throw idbError;
    },
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
                        if (!this.applyRecord(request.result)) {
                            this.loadFromLocalStorage();
                        }
                    }
                    resolve();
                };
                request.onerror = () => resolve();
            }), 1500);
        } catch (e) {
        }
        if (!settled) {
            settle();
            this.loadFromLocalStorage();
        }
    },
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
        }
    },
    loadFromLocalStorage() {
        let data = null;
        try {
            data = localStorage.getItem('2a-toolbox_data');
        } catch (_) {
            return;
        }
        if (!data) return;
        let parsed = null;
        try {
            parsed = JSON.parse(data);
        } catch (_) {
            return;
        }
        if (!parsed || typeof parsed !== 'object') return;
        this.applyRecord(parsed);
    }
};