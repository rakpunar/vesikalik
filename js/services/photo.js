import { Config } from '../core/config.js';
import { EventBus } from '../core/events.js';
import { Storage } from '../core/storage.js';

export class PhotoService {
    static async add(photoData) {
        try {
            const photo = await Storage.add(photoData);
            EventBus.emit('photo:added', photo);
            return photo;
        } catch (error) {
            EventBus.emit('error', {
                type: 'photo',
                message: 'Fotoğraf eklenemedi',
                error
            });
            throw error;
        }
    }

    static async getAll() {
        try {
            return await Storage.getAll();
        } catch (error) {
            EventBus.emit('error', {
                type: 'photo',
                message: 'Fotoğraflar yüklenemedi',
                error
            });
            throw error;
        }
    }

    static async update(id, updates) {
        try {
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                throw new Error('Invalid ID format');
            }

            const currentPhoto = await Storage.get(numericId);
            const updatedPhoto = await Storage.update(numericId, {
                ...updates,
                originalDataUrl: currentPhoto.originalDataUrl,
                originalBrightness: currentPhoto.originalBrightness
            });

            EventBus.emit('photo:updated', updatedPhoto);
            return updatedPhoto;
        } catch (error) {
            console.error('Photo update failed:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                throw new Error('Invalid ID format');
            }

            await Storage.delete(numericId);
            EventBus.emit('photo:deleted', id);
        } catch (error) {
            console.error('Photo deletion failed:', error);
            throw error;
        }
    }

    static async deleteAll() {
        try {
            await Storage.deleteAll();
            EventBus.emit('photo:cleared');
        } catch (error) {
            EventBus.emit('error', {
                type: 'photo',
                message: 'Fotoğraflar silinemedi',
                error
            });
            throw error;
        }
    }

    static async downloadAll() {
        try {
            const photos = await this.getAll();
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            if (photos.length === 1) {
                this.#downloadSingle(photos[0]);
            } else {
                await this.#downloadZip(photos);
            }
        } catch (error) {
            EventBus.emit('error', {
                type: 'photo',
                message: 'Fotoğraflar indirilemedi',
                error
            });
            throw error;
        }
    }

    static async shareAll() {
        try {
            const photos = await this.getAll();
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            await this.#shareAsZip(photos);
        } catch (error) {
            EventBus.emit('error', {
                type: 'photo',
                message: 'Fotoğraflar paylaşılamadı',
                error
            });
            throw error;
        }
    }

    static async #downloadSingle(photo) {
        try {
            const link = document.createElement('a');
            link.href = photo.dataUrl;
            link.download = `${photo.name}.jpg`;
            link.click();
        } catch (error) {
            throw error;
        }
    }

    static async #downloadZip(photos) {
        const zip = new JSZip();

        photos.forEach(photo => {
            const imageData = photo.dataUrl.split(',')[1];
            zip.file(`${photo.name}.jpg`, imageData, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'vesikalik_fotograflar.zip';
        link.click();
    }

    static async get(id) {
        try {
            return await Storage.get(id);
        } catch (error) {
            console.error('Failed to get photo:', error);
            throw error;
        }
    }
    static async downloadMultiple(photos) {
        try {
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            if (photos.length === 1) {
                return this.#downloadSingle(photos[0]); // private metod olduğu için # eklendi
            }

            const zip = new JSZip();
            photos.forEach(photo => {
                const imageData = photo.dataUrl.split(',')[1];
                zip.file(`${photo.name}.jpg`, imageData, { base64: true });
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'vesikalik_fotograflar.zip';
            link.click();
            URL.revokeObjectURL(link.href); // Memory leak'i önlemek için URL'i temizle
        } catch (error) {
            throw error;
        }
    }

    static async shareMultiple(photos) {
        try {
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS_SELECTED');
            }

            await this.#shareAsZip(photos);
        } catch (error) {
            throw error;
        }
    }

    static async #shareAsZip(photos) {
        if (!navigator.share) {
            throw new Error('SHARE_NOT_SUPPORTED');
        }

        // ZIP dosyasını oluştur
        const zip = new JSZip();

        // Fotoğrafları ZIP'e ekle
        photos.forEach(photo => {
            const imageData = photo.dataUrl.split(',')[1];
            zip.file(`${photo.name}.jpg`, imageData, { base64: true });
        });

        // ZIP'i blob formatına dönüştür
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Paylaşılabilir dosya oluştur
        const zipFile = new File([zipBlob], 'vesikalik_fotograflar.zip', {
            type: 'application/zip',
            lastModified: new Date().getTime()
        });

        // Web Share API ile paylaş
        try {
            await navigator.share({
                files: [zipFile],
                title: 'Vesikalık Fotoğraflar',
                text: photos.length > 1
                    ? `${photos.length} adet vesikalık fotoğraf paylaşıyorum`
                    : 'Vesikalık fotoğraf paylaşıyorum'
            });
        } finally {
            // Belleği temizle
            URL.revokeObjectURL(zipBlob);
        }
    }
} 
