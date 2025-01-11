// LocalStorage işlemleri için yardımcı sınıf
export class Storage {
    constructor() {
        this.STORAGE_KEY = 'photos';
        this.MAX_PHOTOS = 25; // Maximum fotoğraf sayısı
    }

    getPhotos() {
        const photos = localStorage.getItem(this.STORAGE_KEY);
        return photos ? JSON.parse(photos) : [];
    }

    isNameExists(name) {
        const photos = this.getPhotos();
        const normalizedName = name.trim().toLowerCase();
        return photos.some(photo => photo.name.toLowerCase() === normalizedName);
    }

    generateAutoName() {
        const now = new Date();
        const date = now.toLocaleDateString('tr-TR').replace(/\./g, '');
        const time = now.toLocaleTimeString('tr-TR').replace(/:/g, '');
        return `Photo_${date}_${time}`;
    }

    addPhoto(photoData, name = '') {
        const photos = this.getPhotos();

        if (photos.length >= this.MAX_PHOTOS) {
            throw new Error('Maksimum fotoğraf sayısına ulaşıldı');
        }

        // İsim boş ise otomatik isim oluştur
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

        photos.push(photo);

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(photos));
            return photo;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                throw new Error('Depolama alanı dolu. Lütfen bazı fotoğrafları siliniz.');
            }
            throw error;
        }
    }

    updatePhoto(id, updates) {
        const photos = this.getPhotos();
        const index = photos.findIndex(p => p.id === id);

        if (index !== -1) {
            photos[index] = { ...photos[index], ...updates };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(photos));
            return photos[index];
        }
        return null;
    }

    deletePhoto(id) {
        const photos = this.getPhotos().filter(p => p.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(photos));
    }

    deleteAllPhotos() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}