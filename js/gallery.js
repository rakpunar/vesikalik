import { Storage } from './storage.js';
import { Dialog } from './dialog.js';
import { Toast } from './toast.js';

export class Gallery {
    constructor() {
        this.storage = new Storage();
        this.container = document.getElementById('gallery-grid');
        this.photoCount = document.getElementById('photo-count');
        this.dialog = new Dialog();
        this.toast = new Toast();

        // PWA için paylaşım özelliklerini kontrol et
        this.checkSharingCapabilities();
        this.setupEventListeners();
    }

    async checkSharingCapabilities() {
        this.canShare = 'share' in navigator;
        this.canShareFiles = 'canShare' in navigator;
        console.log('Paylaşım özellikleri:', {
            canShare: this.canShare,
            canShareFiles: this.canShareFiles,
            userAgent: navigator.userAgent
        });
    }

    setupEventListeners() {
        const shareBtn = document.getElementById('share-btn');
        const downloadBtn = document.getElementById('download-btn');
        const deleteAllBtn = document.getElementById('delete-all-btn');

        shareBtn.addEventListener('click', () => this.sharePhotos());
        downloadBtn.addEventListener('click', () => this.downloadPhotos());
        deleteAllBtn.addEventListener('click', () => this.deleteAllPhotos());

        // PWA için dokunma geri bildirimi
        if ('vibrate' in navigator) {
            [shareBtn, downloadBtn, deleteAllBtn].forEach(btn => {
                btn.addEventListener('touchstart', () => navigator.vibrate(1));
            });
        }
    }

    async render() {
        try {
            const photos = await this.storage.getPhotos();
            const maxPhotos = this.storage.MAX_PHOTOS;

            // Fotoğraf sayısını güncelle
            this.photoCount.textContent = `${photos.length}/${maxPhotos}`;

            // Galeriyi render et
            this.container.innerHTML = photos.map(photo => this.createPhotoElement(photo)).join('');

            // Fotoğraf tıklama olaylarını ekle
            this.container.querySelectorAll('.photo-item').forEach(item => {
                item.addEventListener('click', () => this.showPhotoActions(item.dataset.id));
            });
        } catch (error) {
            console.error('Galeri render hatası:', error);
            this.toast.show('Fotoğraflar yüklenirken hata oluştu', 'error');
        }
    }

    createPhotoElement(photo) {
        return `
            <div class="photo-item" data-id="${photo.id}">
                <img src="${photo.data}" alt="${photo.name}" loading="lazy">
                <div class="photo-info">
                    <span>${photo.name}</span>
                </div>
            </div>
        `;
    }

    async showPhotoActions(photoId) {
        const actions = ['Paylaş', 'İndir', 'Sil', 'İptal'];
        const result = await this.dialog.select('Fotoğraf İşlemleri', actions);

        switch (result) {
            case 'Paylaş':
                await this.sharePhoto(photoId);
                break;
            case 'İndir':
                await this.downloadPhoto(photoId);
                break;
            case 'Sil':
                await this.deletePhoto(photoId);
                break;
        }
    }

    async sharePhotos() {
        try {
            const photos = await this.storage.getPhotos();
            if (photos.length === 0) {
                this.toast.show('Paylaşılacak fotoğraf yok', 'error');
                return;
            }

            // ZIP dosyası oluştur
            const zip = new JSZip();
            photos.forEach(photo => {
                const photoData = this.dataURLtoBlob(photo.data);
                zip.file(`${photo.name}.jpg`, photoData);
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });

            // PWA paylaşım kontrolü
            if (this.canShareFiles && navigator.canShare({ files: [zipBlob] })) {
                const file = new File([zipBlob], 'vesikalik_fotograflar.zip', { type: 'application/zip' });
                await navigator.share({
                    files: [file],
                    title: 'Vesikalık Fotoğraflar',
                    text: 'Vesikalık uygulamasından paylaşılan fotoğraflar'
                });
                this.toast.show('Fotoğraflar paylaşıldı', 'success');
            } else {
                // Paylaşım desteklenmiyorsa indir
                this.downloadZip(zipBlob);
            }
        } catch (error) {
            console.error('Paylaşım hatası:', error);
            this.toast.show('Paylaşım başarısız oldu', 'error');
        }
    }

    // Diğer metodlar aynı kalacak...

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}
