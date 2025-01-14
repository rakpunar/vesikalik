import { Config } from '../core/config.js';
import { EventBus } from '../core/events.js';

export class CameraService {
    #stream = null;
    #videoElement = null;
    #isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    constructor(videoElement) {
        this.#videoElement = videoElement;
    }

    async start() {
        try {
            const constraints = {
                video: {
                    facingMode: this.#isMobile ? 'environment' : 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: Config.CAMERA.ASPECT_RATIO.WIDTH / Config.CAMERA.ASPECT_RATIO.HEIGHT
                }
            };

            this.#stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.#videoElement.srcObject = this.#stream;

            await new Promise(resolve => {
                this.#videoElement.onloadedmetadata = () => {
                    this.#videoElement.play();
                    resolve();
                };
            });

            EventBus.emit('camera:ready');
        } catch (error) {
            EventBus.emit('error', {
                type: 'camera',
                message: 'Kamera başlatılamadı',
                error
            });
            throw error;
        }
    }

    stop() {
        if (this.#stream) {
            this.#stream.getTracks().forEach(track => track.stop());
            this.#stream = null;
        }
    }

    capture() {
        const canvas = document.createElement('canvas');
        const video = this.#videoElement;
        const aspectRatio = Config.CAMERA.ASPECT_RATIO.WIDTH / Config.CAMERA.ASPECT_RATIO.HEIGHT;

        // Video boyutlarını al
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        // Kırpma boyutlarını hesapla
        let cropWidth, cropHeight;
        if (videoAspectRatio > aspectRatio) {
            // Video daha geniş, yüksekliğe göre hesapla
            cropHeight = videoHeight;
            cropWidth = videoHeight * aspectRatio;
        } else {
            // Video daha dar, genişliğe göre hesapla
            cropWidth = videoWidth;
            cropHeight = videoWidth / aspectRatio;
        }

        // Kırpma pozisyonunu hesapla (merkezde)
        const x = (videoWidth - cropWidth) / 2;
        const y = (videoHeight - cropHeight) / 2;

        // Canvas boyutlarını ayarla
        canvas.width = Config.PHOTO.WIDTH;
        canvas.height = Config.PHOTO.HEIGHT;

        // Fotoğrafı çek ve kırp
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
            video,
            x, y, cropWidth, cropHeight,
            0, 0, canvas.width, canvas.height
        );

        return canvas.toDataURL(Config.PHOTO.FORMAT, Config.PHOTO.QUALITY);
    }

    async switchCamera() {
        if (!this.#isMobile) return;

        const currentFacingMode = this.#stream.getVideoTracks()[0].getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

        this.stop();

        try {
            this.#stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: newFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: Config.CAMERA.ASPECT_RATIO.WIDTH / Config.CAMERA.ASPECT_RATIO.HEIGHT
                }
            });

            this.#videoElement.srcObject = this.#stream;
            EventBus.emit('camera:switched');
        } catch (error) {
            EventBus.emit('error', {
                type: 'camera',
                message: 'Kamera değiştirilemedi',
                error
            });
            throw error;
        }
    }
} 