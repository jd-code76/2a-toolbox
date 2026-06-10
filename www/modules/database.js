'use strict';
import { state } from './state.js';
export const db = {
    dbName: 'GunTrackerDB',
    version: 1,
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
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
    async load() {
        try {
            if (!this.db) await this.init();
            return new Promise((resolve) => {
                const transaction = this.db.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');
                const request = store.get('2a-toolbox_data');
                request.onsuccess = () => {
                    if (request.result) {
                        state.guns = request.result.guns || [];
                        state.ammo = request.result.ammo || [];
                        state.soldGuns = request.result.soldGuns || [];
                        state.hideSold = request.result.hideSold || false;
                    } else {
                        this.loadFromLocalStorage();
                    }
                    resolve();
                };
                request.onerror = () => {
                    this.loadFromLocalStorage();
                    resolve();
                };
            });
        } catch (e) {
            this.loadFromLocalStorage();
        }
    },
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