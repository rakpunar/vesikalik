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
        
        // Minimize/Maximize butonu
        this.toggleButton = document.createElement('button');
        this.toggleButton.textContent = 'Debug Log';
        this.toggleButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
        `;
        
        this.isVisible = false;
        this.toggleButton.addEventListener('click', () => this.toggle());
        
        document.body.appendChild(this.toggleButton);
        document.body.appendChild(this.container);
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
    }
    
    log(type, ...args) {
        // Orijinal console'u da çalıştır
        this.originalConsole[type].apply(console, args);
        
        const entry = document.createElement('div');
        entry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        entry.style.padding = '4px 0';
        
        // Timestamp ekle
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span style="color: #888">[${time}]</span> `;
        
        // Log tipine göre renk belirle
        switch(type) {
            case 'error':
                entry.style.color = '#ff4444';
                break;
            case 'warn':
                entry.style.color = '#ffbb33';
                break;
            default:
                entry.style.color = '#ffffff';
        }
        
        // Argümanları formatla
        args.forEach(arg => {
            if (typeof arg === 'object') {
                entry.innerHTML += '<br>' + JSON.stringify(arg, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
            } else {
                entry.innerHTML += arg + ' ';
            }
        });
        
        this.container.appendChild(entry);
        this.container.scrollTop = this.container.scrollHeight;
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
    }
}
