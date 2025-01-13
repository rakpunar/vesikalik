// debug.js
export class DebugLogger {
    constructor() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            max-height: 200px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            overflow-y: auto;
            z-index: 9999;
        `;

        // Kontrol paneli container'ı
        this.controlPanel = document.createElement('div');
        this.controlPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 10000;
            display: flex;
            gap: 8px;
        `;

        // Debug Log butonu
        this.toggleButton = this.createButton('Debug Log', '#007bff');

        // Temizle butonu
        this.clearButton = this.createButton('🗑️ Temizle', '#dc3545');
        this.clearButton.addEventListener('click', () => this.clear());

        // Kopyala butonu
        this.copyButton = this.createButton('📋 Kopyala', '#28a745');
        this.copyButton.addEventListener('click', () => this.copyLogs());

        // Butonları panel'e ekle
        this.controlPanel.appendChild(this.copyButton);
        this.controlPanel.appendChild(this.clearButton);
        this.controlPanel.appendChild(this.toggleButton);

        this.isVisible = false;
        this.toggleButton.addEventListener('click', () => this.toggle());

        // Log container'ını ve kontrol panelini body'e ekle
        document.body.appendChild(this.container);
        document.body.appendChild(this.controlPanel);
        this.hide();

        // Orijinal console metodlarını kaydet
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };

        // Console metodlarını override et
        console.log = (...args) => this.log('log', ...args);
        console.error = (...args) => this.log('error', ...args);
        console.warn = (...args) => this.log('warn', ...args);

        // Log array'i
        this.logs = [];
    }

    createButton(text, bgColor) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 5px 10px;
            background: ${bgColor};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        `;
        return button;
    }

    log(type, ...args) {
        // Orijinal console'u çalıştır
        this.originalConsole[type].apply(console, args);

        const entry = document.createElement('div');
        entry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        entry.style.padding = '4px 0';

        // Timestamp ekle
        const time = new Date().toLocaleTimeString();
        const timestamp = `[${time}]`;
        entry.innerHTML = `<span style="color: #888">${timestamp}</span> `;

        // Log tipine göre renk belirle
        switch (type) {
            case 'error':
                entry.style.color = '#ff4444';
                break;
            case 'warn':
                entry.style.color = '#ffbb33';
                break;
            default:
                entry.style.color = '#ffffff';
        }

        // Argümanları formatla ve log array'ine ekle
        let logText = timestamp + ' ';
        args.forEach(arg => {
            if (typeof arg === 'object') {
                const formatted = JSON.stringify(arg, null, 2);
                entry.innerHTML += '<br>' + formatted.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
                logText += formatted;
            } else {
                entry.innerHTML += arg + ' ';
                logText += arg + ' ';
            }
        });

        this.logs.push({ type, text: logText });
        this.container.appendChild(entry);
        this.container.scrollTop = this.container.scrollHeight;
    }

    async copyLogs() {
        try {
            const logText = this.logs.map(log => log.text).join('\n');
            await navigator.clipboard.writeText(logText);

            // Kopyalama başarılı animasyonu
            const originalText = this.copyButton.textContent;
            this.copyButton.textContent = '✓ Kopyalandı';
            this.copyButton.style.background = '#198754';

            setTimeout(() => {
                this.copyButton.textContent = originalText;
                this.copyButton.style.background = '#28a745';
            }, 2000);
        } catch (err) {
            // Kopyalama başarısız animasyonu
            const originalText = this.copyButton.textContent;
            this.copyButton.textContent = '❌ Hata';
            this.copyButton.style.background = '#dc3545';

            setTimeout(() => {
                this.copyButton.textContent = originalText;
                this.copyButton.style.background = '#28a745';
            }, 2000);
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    clear() {
        this.container.innerHTML = '';
        this.logs = [];

        // Temizleme başarılı animasyonu
        const originalText = this.clearButton.textContent;
        this.clearButton.textContent = '✓ Temizlendi';

        setTimeout(() => {
            this.clearButton.textContent = originalText;
        }, 2000);
    }
}
