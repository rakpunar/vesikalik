import { Storage } from './storage.js';
import { Dialog } from './dialog.js';
import { Toast } from './toast.js';

export class Gallery {
    constructor() {
        this.storage = new Storage();
        this.container = document.getElementById('gallery-grid');
        this.modal = document.getElementById('edit-modal');
        this.currentPhotoId = null;
        this.dialog = new Dialog();
        this.toast = new Toast();
        this.setupModalListeners();
        this.cropper = null;

        // Galeri butonlarına event listener'ları ekle
        document.getElementById('share-btn').addEventListener('click', () => this.shareAll());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadAll());
        document.getElementById('delete-all-btn').addEventListener('click', () => this.deleteAll());
    }

    async render() {
        const photos = await this.storage.getPhotos();
        const maxPhotos = this.storage.MAX_PHOTOS;

        // Fotoğrafları timestamp'e göre eskiden yeniye sırala
        const sortedPhotos = photos.sort((a, b) => a.timestamp - b.timestamp);

        // Galeriyi render et
        const galleryHTML = sortedPhotos.map(photo => this.createPhotoElement(photo)).join('');
        this.container.innerHTML = galleryHTML;

        // Fotoğraf sayısını güncelle
        const photoCount = photos.length;
        document.getElementById('photo-count').textContent = `${photoCount}/${maxPhotos}`;
        document.getElementById('photo-count-title').textContent = `${photoCount}/${maxPhotos}`;

        // Fotoğraf tıklama olaylarını ekle
        this.container.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => this.openEditModal(item.dataset.id));
        });
    }

    createPhotoElement(photo) {
        return `
            <div class="photo-item relative aspect-square cursor-pointer" data-id="${photo.id}">
                <img src="${photo.data}" 
                     alt="${photo.name}"
                     class="w-full h-full object-cover rounded-lg"
                     style="filter: brightness(${photo.edits.brightness}%)">
                <div class="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white 
                            rounded-b-lg truncate">
                    ${photo.name}
                </div>
            </div>
        `;
    }

    setupModalListeners() {
        const modal = document.getElementById('edit-modal');
        const closeBtn = document.getElementById('close-modal');
        const saveBtn = document.getElementById('save-edits');
        const deleteBtn = document.getElementById('delete-photo');
        const renameBtn = document.getElementById('rename-photo');
        const brightnessSlider = document.getElementById('brightness');

        closeBtn.addEventListener('click', () => this.closeEditModal());
        saveBtn.addEventListener('click', () => this.saveEdits());
        deleteBtn.addEventListener('click', () => this.deleteCurrentPhoto());
        renameBtn.addEventListener('click', () => this.renameCurrentPhoto());

        // Anlık önizleme için slider olayları
        brightnessSlider.addEventListener('input', () => {
            this.updatePreview();
        });
    }

    openEditModal(photoId) {
        const photos = this.storage.getPhotos();
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        this.currentPhotoId = photoId;
        this.originalPhoto = photo;
        this.tempChanges = {}; // Temiz başlangıç

        // Modal'ı görünür yap
        this.modal.classList.remove('hidden');

        const editImage = document.getElementById('edit-image');

        // Önceki cropper varsa temizle
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // Görüntüyü yükle
        editImage.src = photo.data;

        // Parlaklık değerini ayarla
        const brightnessSlider = document.getElementById('brightness');
        const savedBrightness = photo.edits?.brightness || 100;
        brightnessSlider.value = savedBrightness;

        // Görüntü yüklendiğinde cropper'ı başlat
        editImage.onload = () => {
            // Parlaklığı uygula
            editImage.style.filter = `brightness(${savedBrightness}%)`;

            this.initializeCropper(editImage);
            this.setupEditControls();
        };
    }

    // Cropper başlatma işlemini ayrı bir metoda aldım
    initializeCropper(image) {
        this.cropper = new Cropper(image, {
            viewMode: 2,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: true,
            ready: () => {
                this.updatePreview();
            }
        });
    }

    setupEditControls() {
        // Döndürme butonları
        document.getElementById('rotate-left').onclick = () => {
            if (this.cropper) {
                this.cropper.rotate(-90);
                this.updatePreview(); // Döndürme sonrası parlaklığı güncelle
            }
        };

        document.getElementById('rotate-right').onclick = () => {
            if (this.cropper) {
                this.cropper.rotate(90);
                this.updatePreview(); // Döndürme sonrası parlaklığı güncelle
            }
        };

        // Kırpma butonları
        document.getElementById('crop-apply').onclick = () => {
            if (!this.cropper) return;

            const canvas = this.cropper.getCroppedCanvas();
            if (canvas) {
                const croppedImage = canvas.toDataURL('image/jpeg', 0.95);
                const editImage = document.getElementById('edit-image');
                const currentBrightness = document.getElementById('brightness').value;

                // Mevcut cropper'ı temizle
                this.cropper.destroy();
                this.cropper = null;

                // Yeni görüntüyü göster
                editImage.src = croppedImage;

                // Görüntü yüklendiğinde yeni cropper oluştur
                editImage.onload = () => {
                    editImage.style.filter = `brightness(${currentBrightness}%)`;
                    this.initializeCropper(editImage);
                };

                // Geçici değişiklikleri sakla
                this.tempChanges = {
                    ...this.tempChanges,
                    croppedImage: croppedImage
                };

                this.toast.show('Kırpma uygulandı', 'success');
            }
        };

        // Sıfırlama butonu
        document.getElementById('crop-reset').onclick = () => {
            if (!this.originalPhoto) return;

            const editImage = document.getElementById('edit-image');
            const originalBrightness = this.originalPhoto.edits?.brightness || 100;

            // Cropper'ı temizle
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }

            // Orijinal görüntüyü geri yükle
            editImage.src = this.originalPhoto.data;

            // Parlaklığı orijinal değerine sıfırla
            const brightnessSlider = document.getElementById('brightness');
            brightnessSlider.value = originalBrightness;

            // Görüntü yüklendiğinde yeni cropper oluştur
            editImage.onload = () => {
                editImage.style.filter = `brightness(${originalBrightness}%)`;
                this.initializeCropper(editImage);
            };

            // Geçici değişiklikleri temizle
            this.tempChanges = {};

            this.toast.show('Değişiklikler sıfırlandı', 'success');
        };

        // Kaydet butonu
        document.getElementById('save-edits').onclick = () => {
            this.saveEdits();
        };
    }

    closeEditModal() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        this.currentPhotoId = null;
        this.originalPhoto = null;
        this.tempChanges = {};

        const editImage = document.getElementById('edit-image');
        editImage.removeAttribute('src');
        editImage.style.filter = '';

        this.modal.classList.add('hidden');
    }

    updatePreview() {
        const editImage = document.getElementById('edit-image');
        const brightness = document.getElementById('brightness').value;

        // Ana görüntüye parlaklık uygula
        editImage.style.filter = `brightness(${brightness}%)`;

        // Cropper canvas'ına parlaklık uygula
        if (this.cropper) {
            const cropperCanvas = document.querySelector('.cropper-view-box');
            const cropperImage = document.querySelector('.cropper-canvas');
            const cropperContainer = document.querySelector('.cropper-container');

            if (cropperCanvas) cropperCanvas.style.filter = `brightness(${brightness}%)`;
            if (cropperImage) cropperImage.style.filter = `brightness(${brightness}%)`;
            if (cropperContainer) cropperContainer.style.filter = `brightness(${brightness}%)`;
        }
    }

    async saveEdits() {
        if (!this.currentPhotoId || !this.cropper) return;

        try {
            const canvas = this.cropper.getCroppedCanvas();
            if (!canvas) {
                throw new Error('Kırpma işlemi başarısız');
            }

            const updates = {
                data: canvas.toDataURL('image/jpeg', 0.95),
                edits: {
                    brightness: parseInt(document.getElementById('brightness').value)
                }
            };

            this.storage.updatePhoto(this.currentPhotoId, updates);
            this.render();
            this.closeEditModal();
            this.toast.show('Değişiklikler kaydedildi', 'success');
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            this.toast.show('Değişiklikler kaydedilemedi', 'error');
        }
    }

    async deleteCurrentPhoto() {
        if (!this.currentPhotoId) return;

        const confirmed = await this.dialog.confirm('Bu fotoğrafı silmek istediğinize emin misiniz?', 'Fotoğraf Sil');
        if (confirmed) {
            await this.storage.deletePhoto(this.currentPhotoId);
            await this.render();
            this.closeEditModal();
            this.toast.show('Fotoğraf silindi', 'success');
        }
    }

    async downloadAll() {
        const photos = this.storage.getPhotos();
        if (photos.length === 0) {
            this.toast.show('İndirilecek fotoğraf bulunamadı.', 'error');
            return;
        }

        try {
            if (photos.length === 1) {
                const link = document.createElement('a');
                link.href = photos[0].data;
                link.download = `${photos[0].name}.jpg`;
                link.click();
                this.toast.show('Fotoğraf indirme başladı.', 'success');
                return;
            }

            const zip = new JSZip();
            photos.forEach(photo => {
                const base64Data = photo.data.split(',')[1];
                zip.file(`${photo.name}.jpg`, base64Data, { base64: true });
            });

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = 'fotograflar.zip';
            link.click();
            this.toast.show('Fotoğraflar indirme başladı.', 'success');
        } catch (error) {
            console.error('İndirme hatası:', error);
            this.toast.show('Fotoğrafları indirirken bir hata oluştu.', 'error');
        }
    }

    async shareAll() {
        console.log('shareAll started');
        try {
            console.log('Web Share API support check:', {
                shareAvailable: !!navigator.share,
                canShareAvailable: !!navigator.canShare,
                userAgent: navigator.userAgent,
                platform: navigator.platform
            });

            const photosWithBlobs = await this.storage.getPhotosAsBlobs();

            if (photosWithBlobs.length === 0) {
                console.log('No photos to share');
                this.toast.show('Paylaşılacak fotoğraf bulunamadı.', 'error');
                return;
            }

            console.log(`Processing ${photosWithBlobs.length} photos for sharing`);

            // Her durumda ZIP oluştur
            const zip = new JSZip();

            for (const photo of photosWithBlobs) {
                console.log(`Adding photo to ZIP: ${photo.name}`);
                zip.file(`${photo.name}.jpg`, photo.blob);
            }

            console.log('Generating ZIP file...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });

            console.log('ZIP file details:', {
                size: zipBlob.size,
                type: zipBlob.type
            });

            const file = new File([zipBlob], 'vesikalik_fotograflar.zip', {
                type: 'application/zip',
                lastModified: Date.now()
            });

            console.log('File object created:', {
                name: file.name,
                size: file.size,
                type: file.type
            });

            const shareData = {
                files: [file],
                title: 'Vesikalık Fotoğraflar'
            };

            if (navigator.canShare && !navigator.canShare(shareData)) {
                console.log('Trying alternative share method');
                // ZIP paylaşılamıyorsa alternatif MIME type dene
                const altFile = new File([zipBlob], 'photos.zip', {
                    type: 'application/octet-stream'
                });

                if (navigator.canShare({ files: [altFile] })) {
                    console.log('Sharing with alternative MIME type');
                    await navigator.share({ files: [altFile] });
                    this.toast.show('Paylaşım başarılı', 'success');
                    return;
                }

                throw new Error('Bu içerik paylaşılamıyor');
            }

            console.log('Attempting to share...');
            await navigator.share(shareData);
            console.log('Share successful');
            this.toast.show('Paylaşım başarılı', 'success');

        } catch (error) {
            console.error('Share error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            let errorMessage = 'Paylaşım sırasında bir hata oluştu.';
            if (error.name === 'AbortError') {
                console.log('Share was aborted by user');
                return; // Kullanıcı iptal ettiyse mesaj gösterme
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Paylaşım için gerekli izinler reddedildi.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Paylaşım servisi bulunamadı.';
            }

            console.log('Displaying error to user:', errorMessage);
            await this.dialog.alert(errorMessage, 'Paylaşım Hatası');
        }
    }

    // Base64 formatındaki veriyi Blob'a çeviren yardımcı metod
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

    async deleteAll() {
        const confirmed = await this.dialog.confirm(
            'Tüm fotoğraflarınız kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
            'Tüm Fotoğrafları Sil'
        );

        if (confirmed) {
            this.storage.deleteAllPhotos();
            this.render();
            this.toast.show('Tüm fotoğraflar silindi', 'success');
        }
    }
    async editPhotoName(photoId) {
        const photos = this.storage.getPhotos();
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        const newName = await this.dialog.prompt(
            'Yeni fotoğraf adını girin:',
            photo.name,
            'Fotoğraf Adını Düzenle'
        );

        if (newName !== null && newName !== photo.name) {
            this.storage.updatePhoto(photoId, { name: newName });
            this.render();
            this.toast.show('Fotoğraf adı güncellendi', 'success');
        }
    }

    async renameCurrentPhoto() {
        if (!this.currentPhotoId) return;

        const photos = this.storage.getPhotos();
        const currentPhoto = photos.find(p => p.id === this.currentPhotoId);
        if (!currentPhoto) return;

        let newName = await this.dialog.prompt(
            'Yeni isim girin:',
            currentPhoto.name,
            'Fotoğrafı Yeniden Adlandır'
        );

        // İsim değişikliği yapılmak isteniyor ve yeni bir isim girildi
        while (newName !== null && newName.trim() !== currentPhoto.name && newName.trim() !== '') {
            // Aynı isimde başka bir fotoğraf var mı kontrol et
            if (this.storage.isNameExists(newName.trim())) {
                this.toast.show('Bu isimde bir fotoğraf zaten var!', 'error');
                newName = await this.dialog.prompt(
                    'Lütfen başka bir isim girin:',
                    newName,
                    'Fotoğrafı Yeniden Adlandır'
                );
            } else {
                // İsim benzersiz, değişikliği yap
                this.storage.updatePhoto(this.currentPhotoId, { name: newName.trim() });
                this.render();
                this.toast.show('Fotoğraf ismi güncellendi', 'success');
                break;
            }
        }
    }
}
