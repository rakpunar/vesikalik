import { Camera } from './camera.js';
import { Gallery } from './gallery.js';
import { Storage } from './storage.js';
import { Toast } from './toast.js';
import { Dialog } from './dialog.js';
import { DebugLogger } from './debug.js';

class App {
    constructor() {
        this.camera = new Camera();
        this.gallery = new Gallery();
        this.storage = new Storage();
        this.dialog = new Dialog();
        this.toast = new Toast();
        this.activeTab = 'camera';
        this.debugLogger = new DebugLogger();
        console.log('App initialized with debug logger');

        // PWA için service worker kontrolü
        this.registerServiceWorker();
        this.setupEventListeners();
        this.initializeApp();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('service-worker.js');
                console.log('Service Worker başarıyla kaydedildi:', registration);

                // Share Target API için event listener
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data.type === 'share-target') {
                        this.handleSharedFiles(event.data.files);
                    }
                });
            } catch (error) {
                console.error('Service Worker kaydı başarısız:', error);
            }
        }
    }

    async handleSharedFiles(files) {
        try {
            for (const file of files) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    await this.storage.addPhoto(reader.result);
                    this.gallery.render();
                    this.toast.show('Paylaşılan fotoğraf kaydedildi', 'success');
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('Paylaşılan dosya işlenirken hata:', error);
            this.toast.show('Fotoğraf kaydedilemedi', 'error');
        }
    }

    async initializeApp() {
        try {
            window.app = {
                camera: new Camera(),
                gallery: new Gallery(),
                debug: new Debug(),
            };

            // Kamera başlatma
            await window.app.camera.init();

            setupEventListeners();
        } catch (error) {
            console.error('Uygulama başlatma hatası:', error);
        }
    }

    async deleteAllPhotos() {
        const confirmed = await this.dialog.confirm('Tüm fotoğraflar silinecek. Emin misiniz?', 'Fotoğrafları Sil');
        if (confirmed) {
            this.storage.deleteAllPhotos();
            this.gallery.render();
            this.toast.show('Tüm fotoğraflar silindi', 'success');
        }
    }

    async capturePhoto() {
        try {
            // Önce flaş efekti ve fotoğraf çekimi
            const photoData = await this.camera.flashAndCapture();

            // Sonra dialog göster
            let name = await this.dialog.prompt('Fotoğraf için isim girin (Boş bırakırsanız otomatik isimlendirilecek):', '', 'Fotoğraf İsmi');

            // İsim girildi ve mevcut bir isimle çakışıyor
            while (name !== null && name.trim() !== '' && this.storage.isNameExists(name.trim())) {
                this.toast.show('Bu isimde bir fotoğraf zaten var!', 'error');
                name = await this.dialog.prompt('Lütfen başka bir isim girin (Boş bırakırsanız otomatik isimlendirilecek):', name, 'Fotoğraf İsmi');
            }

            // İsim null değilse (iptal edilmediyse) fotoğrafı kaydet
            if (name !== null) {
                const photo = await this.storage.addPhoto(photoData, name);
                // Galeriyi güncelle
                await this.gallery.render();
                this.toast.show('Fotoğraf başarıyla kaydedildi', 'success');
            }
        } catch (error) {
            await this.dialog.alert(error.message, 'Hata');
        }
    }

    setupEventListeners() {
        document.getElementById('camera-tab').addEventListener('click', () => this.switchTab('camera'));
        document.getElementById('gallery-tab').addEventListener('click', () => this.switchTab('gallery'));

        document.getElementById('capture-btn').addEventListener('click', () => this.capturePhoto());

        window.addEventListener('beforeunload', () => {
            this.camera.stop();
        });

        window.addEventListener('resize', () => {
            this.setupGuideLines();
        });
    }

    switchTab(tabName) {
        const cameraTab = document.getElementById('camera-tab');
        const galleryTab = document.getElementById('gallery-tab');
        const cameraSection = document.getElementById('camera-section');
        const gallerySection = document.getElementById('gallery-section');

        if (tabName === 'camera') {
            cameraTab.classList.remove('bg-gray-500');
            cameraTab.classList.add('bg-blue-500');
            galleryTab.classList.remove('bg-blue-500');
            galleryTab.classList.add('bg-gray-500');

            cameraSection.classList.remove('hidden');
            gallerySection.classList.add('hidden');

            // Kamera sekmesine geçildiğinde kamerayı başlat
            this.camera.init();
        } else {
            galleryTab.classList.remove('bg-gray-500');
            galleryTab.classList.add('bg-blue-500');
            cameraTab.classList.remove('bg-blue-500');
            cameraTab.classList.add('bg-gray-500');

            gallerySection.classList.remove('hidden');
            cameraSection.classList.add('hidden');

            // Galeri sekmesine geçildiğinde kamerayı durdur
            this.camera.stop();
        }

        this.activeTab = tabName;
    }

    setupGuideLines() {
        const video = document.getElementById('camera-preview');
        const guide = document.getElementById('crop-guide');
        const container = document.getElementById('camera-container');

        // Video yüklenene kadar bekle
        video.addEventListener('loadedmetadata', () => {
            const videoAspect = video.videoWidth / video.videoHeight;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            // 35x45mm oranı (1:1.285714)
            const targetAspect = 35 / 45;

            let guideWidth, guideHeight;

            if (window.innerWidth <= 768) { // Mobil
                guideHeight = containerHeight * 0.7;
                guideWidth = guideHeight * targetAspect;
            } else { // Masaüstü
                guideWidth = containerWidth * 0.5;
                guideHeight = guideWidth / targetAspect;
            }

            // Kılavuzu ortala
            guide.style.width = `${guideWidth}px`;
            guide.style.height = `${guideHeight}px`;
            guide.style.left = `${(containerWidth - guideWidth) / 2}px`;
            guide.style.top = `${(containerHeight - guideHeight) / 2}px`;
        });
    }
}

// Uygulamayı başlat
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
