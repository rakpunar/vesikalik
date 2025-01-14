export class EventBus {
    static #events = new Map();

    static on(event, callback) {
        if (!this.#events.has(event)) {
            this.#events.set(event, new Set());
        }
        this.#events.get(event).add(callback);
    }

    static emit(event, data) {
        if (!this.#events.has(event)) return;
        this.#events.get(event).forEach(callback => callback(data));
    }

    static off(event, callback) {
        if (!this.#events.has(event)) return;
        if (callback) {
            this.#events.get(event).delete(callback);
        } else {
            this.#events.delete(event);
        }
    }

    static test() {
        try {
            const testEvent = 'test:event';
            let testPassed = false;

            this.on(testEvent, () => testPassed = true);
            this.emit(testEvent);
            this.off(testEvent);

            return testPassed;
        } catch (error) {
            console.error('EventBus test failed:', error);
            return false;
        }
    }
} 