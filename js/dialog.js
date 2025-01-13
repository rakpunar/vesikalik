export class Dialog {
    constructor() {
        this.setupDialog();
        // PWA için hardware back button desteği
        this.setupBackButtonHandler();
    }

    setupDialog() {
        this.container = document.createElement('div');
        this.container.className = 'dialog-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-200 backdrop-blur-sm';

        this.content = document.createElement('div');
        this.content.className = 'dialog-content bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl transform transition-transform';

        // PWA için safe-area-inset desteği
        this.content.style.paddingBottom = 'env(safe-area-inset-bottom)';
        this.content.style.paddingTop = 'env(safe-area-inset-top)';

        this.container.appendChild(this.content);
        document.body.appendChild(this.container);

        // Dışarı tıklamayı engelle
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                // Sadece confirm ve alert için dışarı tıklama ile kapanma
                if (!this.isPrompt) {
                    this.hide();
                    if (this.rejectCallback) this.rejectCallback();
                }
            }
        });

        // PWA için dokunma geri bildirimi
        if ('vibrate' in navigator) {
            this.container.addEventListener('touchstart', () => {
                navigator.vibrate(1);
            });
        }
    }

    setupBackButtonHandler() {
        window.addEventListener('popstate', (event) => {
            if (this.isVisible) {
                event.preventDefault();
                this.hide();
                if (this.rejectCallback) this.rejectCallback();
                history.pushState(null, '');
            }
        });
    }

    show() {
        this.content.style.transform = 'scale(0.95)';
        this.container.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.content.style.transform = 'scale(1)';
        });
        // PWA için history state
        history.pushState(null, '');
        // PWA için ekran kilitlenmesini engelle
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(console.error);
        }
    }

    hide() {
        this.container.classList.add('hidden');
        this.content.innerHTML = '';
        this.isPrompt = false;
        this.rejectCallback = null;
    }

    createButtons(buttons) {
        const container = document.createElement('div');
        container.className = 'flex justify-end gap-2 mt-4';

        Object.entries(buttons).forEach(([label, callback]) => {
            const button = document.createElement('button');
            button.className = 'px-4 py-2 rounded text-white transition-colors';
            button.classList.add(label === 'İptal' ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700');
            button.textContent = label;
            button.onclick = () => {
                if ('vibrate' in navigator) navigator.vibrate(1);
                callback();
                this.hide();
            };
            container.appendChild(button);
        });

        return container;
    }

    alert(message, title = 'Uyarı', type = 'info') {
        return new Promise((resolve) => {
            this.content.innerHTML = `
                <div class="dialog-icon ${type}">${this.getIconSvg(type)}</div>
                <h2 class="dialog-title">${title}</h2>
                <p class="dialog-message">${message}</p>
            `;

            this.content.appendChild(
                this.createButtons({
                    'Tamam': () => resolve(true)
                })
            );

            this.show();
        });
    }

    confirm(message, title = 'Onay', type = 'question') {
        return new Promise((resolve, reject) => {
            this.rejectCallback = reject;
            this.content.innerHTML = `
                <div class="dialog-icon ${type}">${this.getIconSvg(type)}</div>
                <h2 class="dialog-title">${title}</h2>
                <p class="dialog-message">${message}</p>
            `;

            this.content.appendChild(
                this.createButtons({
                    'İptal': () => resolve(false),
                    'Tamam': () => resolve(true)
                })
            );

            this.show();
        });
    }

    prompt(message, defaultValue = '', title = 'Giriş') {
        this.isPrompt = true;
        return new Promise((resolve, reject) => {
            this.rejectCallback = reject;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'dialog-input';
            input.value = defaultValue;

            // PWA için input özellikleri
            input.autocomplete = 'off';
            input.autocapitalize = 'off';
            input.spellcheck = false;

            this.content.innerHTML = `
                <h2 class="dialog-title">${title}</h2>
                <p class="dialog-message">${message}</p>
            `;
            this.content.appendChild(input);
            this.content.appendChild(
                this.createButtons({
                    'İptal': () => resolve(null),
                    'Tamam': () => resolve(input.value)
                })
            );

            this.show();
            input.focus();
            input.select();
        });
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
            case 'question':
                return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
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
