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

    static async get(id) {
        try {
            return await Storage.get(id);
        } catch (error) {
            console.error('Failed to get photo:', error);
            throw error;
        }
    }

    // İndirme işlemleri
    static async downloadAll() {
        try {
            const photos = await this.getAll();
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            if (photos.length === 1) {
                await this.#downloadSingle(photos[0]);
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
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        photos.forEach((photo, index) => {
            const imageData = photo.dataUrl.split(',')[1];
            const fileName = photo.name ? `${photo.name}.jpg` : `vesikalik_${index + 1}.jpg`;
            zip.file(fileName, imageData, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `vesikalik_fotograflar_${timestamp}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    static async downloadMultiple(photos) {
        try {
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            if (photos.length === 1) {
                return this.#downloadSingle(photos[0]);
            }

            await this.#downloadZip(photos);
        } catch (error) {
            throw error;
        }
    }

    // Paylaşım işlemleri
    static async shareAll() {
        try {
            const photos = await this.getAll();
            if (photos.length === 0) {
                throw new Error('NO_PHOTOS');
            }

            await this.shareMultiple(photos);
        } catch (error) {
            if (error.name !== 'AbortError') {
                EventBus.emit('error', {
                    type: 'photo',
                    message: 'Fotoğraflar paylaşılamadı',
                    error
                });
            }
            throw error;
        }
    }

    static async shareMultiple(photos) {
        try {
            if (!navigator.share || !navigator.canShare) {
                throw new Error('SHARE_NOT_SUPPORTED');
            }

            if (photos.length === 0) {
                throw new Error('NO_PHOTOS_SELECTED');
            }

            // Tek fotoğraf paylaşımı için özel durum
            if (photos.length === 1) {
                const photo = photos[0];
                const photoBlob = await fetch(photo.dataUrl).then(r => r.blob());
                const photoFile = new File([photoBlob], `${photo.name}.jpg`, {
                    type: 'image/jpeg'
                });

                if (!navigator.canShare({ files: [photoFile] })) {
                    throw new Error('SHARE_NOT_SUPPORTED');
                }

                await navigator.share({
                    files: [photoFile],
                    title: 'Vesikalık Fotoğraf',
                    text: photo.name
                });

                return;
            }

            // Birden fazla fotoğraf için ZIP oluştur
            const zip = new JSZip();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            photos.forEach((photo, index) => {
                const imageData = photo.dataUrl.split(',')[1];
                const fileName = photo.name ? `${photo.name}.jpg` : `vesikalik_${index + 1}.jpg`;
                zip.file(fileName, imageData, { base64: true });
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFile = new File([zipBlob], `vesikalik_fotograflar_${timestamp}.zip`, {
                type: 'application/zip'
            });

            if (!navigator.canShare({ files: [zipFile] })) {
                throw new Error('SHARE_NOT_SUPPORTED');
            }

            try {
                await navigator.share({
                    files: [zipFile],
                    title: 'Vesikalık Fotoğraflar',
                    text: `${photos.length} adet vesikalık fotoğraf`
                });
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                throw error;
            } finally {
                // Belleği temizle
                URL.revokeObjectURL(URL.createObjectURL(zipBlob));
            }
        } catch (error) {
            console.error('Share error:', error);
            throw error;
        }
    }
}
