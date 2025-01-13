// Kamera işlemleri için yardımcı sınıf
export class Camera {
    constructor() {
        this.video = document.getElementById('camera-preview');
        this.stream = null;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // PWA için ekran oryantasyon değişikliğini dinle
        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                this.handleOrientationChange();
            });
        }
    }

    async init() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Kamera erişimi desteklenmiyor');
            }

            const constraints = {
                video: {
                    facingMode: this.isMobile ? 'environment' : 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve(true);
                };
            });

        } catch (error) {
            console.error('Kamera başlatma hatası:', error);
            throw error;
        }
    }

    handleOrientationChange() {
        // Oryantasyon değiştiğinde kamerayı yeniden başlat
        if (this.stream) {
            this.init();
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

                    // PWA için dokunma geri bildirimi
                    if ('vibrate' in navigator) {
                        navigator.vibrate([50]);
                    }

                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                }, 300);
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
