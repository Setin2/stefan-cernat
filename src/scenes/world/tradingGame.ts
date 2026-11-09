import type { TankContext } from "../tank/context";
import { UI } from "../ui/style";
import { createMinigameHud } from "../ui/minigameHud";
import { roundRect } from "./infoStand";
import { TICKER_TEXT, type CoreSignal, type WorkCorner } from "./workCorner";

/**
 * Quantum Trader, the work corner's minigame: a 45-second trading round played with the tank.
 *
 * - Shoot BUY or SELL (the big buttons in front of the board) to start. The board turns into a live
 *   price chart.
 * - Shoot BUY to buy (or to close a short), SELL to sell short (or to close a long). Each trade is
 *   SHARES shares; profit is counted when a position is closed, and an open position is closed
 *   when time runs out.
 * - The market moves in trends that switch every few seconds. Shortly before a switch, the quantum
 *   core lights up mint (going up) or pink (going down): a "quantum-inspired" forecast, right
 *   SIGNAL_ACCURACY of the time. Trading with it is how you score.
 *
 * The best result is remembered in the browser.
 */

const ROUND_SECONDS = 45;
const SHARES = 100;
const START_PRICE = 100;
/** Trend speeds (price per second) and how long a trend lasts. */
const TREND_SPEED = 2.6;
const TREND_SECONDS = { min: 2.8, max: 4.6 };
/** Random wobble on top of the trend. */
const NOISE = 1.3;
/** How long before a trend change the core shows its forecast, and how often it's right. */
const SIGNAL_LEAD = 1.5;
const SIGNAL_ACCURACY = 0.8;
/** The forecast stays on this long into the new trend. */
const SIGNAL_LINGER = 0.6;
/** The card shows up this close to the corner. */
const HUD_DISTANCE = 50;
/**
 * The trading floor: during a round, driving further than this from the corner's centre starts a
 * short countdown (LEAVE_GRACE seconds), and the round is called off unless you come back.
 */
const LEAVE_DISTANCE = 60;
const LEAVE_GRACE = 2;
/** Price samples kept for the chart (one every SAMPLE_SECONDS). */
const SAMPLE_SECONDS = 0.1;
const HISTORY_SAMPLES = 160;
const SCREEN_FPS = 12;
const RESULTS_SECONDS = 8;
/** A shot often bounces off a button and hits it again; ignore repeat hits within this time. */
const PRESS_COOLDOWN = 0.5;
const BEST_KEY = "quantum-trader-best";

type State = "idle" | "playing" | "results";
type Trend = "up" | "down" | "flat";
type Trade = { sample: number; kind: "buy" | "sell" };

const COLORS = {
    background: UI.navyDeep,
    grid: "#33475C",
    line: UI.cream,
    up: UI.mint,
    down: UI.pink,
    muted: "#8FA1B3",
    gold: UI.gold,
};

export async function createTradingGame(context: TankContext, corner: WorkCorner): Promise<void> {
    const { scene, tank, sounds } = context;
    const gui = await import("@babylonjs/gui");
    if (scene.isDisposed) {
        return;
    }
    const hud = createMinigameHud(gui, scene, "trading");
    const { board, buttons, setSignal } = corner;
    const soundAt = corner.center;

    let state: State = "idle";
    let best = loadBest();
    let timeLeft = 0;
    let resultsLeft = 0;
    let price = START_PRICE;
    let trend: Trend = "flat";
    let trendLeft = 0;
    let nextTrend: Trend | null = null;
    let signal: CoreSignal = "none";
    let signalLeft = 0;
    let position = 0;
    let entry = 0;
    let realized = 0;
    let finalResult = 0;
    let newBest = false;
    let message = "";
    let messageLeft = 0;
    let sampleTimer = 0;
    let sampleCount = 0;
    let screenTimer = 0;
    const history: number[] = [];
    const trades: Trade[] = [];
    const pressedAt = { buy: -Infinity, sell: -Infinity };
    let clock = 0;
    let awayFor = 0;

    const idleTicker = () => (best !== null
        ? `QUANTUM TRADER   ▲   SHOOT BUY OR SELL TO PLAY   ▲   BEST ${formatMoney(best)}   ▲   `
        : `QUANTUM TRADER   ▲   SHOOT BUY OR SELL TO PLAY   ▲   ${TICKER_TEXT}`);
    board.setTicker(idleTicker());

    const flash = (text: string) => {
        message = text;
        messageLeft = 2.2;
    };
    const openProfit = () => (position === 0 ? 0 : position * (price - entry) * SHARES);

    const startRound = () => {
        state = "playing";
        timeLeft = ROUND_SECONDS;
        price = START_PRICE;
        trend = "flat";
        trendLeft = 1.5;
        nextTrend = null;
        signal = "none";
        signalLeft = 0;
        position = 0;
        realized = 0;
        history.length = 0;
        trades.length = 0;
        sampleCount = 0;
        sampleTimer = 0;
        for (let i = 0; i < 20; i++) {
            history.push(START_PRICE + ((Math.random() - 0.5) * 0.6));
        }
        flash("Market open! Watch the quantum core.");
        board.setTicker("BUY LOW   ▲   SELL HIGH   ▲   WATCH THE QUANTUM CORE   ▲   MINT MEANS UP, PINK MEANS DOWN   ▲   ");
        board.showScreen(true);
        sounds.trade("start", soundAt);
    };

    const closePosition = () => {
        const profit = openProfit();
        realized += profit;
        position = 0;
        return profit;
    };

    const endRound = (cancelled: boolean) => {
        setSignal("none");
        if (cancelled) {
            state = "idle";
            board.showScreen(false);
            board.setTicker(idleTicker());
            return;
        }
        closePosition();
        finalResult = realized;
        newBest = best === null || finalResult > best;
        if (newBest) {
            best = finalResult;
            saveBest(finalResult);
        }
        state = "results";
        resultsLeft = RESULTS_SECONDS;
        drawResults();
        sounds.trade("end", soundAt);
    };

    const trade = (kind: "buy" | "sell") => {
        const direction = kind === "buy" ? 1 : -1;
        if (position === direction) {
            flash(kind === "buy" ? "Already holding. Shoot SELL to take profit!" : "Already short. Shoot BUY to close it!");
            return;
        }
        trades.push({ sample: sampleCount, kind });
        if (position === 0) {
            position = direction;
            entry = price;
            flash(`${kind === "buy" ? "Bought" : "Sold short"} ${SHARES} at ${price.toFixed(2)}`);
            sounds.trade(kind, soundAt);
            return;
        }
        const profit = closePosition();
        flash(`Closed for ${formatMoney(profit)}`);
        sounds.trade(profit >= 0 ? "profit" : "loss", soundAt);
    };

    const press = (kind: "buy" | "sell") => {
        if (clock - pressedAt[kind] < PRESS_COOLDOWN) {
            return;
        }
        pressedAt[kind] = clock;
        buttons[kind].press();
        if (state === "playing") {
            trade(kind);
        } else if (state === "idle" || resultsLeft < RESULTS_SECONDS - 1.5) {
            startRound();
        }
    };
    buttons.buy.onHit.add(() => press("buy"));
    buttons.sell.onHit.add(() => press("sell"));

    // ----- Market

    const pickTrend = (): Trend => {
        const roll = Math.random();
        // Keep the price roughly in range: lean towards trends that bring it back.
        const lean = Math.max(-0.25, Math.min(0.25, (START_PRICE - price) / 60));
        return roll < 0.4 + lean ? "up" : roll < 0.8 ? "down" : "flat";
    };
    const forecast = (actual: Trend): CoreSignal => {
        const right = Math.random() < SIGNAL_ACCURACY;
        if (actual === "flat") {
            return right ? "none" : Math.random() < 0.5 ? "up" : "down";
        }
        return right ? actual : actual === "up" ? "down" : "up";
    };

    const stepMarket = (dt: number) => {
        trendLeft -= dt;
        if (nextTrend === null && trendLeft <= SIGNAL_LEAD) {
            nextTrend = pickTrend();
            signal = forecast(nextTrend);
            signalLeft = trendLeft + SIGNAL_LINGER;
            setSignal(signal);
        }
        if (trendLeft <= 0) {
            trend = nextTrend ?? pickTrend();
            nextTrend = null;
            trendLeft = TREND_SECONDS.min + (Math.random() * (TREND_SECONDS.max - TREND_SECONDS.min));
        }
        if (signalLeft > 0) {
            signalLeft -= dt;
            if (signalLeft <= 0) {
                signal = "none";
                setSignal("none");
            }
        }
        const drift = trend === "up" ? TREND_SPEED : trend === "down" ? -TREND_SPEED : 0;
        price = Math.max(5, price + (drift * dt) + (gaussian() * NOISE * Math.sqrt(dt)));

        sampleTimer += dt;
        while (sampleTimer >= SAMPLE_SECONDS) {
            sampleTimer -= SAMPLE_SECONDS;
            sampleCount++;
            history.push(price);
            if (history.length > HISTORY_SAMPLES) {
                history.shift();
            }
        }
    };

    // ----- Screen

    const { screen, screenSize, updateScreen } = board;
    const W = screenSize.width;
    const H = screenSize.height;
    const font = (size: number) => `900 ${size}px ${UI.font}`;

    const drawChart = () => {
        screen.fillStyle = COLORS.background;
        screen.fillRect(0, 0, W, H);
        screen.textBaseline = "middle";

        // Header: title, forecast and clock.
        screen.textAlign = "left";
        screen.fillStyle = COLORS.line;
        screen.font = font(34);
        screen.fillText("QUANTUM TRADER", 36, 44);
        screen.textAlign = "right";
        screen.fillStyle = timeLeft < 10 ? COLORS.down : COLORS.gold;
        screen.font = font(40);
        screen.fillText(formatTime(timeLeft), W - 36, 44);
        const signalText = signal === "up" ? "SIGNAL ▲" : signal === "down" ? "SIGNAL ▼" : "SIGNAL —";
        screen.fillStyle = signal === "up" ? COLORS.up : signal === "down" ? COLORS.down : COLORS.muted;
        screen.font = font(30);
        screen.textAlign = "center";
        screen.fillText(signalText, W * 0.62, 44);

        // Chart.
        const left = 36;
        const right = W - 170;
        const top = 92;
        const bottom = H - 86;
        let low = Infinity;
        let high = -Infinity;
        for (const value of history) {
            low = Math.min(low, value);
            high = Math.max(high, value);
        }
        if (position !== 0) {
            low = Math.min(low, entry);
            high = Math.max(high, entry);
        }
        const padding = Math.max(1.5, (high - low) * 0.15);
        low -= padding;
        high += padding;
        const toY = (value: number) => bottom - (((value - low) / (high - low)) * (bottom - top));
        const toX = (index: number) => left + ((index / (HISTORY_SAMPLES - 1)) * (right - left));
        const offset = HISTORY_SAMPLES - history.length;

        screen.strokeStyle = COLORS.grid;
        screen.lineWidth = 2;
        for (let i = 0; i <= 4; i++) {
            const y = top + ((i / 4) * (bottom - top));
            screen.beginPath();
            screen.moveTo(left, y);
            screen.lineTo(right, y);
            screen.stroke();
        }

        if (position !== 0) {
            screen.setLineDash([14, 10]);
            screen.strokeStyle = position > 0 ? COLORS.up : COLORS.down;
            screen.lineWidth = 3;
            screen.beginPath();
            screen.moveTo(left, toY(entry));
            screen.lineTo(right, toY(entry));
            screen.stroke();
            screen.setLineDash([]);
        }

        const rising = history.length > 1 && history[history.length - 1] >= history[Math.max(0, history.length - 30)];
        screen.strokeStyle = rising ? COLORS.up : COLORS.down;
        screen.lineWidth = 6;
        screen.lineJoin = "round";
        screen.beginPath();
        history.forEach((value, i) => {
            const x = toX(i + offset);
            const y = toY(value);
            if (i === 0) {
                screen.moveTo(x, y);
            } else {
                screen.lineTo(x, y);
            }
        });
        screen.stroke();

        // Trade markers: triangles under (buy) or over (sell) the line.
        const firstSample = sampleCount - history.length + 1;
        for (const t of trades) {
            const index = t.sample - firstSample;
            if (index < 0 || index >= history.length) {
                continue;
            }
            const x = toX(index + offset);
            const y = toY(history[index]);
            const up = t.kind === "buy";
            screen.fillStyle = up ? COLORS.up : COLORS.down;
            screen.beginPath();
            screen.moveTo(x, y + (up ? 14 : -14));
            screen.lineTo(x - 13, y + (up ? 36 : -36));
            screen.lineTo(x + 13, y + (up ? 36 : -36));
            screen.closePath();
            screen.fill();
        }

        // Current price tag.
        const tagY = toY(price);
        screen.fillStyle = rising ? COLORS.up : COLORS.down;
        roundRect(screen, right + 12, tagY - 24, 140, 48, 12);
        screen.fill();
        screen.fillStyle = COLORS.background;
        screen.font = font(30);
        screen.textAlign = "center";
        screen.fillText(price.toFixed(2), right + 82, tagY + 2);

        // Footer: profit and position.
        const total = realized + openProfit();
        screen.textAlign = "left";
        screen.font = font(36);
        screen.fillStyle = total >= 0 ? COLORS.up : COLORS.down;
        screen.fillText(`P&L ${formatMoney(total)}`, 36, H - 42);
        screen.textAlign = "right";
        screen.font = font(30);
        screen.fillStyle = position === 0 ? COLORS.muted : position > 0 ? COLORS.up : COLORS.down;
        screen.fillText(positionText(position, entry), W - 36, H - 42);
        updateScreen();
    };

    const drawResults = () => {
        screen.fillStyle = COLORS.background;
        screen.fillRect(0, 0, W, H);
        screen.textAlign = "center";
        screen.textBaseline = "middle";
        screen.fillStyle = COLORS.gold;
        screen.font = font(40);
        screen.fillText(newBest ? "NEW BEST!" : "MARKET CLOSED", W / 2, H * 0.2);
        screen.fillStyle = finalResult >= 0 ? COLORS.up : COLORS.down;
        screen.font = font(120);
        screen.fillText(formatMoney(finalResult), W / 2, H * 0.47);
        screen.fillStyle = COLORS.line;
        screen.font = font(32);
        screen.fillText(best !== null ? `Best ${formatMoney(best)}` : "", W / 2, H * 0.7);
        screen.fillStyle = COLORS.muted;
        screen.font = font(28);
        screen.fillText("Shoot BUY or SELL to play again", W / 2, H * 0.86);
        updateScreen();
    };

    // ----- Loop

    scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1);
        clock += dt;
        const distance = Math.hypot(tank.position.x - corner.center.x, tank.position.z - corner.center.z);

        awayFor = distance > LEAVE_DISTANCE ? awayFor + dt : 0;
        if (state === "playing") {
            if (awayFor > LEAVE_GRACE) {
                endRound(true);
                flash("Round called off: you left the trading floor.");
                messageLeft = 3.5;
            } else {
                timeLeft -= dt;
                stepMarket(dt);
                messageLeft -= dt;
                screenTimer -= dt;
                if (screenTimer <= 0) {
                    screenTimer = 1 / SCREEN_FPS;
                    drawChart();
                }
                if (timeLeft <= 0) {
                    endRound(false);
                }
            }
        } else if (state === "results") {
            resultsLeft -= dt;
            if (resultsLeft <= 0 || awayFor > LEAVE_GRACE) {
                state = "idle";
                board.showScreen(false);
                board.setTicker(idleTicker());
            }
        }

        messageLeft -= state === "playing" ? 0 : dt;
        const showHud = state !== "idle" || distance < HUD_DISTANCE || messageLeft > 0;
        hud.setVisible(showHud);
        if (!showHud) {
            return;
        }
        if (state === "idle" && messageLeft > 0) {
            hud.set("QUANTUM TRADER", UI.pinkDeep, "Round called off", "You left the trading floor. Come back and shoot BUY or SELL to play again.");
        } else if (state === "playing" && awayFor > 0) {
            hud.set(`TRADING  ${formatTime(timeLeft)}`, UI.pinkDeep, "Come back!",
                `Leaving the trading floor ends the round in ${Math.max(0, LEAVE_GRACE - awayFor).toFixed(1)} s.`, UI.pinkDeep);
        } else if (state === "idle") {
            hud.set("QUANTUM TRADER", UI.navy, "Shoot BUY or SELL to play",
                `Buy low, sell high in ${ROUND_SECONDS} s. The quantum core glows mint or pink when it senses the market turning.${best !== null ? ` Best: ${formatMoney(best)}` : ""}`);
        } else if (state === "playing") {
            const total = realized + openProfit();
            const signalHint = signal === "up" ? "Core says UP: buy!" : signal === "down" ? "Core says DOWN: sell!" : "";
            hud.set(`TRADING  ${formatTime(timeLeft)}`, timeLeft < 10 ? UI.pinkDeep : UI.gold, `P&L ${formatMoney(total)}`,
                messageLeft > 0 ? message : signalHint || positionText(position, entry),
                total >= 0 ? "#3E9C6E" : UI.pinkDeep);
        } else {
            hud.set(newBest ? "NEW BEST!" : "MARKET CLOSED", UI.mint, formatMoney(finalResult),
                `${best !== null ? `Best ${formatMoney(best)}. ` : ""}Shoot BUY or SELL to play again.`,
                finalResult >= 0 ? "#3E9C6E" : UI.pinkDeep);
        }
    });

}

function positionText(position: number, entry: number): string {
    if (position === 0) {
        return "No position. Shoot BUY or SELL to trade.";
    }
    return `${position > 0 ? "LONG" : "SHORT"} ${SHARES} @ ${entry.toFixed(2)}`;
}

function formatMoney(value: number): string {
    const rounded = Math.round(value);
    return `${rounded < 0 ? "−" : "+"}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

function formatTime(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));
    return `0:${whole.toString().padStart(2, "0")}`;
}

function gaussian(): number {
    // Box-Muller.
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function loadBest(): number | null {
    try {
        const stored = window.localStorage.getItem(BEST_KEY);
        const value = stored === null ? NaN : Number(stored);
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

function saveBest(value: number): void {
    try {
        window.localStorage.setItem(BEST_KEY, String(Math.round(value)));
    } catch {
        // Private mode or blocked storage: the best score just isn't remembered.
    }
}
