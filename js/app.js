class VesikalikPWA {
    constructor() {
        this.initializeApp();
    }

    async initializeApp() {
        // Service Worker Kaydı
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker başarıyla kaydedildi:', registration);
            } catch (error) {
                console.error('Service Worker kaydı başarısız:', error);
            }
        }

        // Kamera İzinleri
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            this.initializeCamera(stream);
        } catch (error) {
            console.error('Kamera erişimi başarısız:', error);
        }

        this.setupEventListeners();
    }

    initializeCamera(stream) {
        const video = document.getElementById('camera');
        video.srcObject = stream;
    }

    setupEventListeners() {
        const captureBtn = document.getElementById('capture');
        const shareBtn = document.getElementById('share');

        captureBtn.addEventListener('click', () => this.capturePhoto());
        shareBtn.addEventListener('click', () => this.sharePhotos());
    }

    async capturePhoto() {
        const video = document.getElementById('camera');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const photoData = canvas.toDataURL('image/jpeg');
        this.savePhoto(photoData);
    }

    async sharePhotos() {
        try {
            const photos = await this.getPhotos();
            if (photos.length === 0) return;

            const files = await Promise.all(photos.map(async (photo) => {
                const response = await fetch(photo.data);
                const blob = await response.blob();
                return new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            }));

            if (navigator.canShare && navigator.canShare({ files })) {
                await navigator.share({
                    files,
                    title: 'Vesikalık Fotoğraflar',
                    text: 'PWA ile çekilen fotoğraflar'
                });
            } else {
                throw new Error('Paylaşım desteklenmiyor');
            }
        } catch (error) {
            console.error('Paylaşım hatası:', error);
        }
    }

    // IndexedDB işlemleri için metodlar...
}

// Uygulamayı başlat
new VesikalikPWA(); 
