/** Small helpers shared by the minigames: the round clock and the best score kept in the browser. */

/** "0:07" for a clock counting down (whole seconds, rounded up, never negative). */
export function formatClock(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
}

/** The best score saved under `key`, or null if there is none (or storage is blocked). */
export function loadBest(key: string): number | null {
    try {
        const stored = window.localStorage.getItem(key);
        const value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

export function saveBest(key: string, value: number): void {
    try {
        window.localStorage.setItem(key, String(Math.round(value)));
    } catch {
        // Private mode or blocked storage: the best score just isn't remembered.
    }
}
