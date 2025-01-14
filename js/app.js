import { Config } from './core/config.js';
import { EventBus } from './core/events.js';
import { Storage } from './core/storage.js';
import { Dialog } from './ui/components/dialog.js';
import { Toast } from './ui/components/toast.js';
import { CameraView } from './ui/camera.js';
import { GalleryView } from './ui/gallery.js';
import { ThemeManager } from './ui/theme.js';

class App {
    constructor() {
        this.activeTab = 'camera';
        this.photoCount = 0;
        this.isDark = localStorage.getItem('theme') === 'dark';

        this.cameraView = null;
        this.galleryView = null;

        this.init();
        this.setupCleanup();
    }

    async init() {
        try {
            // Initialize storage
            await Storage.init();
            await this.updatePhotoCount();

            // Initialize views
            this.cameraView = new CameraView('#cameraView');
            this.galleryView = new GalleryView('#galleryView');

            // Initialize theme
            ThemeManager.init();

            // Setup event listeners
            this.setupEventListeners();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization failed:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            ThemeManager.toggle();
        });

        // Photo count updates
        EventBus.on('photo:added', () => this.updatePhotoCount());
        EventBus.on('photo:deleted', () => this.updatePhotoCount());
        EventBus.on('photo:cleared', () => this.updatePhotoCount());

        // Theme changes
        EventBus.on('theme:changed', theme => {
            document.body.dataset.theme = theme;
            this.isDark = theme === 'dark';
            this.updateThemeIcons();
        });
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('bg-blue-500');
                btn.classList.remove('hover:bg-gray-700');
            } else {
                btn.classList.remove('bg-blue-500');
                btn.classList.add('hover:bg-gray-700');
            }
        });

        // Update views
        document.querySelectorAll('.view-container').forEach(view => {
            view.classList.toggle('hidden', view.id !== `${tabName}View`);
        });
    }

    async updatePhotoCount() {
        this.photoCount = await Storage.count();
        const countElement = document.getElementById('photoCount');
        const galleryCountElement = document.querySelector('.gallery-container .photo-count');

        // Her durumda fotoğraf sayısını göster
        countElement.textContent = `${this.photoCount}/25`;
        countElement.classList.remove('hidden'); // hidden class'ını kaldırdık

        // Galeri sayacını da güncelle
        if (galleryCountElement) {
            galleryCountElement.textContent = `${this.photoCount}/25 fotoğraf`;
        }
    }

    updateThemeIcons() {
        const darkIcon = document.querySelector('.dark-icon');
        const lightIcon = document.querySelector('.light-icon');

        if (this.isDark) {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        } else {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }
    }

    setupCleanup() {
        window.addEventListener('unload', () => {
            if (this.cameraView) {
                this.cameraView.destroy();
                this.cameraView = null;
            }
            if (this.galleryView) {
                this.galleryView = null;
            }
        });
    }

    // Debug için yardımcı metod
    debug() {
        console.log({
            activeTab: this.activeTab,
            photoCount: this.photoCount,
            isDark: this.isDark,
            theme: document.body.dataset.theme,
            cameraView: !!this.cameraView,
            galleryView: !!this.galleryView
        });
    }

    async testSystem() {
        console.group('System Test');

        try {
            // Storage test
            console.log('Testing storage...');
            const storageOK = await Storage.test();
            console.log('Storage:', storageOK ? 'OK' : 'FAIL');

            // Camera test
            console.log('Testing camera...');
            const cameraOK = await this.cameraView.test();
            console.log('Camera:', cameraOK ? 'OK' : 'FAIL');

            // Gallery test
            console.log('Testing gallery...');
            const galleryOK = await this.galleryView.test();
            console.log('Gallery:', galleryOK ? 'OK' : 'FAIL');

            // Event system test
            console.log('Testing events...');
            const eventsOK = EventBus.test();
            console.log('Events:', eventsOK ? 'OK' : 'FAIL');

            console.log('All systems tested');
            return storageOK && cameraOK && galleryOK && eventsOK;
        } catch (error) {
            console.error('Test failed:', error);
            return false;
        } finally {
            console.groupEnd();
        }
    }

    // Debug helper
    getSystemState() {
        return {
            storage: {
                initialized: Storage.isInitialized(),
                photoCount: this.photoCount
            },
            camera: {
                active: this.cameraView?.isActive() || false,
                stream: !!this.cameraView?.stream
            },
            gallery: {
                initialized: !!this.galleryView,
                photos: this.galleryView?.getPhotoCount() || 0
            },
            ui: {
                activeTab: this.activeTab,
                theme: document.body.dataset.theme
            }
        };
    }
}

// Initialize app
const app = new App();

// Debug için global erişim
window.app = app;

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: './'
            });
            console.log('SW registered:', registration);

            // PWA yükleme önerisi için deferredPrompt olayını dinle
            let deferredPrompt;
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;

                // İsterseniz burada bir "Uygulamayı Yükle" butonu gösterebilirsiniz
                // Örnek:
                showInstallButton();
            });
        } catch (error) {
            console.error('SW registration failed:', error);
        }
    });
}

// Global test helper
window.testApp = async () => {
    console.log('Current state:', app.getSystemState());
    const testResult = await app.testSystem();
    console.log('Test result:', testResult ? 'PASS' : 'FAIL');
}; 
