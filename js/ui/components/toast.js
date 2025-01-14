import { EventBus } from '../../core/events.js';

export class Toast {
    static #template = `
        <div class="toast fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform translate-x-full transition-transform duration-300">
            <span class="toast-icon"></span>
            <p class="toast-message"></p>
        </div>
    `;

    static #container = null;
    static #queue = [];
    static #isShowing = false;

    static init() {
        this.#container = document.getElementById('toasts');
        EventBus.on('error', error => this.error(error.message));
    }

    static success(message, duration = 3000) {
        this.#show({
            message,
            duration,
            icon: '✓',
            className: 'bg-green-500'
        });
    }

    static error(message, duration = 4000) {
        this.#show({
            message,
            duration,
            icon: '✕',
            className: 'bg-red-500'
        });
    }

    static info(message, duration = 3000) {
        this.#show({
            message,
            duration,
            icon: 'ℹ',
            className: 'bg-blue-500'
        });
    }

    static warning(message, duration = 3500) {
        this.#show({
            message,
            duration,
            icon: '⚠',
            className: 'bg-yellow-500'
        });
    }

    static async #show({ message, duration, icon, className }) {
        this.#queue.push({ message, duration, icon, className });
        if (!this.#isShowing) {
            await this.#processQueue();
        }
    }

    static async #processQueue() {
        if (this.#queue.length === 0) {
            this.#isShowing = false;
            return;
        }

        this.#isShowing = true;
        const { message, duration, icon, className } = this.#queue.shift();
        const toast = this.#createToast(message, icon, className);

        this.#container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });

        await new Promise(resolve => setTimeout(resolve, duration));

        toast.classList.add('translate-x-full');
        await new Promise(resolve => setTimeout(resolve, 300));
        toast.remove();

        await this.#processQueue();
    }

    static #createToast(message, icon, className) {
        const template = document.createElement('template');
        template.innerHTML = this.#template.trim();
        const toast = template.content.firstChild;

        toast.classList.add(className);
        toast.querySelector('.toast-message').textContent = message;
        toast.querySelector('.toast-icon').textContent = icon;

        return toast;
    }
}

// Toast sistemini başlat
document.addEventListener('DOMContentLoaded', () => Toast.init()); 
