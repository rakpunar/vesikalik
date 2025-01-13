// LocalStorage işlemleri için yardımcı sınıf
export class Storage {
    constructor() {
        this.dbName = 'VesikalikApp';
        this.dbVersion = 2;
        this.photoStore = 'photos';
        this.zipStore = 'zips';
        this.MAX_PHOTOS = 25;
        this.dbReady = false;

        // IndexedDB başlat
        this.initDB();

        // PWA için storage durumunu kontrol et
        this.checkStorageQuota();
    }

    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const { usage, quota } = await navigator.storage.estimate();
                const usedPercentage = (usage / quota) * 100;
                console.log('Depolama durumu:', {
                    used: this.formatBytes(usage),
                    total: this.formatBytes(quota),
                    percentage: usedPercentage.toFixed(2) + '%'
                });

                // Depolama alanı az kaldıysa uyar
                if (usedPercentage > 80) {
                    console.warn('Depolama alanı %80\'in üzerinde kullanılıyor');
                }

                // Depolama izni iste
                if ('persist' in navigator && !await navigator.storage.persist()) {
                    console.warn('Kalıcı depolama izni alınamadı');
                }
            } catch (error) {
                console.error('Depolama durumu kontrol edilemedi:', error);
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async initDB() {
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB açılırken hata:', event.target.error);
                this.fallbackToLocalStorage = true;
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Photos store
                if (!db.objectStoreNames.contains(this.photoStore)) {
                    const store = db.createObjectStore(this.photoStore, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                }

                // Zips store - PWA için geçici ZIP depolama
                if (!db.objectStoreNames.contains(this.zipStore)) {
                    db.createObjectStore(this.zipStore, { keyPath: 'id' });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                this.dbReady = true;

                // PWA için periyodik temizlik
                await this.cleanupOldData();
            };
        } catch (error) {
            console.error('IndexedDB init hatası:', error);
            this.fallbackToLocalStorage = true;
        }
    }

    async cleanupOldData() {
        try {
            // 24 saatten eski ZIP dosyalarını temizle
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const transaction = this.db.transaction(this.zipStore, 'readwrite');
            const store = transaction.objectStore(this.zipStore);
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.timestamp < oneDayAgo) {
                        store.delete(cursor.key);
                    }
                    cursor.continue();
                }
            };
        } catch (error) {
            console.error('Temizlik işlemi başarısız:', error);
        }
    }

    // LocalStorage'dan veri taşıma
    async migrateFromLocalStorage() {
        const oldPhotos = localStorage.getItem('photos');
        if (oldPhotos) {
            try {
                const photos = JSON.parse(oldPhotos);
                for (const photo of photos) {
                    await this.addPhoto(photo.data, photo.name, photo.timestamp);
                }
                localStorage.removeItem('photos');
            } catch (error) {
                console.error('Veri taşıma hatası:', error);
            }
        }
    }

    // Veritabanının hazır olmasını bekleyen yardımcı metod
    async waitForDB() {
        if (this.dbReady) return;

        return new Promise((resolve) => {
            const check = () => {
                if (this.dbReady) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    // Güncellenmiş getPhotos metodu
    async getPhotos() {
        await this.waitForDB();
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readonly');
            const store = transaction.objectStore(this.photoStore);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Yeni Blob işleme metodları
    async getPhotoBlob(id) {
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readonly');
            const store = transaction.objectStore(this.photoStore);
            const request = store.get(id);

            request.onsuccess = () => {
                const photo = request.result;
                if (!photo) {
                    reject(new Error('Fotoğraf bulunamadı'));
                    return;
                }
                fetch(photo.data)
                    .then(res => res.blob())
                    .then(resolve)
                    .catch(reject);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPhotosAsBlobs() {
        const photos = await this.getPhotos();
        return Promise.all(photos.map(async photo => ({
            blob: await fetch(photo.data).then(r => r.blob()),
            name: photo.name
        })));
    }

    async isNameExists(name) {
        const photos = await this.getPhotos();
        const normalizedName = name.trim().toLowerCase();
        return photos.some(photo => photo.name.toLowerCase() === normalizedName);
    }

    generateAutoName() {
        const now = new Date();
        const date = now.toLocaleDateString('tr-TR').replace(/\./g, '');
        const time = now.toLocaleTimeString('tr-TR').replace(/:/g, '');
        return `Photo_${date}_${time}`;
    }

    async addPhoto(photoData, name = '') {
        await this.waitForDB();

        const photos = await this.getPhotos();
        if (photos.length >= this.MAX_PHOTOS) {
            throw new Error('Maksimum fotoğraf sayısına ulaşıldı');
        }

        const photo = {
            id: Date.now().toString(),
            name: name || this.generateAutoName(),
            data: photoData,
            timestamp: Date.now()
        };

        const transaction = this.db.transaction(this.photoStore, 'readwrite');
        const store = transaction.objectStore(this.photoStore);
        await store.add(photo);

        return photo;
    }

    async updatePhoto(id, updates) {
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readwrite');
            const store = transaction.objectStore(this.photoStore);
            const request = store.get(id);

            request.onsuccess = () => {
                const photo = { ...request.result, ...updates };
                const updateRequest = store.put(photo);
                updateRequest.onsuccess = () => resolve(photo);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deletePhoto(id) {
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readwrite');
            const store = transaction.objectStore(this.photoStore);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAllPhotos() {
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readwrite');
            const store = transaction.objectStore(this.photoStore);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ZIP dosyasını kaydet
    async saveZip(zipBlob) {
        await this.waitForDB();
        const id = 'temp_zip_' + Date.now();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.zipStore, 'readwrite');
            const store = transaction.objectStore(this.zipStore);

            const request = store.put({
                id: id,
                data: zipBlob,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    // ZIP dosyasını getir
    async getZip(id) {
        await this.waitForDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.zipStore, 'readonly');
            const store = transaction.objectStore(this.zipStore);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result?.data);
            request.onerror = () => reject(request.error);
        });
    }

    // ZIP dosyasını sil
    async deleteZip(id) {
        await this.waitForDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.zipStore, 'readwrite');
            const store = transaction.objectStore(this.zipStore);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
