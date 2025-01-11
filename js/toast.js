export class Toast {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        if (type === 'error') {
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
        } else if (type === 'success') {
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`;
        }

        const text = document.createElement('div');
        text.className = 'toast-message';
        text.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.hide(toast);

        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        this.container.appendChild(toast);

        // Animasyon için setTimeout
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 5 saniye sonra otomatik kapanma
        setTimeout(() => {
            this.hide(toast);
        }, 5000);
    }

    hide(toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');

        // Animasyon bittikten sonra elementi kaldır
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }
}