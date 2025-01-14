import { EventBus } from '../../core/events.js';

export class Dialog {
    static #template = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-200">
            <div class="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform scale-95 transition-transform duration-200">
                <div class="p-6">
                    <div class="mb-4">
                        <h3 class="text-xl font-bold text-white dialog-title"></h3>
                        <p class="text-gray-300 mt-2 dialog-message"></p>
                    </div>
                    <div class="flex justify-end space-x-2">
                        <button class="dialog-cancel px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                            İptal
                        </button>
                        <button class="dialog-confirm px-4 py-2 rounded-lg text-white transition-colors">
                            Tamam
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    static #container = null;
    static #currentDialog = null;

    static init() {
        this.#container = document.getElementById('dialogs');
    }

    static async show({
        title,
        message,
        confirmText = 'Tamam',
        cancelText = 'İptal',
        showCancel = true,
        type = 'info' // 'info', 'warning', 'error', 'success'
    }) {
        if (this.#currentDialog) {
            await this.#destroyCurrentDialog();
        }

        const dialog = this.#createDialog();
        this.#currentDialog = dialog;

        dialog.querySelector('.dialog-title').textContent = title;
        dialog.querySelector('.dialog-message').textContent = message;

        const confirmBtn = dialog.querySelector('.dialog-confirm');
        const cancelBtn = dialog.querySelector('.dialog-cancel');

        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        cancelBtn.style.display = showCancel ? 'block' : 'none';

        // Dialog tipine göre stil ayarları
        const buttonStyles = {
            info: 'bg-blue-500 hover:bg-blue-600',
            warning: 'bg-yellow-500 hover:bg-yellow-600',
            error: 'bg-red-500 hover:bg-red-600',
            success: 'bg-green-500 hover:bg-green-600'
        };
        confirmBtn.className = `dialog-confirm px-4 py-2 rounded-lg text-white transition-colors ${buttonStyles[type]}`;

        return new Promise((resolve) => {
            const handleConfirm = () => {
                this.#hideAndDestroy(dialog);
                resolve(true);
            };

            const handleCancel = () => {
                this.#hideAndDestroy(dialog);
                resolve(false);
            };

            confirmBtn.addEventListener('click', handleConfirm, { once: true });
            cancelBtn.addEventListener('click', handleCancel, { once: true });

            // ESC tuşu ile kapatma
            const handleKeydown = (e) => {
                if (e.key === 'Escape' && showCancel) {
                    handleCancel();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // Dışarı tıklama ile kapatma
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog && showCancel) {
                    handleCancel();
                }
            });

            this.#container.appendChild(dialog);
            requestAnimationFrame(() => {
                dialog.classList.remove('opacity-0');
                dialog.querySelector('.bg-gray-800').classList.remove('scale-95');
            });
        });
    }

    static #createDialog() {
        const template = document.createElement('template');
        template.innerHTML = this.#template.trim();
        return template.content.firstChild;
    }

    static async #hideAndDestroy(dialog) {
        dialog.classList.add('opacity-0');
        dialog.querySelector('.bg-gray-800').classList.add('scale-95');
        await new Promise(resolve => setTimeout(resolve, 200));
        dialog.remove();
        this.#currentDialog = null;
    }

    static async #destroyCurrentDialog() {
        if (!this.#currentDialog) return;
        await this.#hideAndDestroy(this.#currentDialog);
    }
}

// Dialog sistemini başlat
document.addEventListener('DOMContentLoaded', () => Dialog.init()); 