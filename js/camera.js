// Kamera işlemleri için yardımcı sınıf
export class Camera {
    constructor() {
        this.video = document.getElementById('camera-preview');
        this.stream = null;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    async init() {
        try {
            // Kamera özelliklerini belirle
            const constraints = {
                video: {
                    facingMode: this.isMobile ? 'environment' : 'user',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    // Mobilde geniş açı kamerayı engelle
                    advanced: [{ facingMode: 'environment' }, { zoom: 1 }]
                }
            };

            // Mevcut stream varsa kapat
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Yeni stream başlat
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // En iyi kamera ayarlarını seç
            const track = this.stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if (capabilities.torch) {
                await track.applyConstraints({
                    advanced: [{ torch: false }]
                });
            }

            // Zoom seviyesini 1x olarak ayarla
            if (capabilities.zoom) {
                await track.applyConstraints({
                    advanced: [{ zoom: 1 }]
                });
            }

            return true;
        } catch (error) {
            console.error('Kamera başlatma hatası:', error);
            throw new Error('Kamera başlatılamadı: ' + error.message);
        }
    }

    async flashAndCapture() {
        try {
            // Flaş efekti için div oluştur veya varsa al
            let flashElement = document.querySelector('.camera-flash');
            if (!flashElement) {
                flashElement = document.createElement('div');
                flashElement.className = 'camera-flash';
                document.getElementById('camera-container').appendChild(flashElement);
            }

            // Önce flaş efektini göster ve bekle
            return new Promise((resolve) => {
                flashElement.classList.add('active');

                setTimeout(() => {
                    flashElement.classList.remove('active');

                    // Flaş efekti bittikten sonra fotoğrafı çek
                    const canvas = document.createElement('canvas');
                    const cropGuide = document.getElementById('crop-guide');
                    const rect = cropGuide.getBoundingClientRect();
                    const videoRect = this.video.getBoundingClientRect();

                    const scaleX = this.video.videoWidth / videoRect.width;
                    const scaleY = this.video.videoHeight / videoRect.height;

                    const cropX = (rect.left - videoRect.left) * scaleX;
                    const cropY = (rect.top - videoRect.top) * scaleY;
                    const cropWidth = rect.width * scaleX;
                    const cropHeight = rect.height * scaleY;

                    canvas.width = cropWidth;
                    canvas.height = cropHeight;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(this.video,
                        cropX, cropY, cropWidth, cropHeight,
                        0, 0, cropWidth, cropHeight
                    );

                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                }, 500); // Flaş animasyonu için 300ms bekle
            });
        } catch (error) {
            console.error('Fotoğraf çekme hatası:', error);
            throw new Error('Fotoğraf çekilemedi: ' + error.message);
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}
