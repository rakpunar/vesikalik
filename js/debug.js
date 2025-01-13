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
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        `;

        // Kontrol paneli container'ı
        this.controlPanel = document.createElement('div');
        this.controlPanel.style.cssText = `
            position: fixed;
            bottom: env(safe-area-inset-bottom, 10px);
            right: env(safe-area-inset-right, 10px);
            z-index: 10000;
            display: flex;
            gap: 8px;
        `;

        // Debug Log butonu
        this.toggleButton = this.createButton('Debug Log', '#007bff');
        this.clearButton = this.createButton('Temizle', '#dc3545');
        this.exportButton = this.createButton('Dışa Aktar', '#28a745');
        this.shareButton = this.createButton('Paylaş', '#17a2b8');

        this.controlPanel.appendChild(this.toggleButton);
        this.controlPanel.appendChild(this.clearButton);
        this.controlPanel.appendChild(this.exportButton);
        this.controlPanel.appendChild(this.shareButton);

        document.body.appendChild(this.container);
        document.body.appendChild(this.controlPanel);

        this.logs = [];
        this.isVisible = false;
        this.hide();

        // Event listener'ları ekle
        this.setupEventListeners();

        // PWA için performans izleme
        this.setupPerformanceMonitoring();
    }

    createButton(text, color) {
        const button = document.createElement('button');
        button.style.cssText = `
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: ${color};
            color: white;
            font-size: 12px;
            cursor: pointer;
            transition: opacity 0.3s;
            touch-action: manipulation;
        `;
        button.textContent = text;
        return button;
    }

    setupEventListeners() {
        this.toggleButton.onclick = () => this.toggle();
        this.clearButton.onclick = () => this.clear();
        this.exportButton.onclick = () => this.exportLogs();
        this.shareButton.onclick = () => this.shareLogs();

        // PWA için dokunma geri bildirimi
        if ('vibrate' in navigator) {
            [this.toggleButton, this.clearButton, this.exportButton, this.shareButton].forEach(button => {
                button.addEventListener('touchstart', () => {
                    navigator.vibrate(1);
                });
            });
        }

        // PWA için hardware back button
        window.addEventListener('popstate', () => {
            if (this.isVisible) {
                this.hide();
                history.pushState(null, '');
            }
        });
    }

    setupPerformanceMonitoring() {
        // PWA performans metrikleri
        if ('performance' in window) {
            // Sayfa yükleme performansı
            window.addEventListener('load', () => {
                const timing = performance.getEntriesByType('navigation')[0];
                this.log('Performance', {
                    loadTime: timing.loadEventEnd - timing.navigationStart,
                    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
                    firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
                });
            });

            // Memory kullanımı
            if (performance.memory) {
                setInterval(() => {
                    this.log('Memory', {
                        usedJSHeapSize: this.formatBytes(performance.memory.usedJSHeapSize),
                        totalJSHeapSize: this.formatBytes(performance.memory.totalJSHeapSize)
                    });
                }, 30000);
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    log(type, ...args) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            type,
            data: args
        };

        this.logs.push(logEntry);
        if (this.isVisible) {
            this.render(logEntry);
        }

        // PWA için konsol senkronizasyonu
        console.log(`[${timestamp}] ${type}`, ...args);
    }

    render(logEntry) {
        const logElement = document.createElement('div');
        logElement.style.marginBottom = '5px';
        logElement.innerHTML = `
            <span style="color: #888">[${logEntry.timestamp}]</span>
            <span style="color: #4CAF50">${logEntry.type}</span>:
            <span>${JSON.stringify(logEntry.data, null, 2)}</span>
        `;
        this.container.appendChild(logElement);
        this.container.scrollTop = this.container.scrollHeight;
    }

    async exportLogs() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `debug_logs_${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async shareLogs() {
        try {
            const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
            const file = new File([blob], `debug_logs_${new Date().toISOString()}.json`, { type: 'application/json' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Debug Logs',
                    text: 'Vesikalık uygulaması debug logları'
                });
            } else {
                // Paylaşım desteklenmiyorsa indirme yap
                this.exportLogs();
            }
        } catch (error) {
            console.error('Log paylaşımı başarısız:', error);
            this.exportLogs();
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
        history.pushState(null, '');
        // Tüm logları render et
        this.container.innerHTML = '';
        this.logs.forEach(log => this.render(log));
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
        if ('vibrate' in navigator) navigator.vibrate([50]);

        setTimeout(() => {
            this.clearButton.textContent = originalText;
        }, 2000);
    }
}
