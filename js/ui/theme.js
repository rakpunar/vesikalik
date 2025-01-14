export class ThemeManager {
    static init() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        console.log('Initial theme:', savedTheme);
        this.setTheme(savedTheme);
    }

    static toggle() {
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        console.log('Toggling theme to:', newTheme);
        this.setTheme(newTheme);
    }

    static setTheme(theme) {
        // DOM'u güncelle
        document.body.dataset.theme = theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');

        // İkonları güncelle
        const darkIcon = document.querySelector('.dark-icon');
        const lightIcon = document.querySelector('.light-icon');

        if (theme === 'dark') {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        } else {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        }

        // Meta theme color'ı güncelle
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1F2937' : '#FFFFFF');
        }

        // localStorage'a kaydet
        localStorage.setItem('theme', theme);

        // Tema değişikliği olayını yayınla
        window.dispatchEvent(new CustomEvent('theme:changed', {
            detail: theme
        }));

        console.log('Theme set to:', theme, 'Meta color updated, Event dispatched');
    }
}
