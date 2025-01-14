import { EventBus } from '../core/events.js';
import { PhotoService } from '../services/photo.js';
import { Dialog } from './components/dialog.js';
import { Toast } from './components/toast.js';

export class GalleryView {
    #container = null;
    #selectedPhotos = new Set();
    #isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    #eventListenersAttached = false;

    // Event handler'ları
    #handlePhotoAdded = () => this.#loadPhotos();
    #handlePhotoDeleted = () => this.#loadPhotos();
    #handlePhotoUpdated = () => this.#loadPhotos();
    #handlePhotoCleared = () => this.#loadPhotos();

    #template = `
        <div class="gallery-container p-4">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 class="text-2xl font-bold">Galeri</h2>
                    <p class="text-sm text-gray-400 photo-count"></p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button class="select-all-btn px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                        Tümünü Seç
                    </button>
                    <button class="download-btn px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        <span>İndir</span>
                    </button>
                    <button class="share-btn px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        <span>Paylaş</span>
                    </button>
                    <button class="delete-selected-btn px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        <span class="delete-btn-text">Tümünü Sil</span>
                    </button>
                </div>
            </div>

            <!-- Photo Grid -->
            <div class="photo-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <!-- Fotoğraflar buraya dinamik olarak eklenecek -->
            </div>
        </div>
    `;
    constructor(selector) {
        this.#container = document.querySelector(selector);
        this.#init();
    }

    async #init() {
        this.#container.innerHTML = this.#template;
        if (!this.#eventListenersAttached) {
            this.#setupEventListeners();
            this.#eventListenersAttached = true;
        }
        await this.#loadPhotos();
    }

    #setupEventListeners() {
        const selectAllBtn = this.#container.querySelector('.select-all-btn');
        const deleteSelectedBtn = this.#container.querySelector('.delete-selected-btn');
        const downloadBtn = this.#container.querySelector('.download-btn');
        const shareBtn = this.#container.querySelector('.share-btn');

        selectAllBtn.addEventListener('click', () => this.#handleSelectAll());
        deleteSelectedBtn.addEventListener('click', () => this.#handleDeleteAll());
        downloadBtn.addEventListener('click', () => this.#handleDownload());
        shareBtn.addEventListener('click', () => this.#handleShare());

        EventBus.on('photo:added', this.#handlePhotoAdded);
        EventBus.on('photo:deleted', this.#handlePhotoDeleted);
        EventBus.on('photo:updated', this.#handlePhotoUpdated);
        EventBus.on('photo:cleared', this.#handlePhotoCleared);
    }

    async #loadPhotos() {
        try {
            const photos = await PhotoService.getAll();
            const grid = this.#container.querySelector('.photo-grid');
            const countEl = this.#container.querySelector('.photo-count');

            // Mevcut fotoğrafların cleanup fonksiyonlarını çağır
            grid.querySelectorAll('[data-photo-id]').forEach(photoEl => {
                if (photoEl._cleanup) {
                    photoEl._cleanup();
                }
            });

            // Grid'i temizle
            grid.innerHTML = '';

            // Yeni fotoğrafları ekle
            countEl.textContent = `${photos.length}/25 fotoğraf`;
            photos.forEach(photo => {
                grid.appendChild(this.#createPhotoElement(photo));
            });

            this.#updateSelectionUI();
        } catch (error) {
            Toast.error('Fotoğraflar yüklenemedi');
            console.error('Failed to load photos:', error);
        }
    }

    #setButtonLoading(button, isLoading) {
        if (isLoading) {
            const originalContent = button.innerHTML;
            button.setAttribute('data-original-content', originalContent);
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            `;
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            const originalContent = button.getAttribute('data-original-content');
            if (originalContent) {
                button.innerHTML = originalContent;
                button.removeAttribute('data-original-content');
            }
            button.disabled = false;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }

    #handleSelectAll() {
        const allPhotos = Array.from(this.#container.querySelectorAll('.photo-card')).map(card =>
            parseInt(card.closest('[data-photo-id]').dataset.photoId)
        );

        if (this.#selectedPhotos.size === allPhotos.length) {
            // Tüm seçimleri kaldır
            this.#selectedPhotos.clear();
            this.#container.querySelectorAll('.selection-overlay').forEach(overlay =>
                overlay.classList.add('hidden')
            );
        } else {
            // Tümünü seç
            allPhotos.forEach(id => this.#selectedPhotos.add(id));
            this.#container.querySelectorAll('.selection-overlay').forEach(overlay =>
                overlay.classList.remove('hidden')
            );
        }
        this.#updateSelectionUI();
    }
    #createPhotoElement(photo) {
        const div = document.createElement('div');
        div.className = this.#isMobile ? 'relative' : 'relative group';
        div.setAttribute('data-photo-id', photo.id);

        div.innerHTML = `
            <div class="photo-card bg-gray-800 rounded-lg overflow-hidden shadow-lg ${this.#isMobile ? 'mb-4' : ''}">
                <div class="relative aspect-[3/4]">
                    <img src="${photo.dataUrl}" 
                         alt="${photo.name}"
                         class="w-full h-full object-cover"
                         style="filter: brightness(${photo.brightness}%)">
                    
                    <!-- Selection Overlay -->
                    <div class="selection-overlay absolute inset-0 bg-blue-500 bg-opacity-50 hidden flex items-center justify-center">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>

                    <!-- Desktop Action Buttons -->
                    ${!this.#isMobile ? `
                    <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 
                                transition-opacity duration-200 flex items-center justify-center space-x-3 z-10">
                        <button class="action-btn edit-btn p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="action-btn download-single-btn p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        </button>
                        <button class="action-btn share-single-btn p-2 bg-green-500 hover:bg-green-600 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete-single-btn p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                    ` : ''}
                </div>

                <!-- Photo Info -->
                <div class="p-3">
                    <h3 class="text-sm font-medium text-gray-200 truncate">${photo.name}</h3>
                    <p class="text-xs text-gray-400">
                        Çekilme: ${new Date(photo.createdAt).toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}
                    </p>
                </div>

                <!-- Mobile Action Buttons -->
                ${this.#isMobile ? `
                <div class="grid grid-cols-2 gap-2 px-3 pb-3">
                    <button class="action-btn edit-btn py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm text-center">
                        Düzenle
                    </button>
                    <button class="action-btn download-single-btn py-2 px-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm text-center">
                        İndir
                    </button>
                    <button class="action-btn share-single-btn py-2 px-3 bg-green-500 hover:bg-green-600 rounded-lg transition-colors text-sm text-center">
                        Paylaş
                    </button>
                    <button class="action-btn delete-single-btn py-2 px-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm text-center">
                        Sil
                    </button>
                </div>
                ` : ''}
            </div>
        `;

        this.#setupPhotoEventListeners(div, photo);
        return div;
    }

    #setupPhotoEventListeners(div, photo) {
        // Elementleri seç
        const card = div.querySelector('.photo-card');
        const selectionOverlay = div.querySelector('.selection-overlay');
        const editBtn = div.querySelector('.edit-btn');
        const downloadBtn = div.querySelector('.download-single-btn');
        const shareBtn = div.querySelector('.share-single-btn');
        const deleteBtn = div.querySelector('.delete-single-btn');

        // Kart tıklama - seçim için
        const handleCardClick = (e) => {
            // Eğer tıklanan element bir buton ya da butonun içindeki bir element ise işlemi durdur
            if (e.target.closest('.action-btn')) {
                e.stopPropagation();
                return;
            }
            this.#togglePhotoSelection(photo.id, selectionOverlay);
        };

        // Buton event handler'ları
        const handleEdit = async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            this.#setButtonLoading(btn, true);
            try {
                await this.#showEditModal(photo);
            } finally {
                this.#setButtonLoading(btn, false);
            }
        };

        const handleDownload = async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            this.#setButtonLoading(btn, true);
            try {
                await PhotoService.downloadMultiple([photo]);
                Toast.success('Fotoğraf indirildi');
            } catch (error) {
                Toast.error('Fotoğraf indirilemedi');
            } finally {
                this.#setButtonLoading(btn, false);
            }
        };

        const handleShare = async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            this.#setButtonLoading(btn, true);
            try {
                await PhotoService.shareMultiple([photo]);
                Toast.success('Fotoğraf paylaşıldı');
            } catch (error) {
                if (error.message === 'SHARE_NOT_SUPPORTED') {
                    Toast.error('Paylaşım özelliği bu cihazda desteklenmiyor');
                } else {
                    Toast.error('Fotoğraf paylaşılamadı');
                }
            } finally {
                this.#setButtonLoading(btn, false);
            }
        };

        const handleDelete = async (e) => {
            e.stopPropagation();
            await this.#handleDelete(photo);
        };

        // Event listener'ları ekle
        card.addEventListener('click', handleCardClick);

        if (editBtn) {
            editBtn.addEventListener('click', handleEdit);
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', handleDownload);
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', handleShare);
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleDelete);
        }

        // Cleanup için event listener'ları sakla
        div._cleanup = () => {
            card.removeEventListener('click', handleCardClick);
            editBtn?.removeEventListener('click', handleEdit);
            downloadBtn?.removeEventListener('click', handleDownload);
            shareBtn?.removeEventListener('click', handleShare);
            deleteBtn?.removeEventListener('click', handleDelete);
        };
    }
    #togglePhotoSelection(photoId, overlay) {
        if (this.#selectedPhotos.has(photoId)) {
            this.#selectedPhotos.delete(photoId);
            overlay.classList.add('hidden');
        } else {
            this.#selectedPhotos.add(photoId);
            overlay.classList.remove('hidden');
        }
        this.#updateSelectionUI();
    }

    #updateSelectionUI() {
        const selectAllBtn = this.#container.querySelector('.select-all-btn');
        const deleteBtn = this.#container.querySelector('.delete-selected-btn');
        const deleteBtnText = deleteBtn.querySelector('.delete-btn-text');
        const downloadBtn = this.#container.querySelector('.download-btn');
        const shareBtn = this.#container.querySelector('.share-btn');

        const totalPhotos = document.querySelectorAll('.photo-card').length;
        const selectedCount = this.#selectedPhotos.size;

        if (selectedCount > 0) {
            selectAllBtn.textContent = selectedCount === totalPhotos ? 'Seçimi Kaldır' : 'Tümünü Seç';
            deleteBtnText.textContent = `Seçilenleri Sil (${selectedCount})`;
            downloadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            shareBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            downloadBtn.removeAttribute('disabled');
            shareBtn.removeAttribute('disabled');
        } else {
            selectAllBtn.textContent = 'Tümünü Seç';
            deleteBtnText.textContent = 'Tümünü Sil';
            downloadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            shareBtn.classList.add('opacity-50', 'cursor-not-allowed');
            downloadBtn.setAttribute('disabled', 'true');
            shareBtn.setAttribute('disabled', 'true');
        }

        if (totalPhotos > 0) {
            deleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            deleteBtn.removeAttribute('disabled');
        } else {
            deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
            deleteBtn.setAttribute('disabled', 'true');
        }
    }

    async #handleDelete(photo) {
        const confirmed = await Dialog.show({
            title: 'Fotoğraf Silinecek',
            message: 'Bu fotoğrafı silmek istediğinizden emin misiniz?',
            type: 'warning'
        });

        if (confirmed) {
            try {
                await PhotoService.delete(photo.id);
                this.#selectedPhotos.delete(photo.id);
                Toast.success('Fotoğraf silindi');
                await this.#loadPhotos();
            } catch (error) {
                Toast.error('Fotoğraf silinemedi');
            }
        }
    }

    async #handleDeleteAll() {
        const selectedCount = this.#selectedPhotos.size;
        const message = selectedCount > 0
            ? `${selectedCount} fotoğrafı silmek istediğinizden emin misiniz?`
            : 'Tüm fotoğrafları silmek istediğinizden emin misiniz?';

        const confirmed = await Dialog.show({
            title: selectedCount > 0 ? 'Seçili Fotoğraflar Silinecek' : 'Tüm Fotoğraflar Silinecek',
            message,
            type: 'warning'
        });

        if (confirmed) {
            try {
                if (selectedCount > 0) {
                    await Promise.all(
                        Array.from(this.#selectedPhotos).map(id => PhotoService.delete(id))
                    );
                    this.#selectedPhotos.clear();
                    Toast.success('Seçili fotoğraflar silindi');
                } else {
                    await PhotoService.deleteAll();
                    Toast.success('Tüm fotoğraflar silindi');
                }
                await this.#loadPhotos();
            } catch (error) {
                Toast.error('Fotoğraflar silinemedi');
            }
        }
    }

    async #handleShare() {
        try {
            if (this.#selectedPhotos.size === 0) {
                await PhotoService.shareAll();
            } else {
                const selectedPhotos = await Promise.all(
                    Array.from(this.#selectedPhotos).map(id => PhotoService.get(id))
                );
                await PhotoService.shareMultiple(selectedPhotos);
            }
            Toast.success(this.#selectedPhotos.size > 0 ? 'Seçili fotoğraflar paylaşıldı' : 'Tüm fotoğraflar paylaşıldı');
        } catch (error) {
            if (error.message === 'SHARE_NOT_SUPPORTED') {
                Toast.error('Paylaşım özelliği bu cihazda desteklenmiyor');
            } else if (error.message === 'NO_PHOTOS') {
                Toast.warning('Paylaşılacak fotoğraf bulunamadı');
            } else {
                Toast.error('Fotoğraflar paylaşılamadı');
            }
        }
    }

    async #showEditModal(photo) {
        // Modal elementlerini seç
        const modal = document.querySelector('.edit-modal');
        const nameInput = modal.querySelector('.photo-name');
        const brightnessInput = modal.querySelector('.brightness');
        const preview = modal.querySelector('.photo-preview');
        const closeBtn = modal.querySelector('.close-modal');
        const saveBtn = modal.querySelector('.save-edit');
        const cropBtn = modal.querySelector('.crop-btn');
        const resetAllBtn = modal.querySelector('.reset-all-btn');

        let cropper = null;
        let currentBrightness = photo.brightness || 100;
        let currentDataUrl = photo.dataUrl;

        // Orijinal değerleri sakla - ilk yüklenen fotoğrafın orijinal halini kullan
        const originalState = {
            brightness: photo.originalBrightness || 100,
            dataUrl: photo.originalDataUrl || photo.dataUrl,
            name: photo.originalName || photo.name
        };

        // Önizleme güncelleme fonksiyonu
        const updatePreview = () => {
            currentBrightness = parseInt(brightnessInput.value);
            if (cropper) {
                const cropBox = modal.querySelector('.cropper-view-box img');
                const cropCanvas = modal.querySelector('.cropper-canvas img');
                if (cropBox && cropCanvas) {
                    cropBox.style.filter = `brightness(${currentBrightness}%)`;
                    cropCanvas.style.filter = `brightness(${currentBrightness}%)`;
                }
            } else {
                preview.style.filter = `brightness(${currentBrightness}%)`;
            }
            updateResetButton();
        };

        // Reset butonunun durumunu güncelle
        const updateResetButton = () => {
            const hasChanges =
                currentBrightness !== originalState.brightness ||
                currentDataUrl !== originalState.dataUrl ||
                nameInput.value !== originalState.name;

            resetAllBtn.disabled = !hasChanges;
            resetAllBtn.classList.toggle('opacity-50', !hasChanges);
            resetAllBtn.classList.toggle('cursor-not-allowed', !hasChanges);
        };
        // Tüm değişiklikleri sıfırla
        const handleReset = () => {
            // İsmi orijinal haline döndür
            nameInput.value = originalState.name;

            // Parlaklığı orijinal haline döndür
            brightnessInput.value = originalState.brightness;
            currentBrightness = originalState.brightness;

            // Eğer varsa cropper'ı temizle
            if (cropper) {
                cropper.destroy();
                cropper = null;
                cropBtn.textContent = 'Kırp';
            }

            // Fotoğrafı orijinal haline döndür
            preview.src = originalState.dataUrl;
            currentDataUrl = originalState.dataUrl;
            preview.style.width = '100%';
            preview.style.filter = `brightness(${originalState.brightness}%)`;

            // Reset butonunun durumunu güncelle
            updateResetButton();

            Toast.success('Fotoğraf orijinal haline döndürüldü');
        };
        // Kaydetme işlemi
        const handleSave = async () => {
            try {
                saveBtn.disabled = true;
                saveBtn.classList.add('opacity-50', 'cursor-not-allowed');

                let finalDataUrl = currentDataUrl;

                if (cropper && cropper.getCroppedCanvas()) {
                    const canvas = cropper.getCroppedCanvas();
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.filter = `brightness(${currentBrightness}%)`;
                    ctx.drawImage(canvas, 0, 0);
                    finalDataUrl = tempCanvas.toDataURL('image/jpeg');
                } else if (currentBrightness !== photo.brightness) {
                    const tempCanvas = document.createElement('canvas');
                    const img = new Image();
                    img.src = currentDataUrl;
                    await new Promise(resolve => img.onload = resolve);

                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.filter = `brightness(${currentBrightness}%)`;
                    ctx.drawImage(img, 0, 0);
                    finalDataUrl = tempCanvas.toDataURL('image/jpeg');
                }

                // Orijinal değerleri ilk kez kaydediyorsa sakla
                const updatedPhoto = await PhotoService.update(photo.id, {
                    name: nameInput.value,
                    brightness: currentBrightness,
                    dataUrl: finalDataUrl,
                    originalDataUrl: photo.originalDataUrl || photo.dataUrl,
                    originalBrightness: photo.originalBrightness || photo.brightness || 100,
                    originalName: photo.originalName || photo.name
                });

                modal.classList.add('hidden');
                Toast.success('Fotoğraf güncellendi');
            } catch (error) {
                Toast.error('Fotoğraf güncellenemedi');
            } finally {
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };

        const handleCrop = () => {
            if (cropper) {
                cropper.destroy();
                cropper = null;
                cropBtn.textContent = 'Kırp';
                preview.style.width = '100%';
            } else {
                cropper = new Cropper(preview, {
                    aspectRatio: 35 / 45,
                    viewMode: 2,
                    crop: updatePreview
                });
                cropBtn.textContent = 'Kırpmayı İptal Et';
            }
            updateResetButton();
        };

        const handleClose = () => {
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            modal.classList.add('hidden');
        };

        // Initial setup - Başlangıç değerlerini ayarla
        nameInput.value = photo.name;
        brightnessInput.value = currentBrightness;
        preview.src = photo.dataUrl;
        preview.style.filter = `brightness(${currentBrightness}%)`;
        modal.classList.remove('hidden');
        updateResetButton();

        // Event listeners
        brightnessInput.addEventListener('input', updatePreview);
        cropBtn.addEventListener('click', handleCrop);
        resetAllBtn.addEventListener('click', handleReset);
        saveBtn.addEventListener('click', handleSave);
        closeBtn.addEventListener('click', handleClose);

        // Modal dışına tıklandığında kapatma
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleClose();
            }
        });

        // ESC tuşu ile kapatma
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Cleanup function
        const cleanup = () => {
            brightnessInput.removeEventListener('input', updatePreview);
            cropBtn.removeEventListener('click', handleCrop);
            resetAllBtn.removeEventListener('click', handleReset);
            saveBtn.removeEventListener('click', handleSave);
            closeBtn.removeEventListener('click', handleClose);
            document.removeEventListener('keydown', handleKeyDown);
            if (cropper) {
                cropper.destroy();
            }
        };

        // Modal kapandığında cleanup yap
        modal.addEventListener('hidden', cleanup, { once: true });
    }

    destroy() {
        EventBus.off('photo:added', this.#handlePhotoAdded);
        EventBus.off('photo:deleted', this.#handlePhotoDeleted);
        EventBus.off('photo:updated', this.#handlePhotoUpdated);
        EventBus.off('photo:cleared', this.#handlePhotoCleared);
        this.#eventListenersAttached = false;
    }

    async test() {
        try {
            return {
                initialized: !!this.#container,
                hasEventListeners: this.#eventListenersAttached,
                selectedPhotosCount: this.#selectedPhotos.size,
                isMobile: this.#isMobile
            };
        } catch (error) {
            console.error('Gallery test failed:', error);
            return false;
        }
    }

    async #handleDownload() {
        const downloadBtn = this.#container.querySelector('.download-btn');
        this.#setButtonLoading(downloadBtn, true);

        try {
            if (this.#selectedPhotos.size === 0) {
                const allPhotos = await PhotoService.getAll();
                if (allPhotos.length === 0) {
                    throw new Error('NO_PHOTOS');
                }
                await PhotoService.downloadAll();
            } else {
                const selectedPhotos = await Promise.all(
                    Array.from(this.#selectedPhotos).map(id => PhotoService.get(id))
                );
                await PhotoService.downloadMultiple(selectedPhotos);
            }
            Toast.success(this.#selectedPhotos.size > 0 ? 'Seçili fotoğraflar indirildi' : 'Tüm fotoğraflar indirildi');
        } catch (error) {
            if (error.message === 'NO_PHOTOS') {
                Toast.warning('İndirilecek fotoğraf bulunamadı');
            } else {
                Toast.error('Fotoğraflar indirilemedi');
                console.error('Download error:', error);
            }
        } finally {
            this.#setButtonLoading(downloadBtn, false);
        }
    }
}
