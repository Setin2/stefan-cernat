/** Whether this is a touch-first device (a phone or tablet) rather than mouse and keyboard. */
export function prefersTouch(): boolean {
    return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}
