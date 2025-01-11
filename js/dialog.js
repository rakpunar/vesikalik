export class Dialog {
    constructor() {
        this.setupDialog();
    }

    setupDialog() {
        // Ana dialog container
        this.container = document.createElement('div');
        this.container.className = 'dialog-overlay hidden';

        // Dialog içeriği
        this.content = document.createElement('div');
        this.content.className = 'dialog-content';

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
    }

    createButtons(options) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'dialog-buttons';

        if (options.confirm || options.prompt) {
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'dialog-button confirm';
            confirmBtn.textContent = options.confirmText || 'Tamam';
            confirmBtn.onclick = () => {
                if (options.prompt) {
                    const input = this.content.querySelector('input');
                    this.resolveCallback(input.value);
                } else {
                    this.resolveCallback(true);
                }
                this.hide();
            };
            buttonContainer.appendChild(confirmBtn);
        }

        if (options.confirm || options.prompt) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'dialog-button cancel';
            cancelBtn.textContent = options.cancelText || 'İptal';
            cancelBtn.onclick = () => {
                this.hide();
                this.rejectCallback();
            };
            buttonContainer.appendChild(cancelBtn);
        } else {
            const okBtn = document.createElement('button');
            okBtn.className = 'dialog-button confirm';
            okBtn.textContent = 'Tamam';
            okBtn.onclick = () => {
                this.hide();
                if (this.resolveCallback) this.resolveCallback();
            };
            buttonContainer.appendChild(okBtn);
        }

        return buttonContainer;
    }

    show(options = {}) {
        this.content.innerHTML = '';
        this.isPrompt = options.prompt;

        // Icon alanı
        const icon = document.createElement('div');
        icon.className = `dialog-icon ${options.type || 'info'}`;
        icon.innerHTML = this.getIconSvg(options.type);
        this.content.appendChild(icon);

        // Başlık
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'dialog-title';
            title.textContent = options.title;
            this.content.appendChild(title);
        }

        // Mesaj
        const message = document.createElement('div');
        message.className = 'dialog-message';
        message.textContent = options.message;
        this.content.appendChild(message);

        // Input alanı (prompt için)
        if (options.prompt) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'dialog-input';
            input.value = options.default || '';
            input.placeholder = options.placeholder || '';
            this.content.appendChild(input);
            // Enter tuşu ile onaylama
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    this.resolveCallback(input.value);
                    this.hide();
                }
            });
        }

        // Butonlar
        const buttons = this.createButtons(options);
        this.content.appendChild(buttons);

        // Dialog'u göster
        this.container.classList.remove('hidden');

        // Input varsa focus
        if (options.prompt) {
            setTimeout(() => {
                this.content.querySelector('input').focus();
            }, 100);
        }

        return new Promise((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        });
    }

    hide() {
        this.container.classList.add('hidden');
    }

    alert(message, title = '') {
        return this.show({
            type: 'info',
            message,
            title
        });
    }

    confirm(message, title = '') {
        return this.show({
            type: 'question',
            message,
            title,
            confirm: true
        });
    }

    prompt(message, defaultValue = '', title = '') {
        return this.show({
            type: 'input',
            message,
            title,
            prompt: true,
            default: defaultValue
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