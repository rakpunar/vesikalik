import { Config } from '../core/config.js';
import { EventBus } from '../core/events.js';
import { CameraService } from '../services/camera.js';
import { PhotoService } from '../services/photo.js';
import { Toast } from './components/toast.js';

export class CameraView {
    #container = null;
    #camera = null;
    #tabChangeListener = null;
    #template = `
        <div class="camera-container relative max-w-xl mx-auto">
            <div class="text-center mb-4">
                <input 
                    type="text" 
                    class="photo-name w-64 p-2 border rounded-lg bg-gray-800 border-gray-600 text-white"
                    placeholder="Fotoğraf adı"
                />
            </div>
            
            <div class="relative rounded-lg overflow-hidden shadow-lg">
                <div class="relative" style="aspect-ratio: 350/450;">
                    <video 
                        class="absolute inset-0 w-full h-full object-cover"
                        autoplay 
                        playsinline
                    ></video>
                    
                    <div class="guideline absolute inset-0">
                        <div class="border-2 border-white opacity-70 absolute inset-4"></div>
                    </div>
                </div>
            </div>

            <div class="controls mt-4 flex justify-center items-center space-x-4">
                <button class="switch-camera-btn p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                
                <button class="capture-btn w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">
                </button>
            </div>
        </div>
    `;

    constructor(selector) {
        this.#container = document.querySelector(selector);
        this.#init();
    }

    async #init() {
        // Template'i yükle
        this.#container.innerHTML = this.#template;

        // Kamera servisini başlat
        const video = this.#container.querySelector('video');
        this.#camera = new CameraService(video);

        // Event listener'ları ekle
        this.#setupEventListeners();

        // Kamerayı başlat
        try {
            await this.#camera.start();
        } catch (error) {
            Toast.error('Kamera başlatılamadı. Lütfen kamera izinlerini kontrol edin.');
        }
    }

    #setupEventListeners() {
        const captureBtn = this.#container.querySelector('.capture-btn');
        const switchBtn = this.#container.querySelector('.switch-camera-btn');
        const nameInput = this.#container.querySelector('.photo-name');

        captureBtn.addEventListener('click', () => this.#capture(nameInput.value));
        switchBtn.addEventListener('click', () => this.#switchCamera());

        this.#tabChangeListener = (e) => {
            const tab = e.detail;
            if (tab === 'camera') {
                this.#camera.start();
            } else {
                this.#camera.stop();
            }
        };
        document.addEventListener('tab-changed', this.#tabChangeListener);
    }

    async #capture(photoName) {
        try {
            const now = new Date();

            // Benzersiz ID formatında timestamp oluştur
            const generateTimestampId = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

                return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
            };

            const timestampId = generateTimestampId(now);
            const defaultName = `Vesikalık_${timestampId}`;

            const dataUrl = this.#camera.capture();
            await PhotoService.add({
                name: photoName || defaultName,
                dataUrl,
                createdAt: now.toISOString(), // Görüntüleme için ISO formatını tutuyoruz
                brightness: 100,
                contrast: 100
            });
            Toast.success('Fotoğraf başarıyla kaydedildi');
        } catch (error) {
            if (error.message === 'PHOTO_LIMIT_REACHED') {
                Toast.warning('Maksimum fotoğraf sayısına ulaşıldı');
            } else {
                Toast.error('Fotoğraf kaydedilemedi');
            }
        }
    }

    async #switchCamera() {
        try {
            await this.#camera.switchCamera();
        } catch (error) {
            Toast.error('Kamera değiştirilemedi');
        }
    }

    destroy() {
        if (this.#camera) {
            this.#camera.stop();
        }
        if (this.#tabChangeListener) {
            document.removeEventListener('tab-changed', this.#tabChangeListener);
            this.#tabChangeListener = null;
        }
    }

    isActive() {
        return !!this.#camera?.stream;
    }

    async test() {
        try {
            if (!this.#camera) {
                await this.#init();
            }
            return {
                initialized: !!this.#camera,
                hasStream: this.isActive(),
                hasVideo: !!this.#container.querySelector('video')
            };
        } catch (error) {
            console.error('Camera test failed:', error);
            return false;
        }
    }
} 
