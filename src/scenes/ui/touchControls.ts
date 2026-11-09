import type { TankInput } from "../tank/input";
import { UI } from "./style";
import { prefersTouch } from "./device";

/**
 * On-screen controls for phones and tablets: a joystick at the bottom left (push up to drive, down
 * to reverse, sideways to turn; a small push drives slowly) and a FIRE button at the bottom right.
 * They show up on touch-first devices straight away, and on anything else as soon as the screen
 * is touched (a laptop with a touch screen).
 *
 * Plain HTML on top of the canvas, so they stay crisp and respond to several fingers at once.
 */

/** How far the knob can move from the centre, in pixels. */
const STICK_RANGE = 46;
/** Pushes smaller than this (as a fraction of the range) count as nothing. */
const DEAD_ZONE = 0.15;

const STYLE = `
.touch-controls { position: fixed; inset: auto 0 0 0; height: 0; z-index: 15; pointer-events: none; }
.touch-controls[hidden] { display: none; }
.touch-stick, .touch-fire {
    position: fixed; bottom: calc(24px + env(safe-area-inset-bottom)); pointer-events: auto;
    touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.touch-stick {
    left: calc(24px + env(safe-area-inset-left)); width: 132px; height: 132px; border-radius: 50%;
    background: rgba(244, 235, 221, 0.35); border: 3px solid ${UI.navy}; box-shadow: 0 4px 0 ${UI.shadow};
}
.touch-knob {
    position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px 0 0 -29px;
    border-radius: 50%; background: ${UI.cream}; border: 3px solid ${UI.navy}; box-shadow: 0 3px 0 ${UI.shadow};
    transition: transform 0.12s ease-out;
}
.touch-stick.is-active .touch-knob { transition: none; }
.touch-fire {
    right: calc(24px + env(safe-area-inset-right)); width: 96px; height: 96px; border-radius: 50%;
    border: 3px solid ${UI.navy}; background: ${UI.pink}; box-shadow: 0 5px 0 ${UI.navyDeep};
    color: ${UI.navyDeep}; font: 900 18px ${UI.font}; letter-spacing: 0.05em;
}
.touch-fire:active, .touch-fire.is-pressed { transform: translateY(3px); box-shadow: 0 2px 0 ${UI.navyDeep}; }
`;

export function createTouchControls(input: TankInput): { dispose: () => void } {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.className = "touch-controls";
    root.hidden = !prefersTouch();
    root.innerHTML = `
        <div class="touch-stick" role="application" aria-label="Joystick: drive the tank"><div class="touch-knob"></div></div>
        <button class="touch-fire" type="button" aria-label="Fire">FIRE</button>`;
    document.body.appendChild(root);
    const stick = root.querySelector<HTMLElement>(".touch-stick")!;
    const knob = root.querySelector<HTMLElement>(".touch-knob")!;
    const fire = root.querySelector<HTMLElement>(".touch-fire")!;

    // ----- Joystick
    let pointerId: number | null = null;
    const moveKnob = (event: PointerEvent) => {
        const rect = stick.getBoundingClientRect();
        let dx = event.clientX - (rect.left + (rect.width / 2));
        let dy = event.clientY - (rect.top + (rect.height / 2));
        const length = Math.hypot(dx, dy);
        if (length > STICK_RANGE) {
            dx *= STICK_RANGE / length;
            dy *= STICK_RANGE / length;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        const deadened = (value: number) => (Math.abs(value) < DEAD_ZONE ? 0 : (value - (Math.sign(value) * DEAD_ZONE)) / (1 - DEAD_ZONE));
        input.move = deadened(-dy / STICK_RANGE);
        input.turn = deadened(dx / STICK_RANGE);
    };
    const release = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) {
            return;
        }
        pointerId = null;
        stick.classList.remove("is-active");
        knob.style.transform = "";
        input.move = 0;
        input.turn = 0;
    };
    stick.addEventListener("pointerdown", (event) => {
        pointerId = event.pointerId;
        stick.setPointerCapture(event.pointerId);
        stick.classList.add("is-active");
        moveKnob(event);
        event.preventDefault();
    });
    stick.addEventListener("pointermove", (event) => {
        if (event.pointerId === pointerId) {
            moveKnob(event);
        }
    });
    stick.addEventListener("pointerup", release);
    stick.addEventListener("pointercancel", release);

    // ----- Fire button
    fire.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        fire.classList.add("is-pressed");
        input.onFire.notifyObservers();
        navigator.vibrate?.(12);
    });
    const unpress = () => fire.classList.remove("is-pressed");
    fire.addEventListener("pointerup", unpress);
    fire.addEventListener("pointercancel", unpress);
    fire.addEventListener("contextmenu", (event) => event.preventDefault());

    // A touch anywhere brings the controls up (touch-screen laptops start without them).
    const showOnTouch = () => {
        root.hidden = false;
    };
    window.addEventListener("touchstart", showOnTouch, { passive: true, once: true });

    return {
        dispose: () => {
            window.removeEventListener("touchstart", showOnTouch);
            root.remove();
            style.remove();
        },
    };
}
