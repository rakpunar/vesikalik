export class Toast {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';

        // PWA için safe-area-inset desteği
        this.container.style.paddingBottom = 'env(safe-area-inset-bottom)';
        this.container.style.paddingLeft = 'env(safe-area-inset-left)';
        this.container.style.paddingRight = 'env(safe-area-inset-right)';

        document.body.appendChild(this.container);

        // PWA için bildirim izni kontrolü
        this.checkNotificationPermission();
    }

    async checkNotificationPermission() {
        if ('Notification' in window) {
            this.notificationsSupported = true;
            this.notificationsAllowed = Notification.permission === 'granted';

            // İzin henüz sorulmamışsa
            if (Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    this.notificationsAllowed = permission === 'granted';
                } catch (error) {
                    console.error('Bildirim izni alınamadı:', error);
                }
            }
        } else {
            this.notificationsSupported = false;
        }
    }

    show(message, type = 'error', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.innerHTML = this.getIconSvg(type);

        const text = document.createElement('div');
        text.className = 'toast-message';
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.hide(toast);

        // PWA için dokunma geri bildirimi
        if ('vibrate' in navigator) {
            closeBtn.addEventListener('touchstart', () => {
                navigator.vibrate(1);
            });
        }

        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        this.container.appendChild(toast);

        // PWA için sistem bildirimi
        this.showSystemNotification(message, type);

        // Animasyon için requestAnimationFrame
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Otomatik kapanma
        setTimeout(() => {
            this.hide(toast);
        }, duration);

        // PWA için ses bildirimi
        this.playNotificationSound(type);
    }

    hide(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');

        // Animasyon bittikten sonra elementi kaldır
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

    async showSystemNotification(message, type) {
        if (this.notificationsSupported && this.notificationsAllowed && document.hidden) {
            try {
                const notification = new Notification('Vesikalık', {
                    body: message,
                    icon: '../img/favicon-192x192.png',
                    badge: '../img/favicon-192x192.png',
                    vibrate: [200, 100, 200],
                    tag: 'vesikalik-notification',
                    renotify: true
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            } catch (error) {
                console.error('Sistem bildirimi gösterilemedi:', error);
            }
        }
    }

    playNotificationSound(type) {
        // PWA için ses bildirimi
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const context = new AudioContext();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            // Bildirim tipine göre farklı ses
            oscillator.frequency.value = type === 'error' ? 440 : 880;
            gainNode.gain.value = 0.1;

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                context.close();
            }, 200);
        }
    }

    getIconSvg(type) {
        switch (type) {
            case 'error':
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>`;
            case 'success':
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>`;
            default:
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>`;
        }
    }
}
