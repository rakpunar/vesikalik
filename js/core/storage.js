import { Config } from './config.js';
import { EventBus } from './events.js';

export class Storage {
    static #db = null;

    static async init() {
        try {
            this.#db = await this.#openDatabase();
            EventBus.emit('storage:ready');
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Depolama başlatılamadı',
                error
            });
            throw error;
        }
    }

    static async #openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(
                Config.STORAGE.DB_NAME,
                Config.STORAGE.VERSION
            );

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(Config.STORAGE.STORE_NAME)) {
                    db.createObjectStore(Config.STORAGE.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
            };
        });
    }

    static async add(photo) {
        try {
            const count = await this.count();
            if (count >= Config.STORAGE.MAX_PHOTOS) {
                throw new Error('STORAGE_LIMIT_EXCEEDED');
            }

            const store = this.#getStore('readwrite');
            const photoData = {
                ...photo,
                originalDataUrl: photo.dataUrl,
                originalBrightness: photo.brightness || 100,
                createdAt: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                const request = store.add(photoData);
                request.onsuccess = () => {
                    photoData.id = request.result;
                    resolve(photoData);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraf eklenemedi',
                error
            });
            throw error;
        }
    }

    static async getAll() {
        try {
            const store = this.#getStore('readonly');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    // Fotoğrafları tarihe göre sırala (yeniden eskiye)
                    const photos = request.result.sort((a, b) =>
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    resolve(photos);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraflar yüklenemedi',
                error
            });
            throw error;
        }
    }

    static async update(id, updates) {
        try {
            // ID'yi sayıya çevir
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                throw new Error('Invalid ID format');
            }

            // Önce fotoğrafı al
            const store = this.#getStore('readwrite');

            return new Promise((resolve, reject) => {
                const getRequest = store.get(numericId);

                getRequest.onsuccess = () => {
                    const photo = getRequest.result;
                    if (!photo) {
                        reject(new Error('PHOTO_NOT_FOUND'));
                        return;
                    }

                    const updatedPhoto = {
                        ...photo,
                        ...updates,
                        id: numericId,
                        updatedAt: new Date().toISOString()
                    };

                    const putRequest = store.put(updatedPhoto);
                    putRequest.onsuccess = () => resolve(updatedPhoto);
                    putRequest.onerror = () => reject(putRequest.error);
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraf güncellenemedi',
                error
            });
            throw error;
        }
    }

    static async delete(id) {
        try {
            const store = this.#getStore('readwrite');
            // ID'yi sayıya çevir
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                throw new Error('Invalid ID format');
            }

            return new Promise((resolve, reject) => {
                const request = store.delete(numericId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraf silinemedi',
                error
            });
            throw error;
        }
    }

    static async deleteAll() {
        try {
            const store = this.#getStore('readwrite');
            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraflar silinemedi',
                error
            });
            throw error;
        }
    }

    static async count() {
        try {
            const store = this.#getStore('readonly');
            return new Promise((resolve, reject) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraf sayısı alınamadı',
                error
            });
            throw error;
        }
    }

    static async get(id) {
        try {
            const store = this.#getStore('readonly');
            return new Promise((resolve, reject) => {
                // ID'yi sayıya çevir
                const numericId = parseInt(id);
                if (isNaN(numericId)) {
                    reject(new Error('Invalid ID format'));
                    return;
                }

                const request = store.get(numericId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            EventBus.emit('error', {
                type: 'storage',
                message: 'Fotoğraf bulunamadı',
                error
            });
            throw error;
        }
    }

    static #getStore(mode = 'readonly') {
        if (!this.#db) {
            throw new Error('Database is not initialized');
        }
        const tx = this.#db.transaction(Config.STORAGE.STORE_NAME, mode);
        return tx.objectStore(Config.STORAGE.STORE_NAME);
    }

    static isInitialized() {
        return !!this.#db;
    }

    static async test() {
        try {
            if (!this.isInitialized()) {
                await this.init();
            }
            const testData = { test: true };
            await this.add(testData);
            const photos = await this.getAll();
            const testPhoto = photos.find(p => p.test === true);
            if (testPhoto) {
                await this.delete(testPhoto.id);
            }
            return true;
        } catch (error) {
            console.error('Storage test failed:', error);
            return false;
        }
    }

    // Transaction yardımcı metodu
    static async #withTransaction(mode, callback) {
        const tx = this.#db.transaction(Config.STORAGE.STORE_NAME, mode);
        const store = tx.objectStore(Config.STORAGE.STORE_NAME);

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            callback(store);
        });
    }
} 
