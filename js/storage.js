// LocalStorage işlemleri için yardımcı sınıf
export class Storage {
    constructor() {
        this.dbName = 'VesikalikApp';
        this.dbVersion = 1;
        this.photoStore = 'photos';
        this.MAX_PHOTOS = 25;
        this.initDB();
    }

    // IndexedDB başlatma
    async initDB() {
        try {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB açılırken hata:', event.target.error);
                this.fallbackToLocalStorage = true;
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.photoStore)) {
                    const store = db.createObjectStore(this.photoStore, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.migrateFromLocalStorage();
            };
        } catch (error) {
            console.error('IndexedDB init hatası:', error);
            this.fallbackToLocalStorage = true;
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

    // Güncellenmiş getPhotos metodu
    async getPhotos() {
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
        if (!this.db) {
            throw new Error('Veritabanı henüz hazır değil');
        }

        const photos = await this.getPhotos();
        if (photos.length >= this.MAX_PHOTOS) {
            throw new Error('Maksimum fotoğraf sayısına ulaşıldı');
        }

        const photoName = name.trim() || this.generateAutoName();
        const photo = {
            id: Date.now().toString(),
            name: photoName,
            data: photoData,
            timestamp: Date.now(),
            edits: {
                brightness: 100,
            }
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.photoStore, 'readwrite');
            const store = transaction.objectStore(this.photoStore);
            const request = store.add(photo);

            request.onsuccess = () => resolve(photo);
            request.onerror = () => reject(request.error);
        });
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
}
