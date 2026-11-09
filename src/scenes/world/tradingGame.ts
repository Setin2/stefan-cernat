import type { TankContext } from "../tank/context";
import { UI } from "../ui/style";
import { createMinigameHud } from "../ui/minigameHud";
import { roundRect } from "./infoStand";
import { formatClock, loadBest, saveBest } from "./minigameScores";
import { formatMoney, Market, MARKET, Portfolio, SHARES, type TradeKind } from "./tradingMarket";
import { TICKER_TEXT, type WorkCorner } from "./workCorner";

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
 *   most of the time. Trading with it is how you score.
 *
 * The rules (market, forecast, trades) are in tradingMarket.ts; this file is the game around
 * them: buttons, screen, HUD and sounds. The best result is remembered in the browser.
 */

const ROUND_SECONDS = 45;
/** The card shows up this close to the corner. */
const HUD_DISTANCE = 50;
/**
 * The trading floor: during a round, driving further than this from the corner's centre starts a
 * short countdown (LEAVE_GRACE seconds), and the round is called off unless you come back.
 */
const LEAVE_DISTANCE = 60;
const LEAVE_GRACE = 2;
const SCREEN_FPS = 12;
const RESULTS_SECONDS = 8;
/** A shot often bounces off a button and hits it again; ignore repeat hits within this time. */
const PRESS_COOLDOWN = 0.5;
const BEST_KEY = "quantum-trader-best";

type State = "idle" | "playing" | "results";
type Trade = { sample: number; kind: TradeKind };

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

    const market = new Market();
    market.onSignal = setSignal;
    const portfolio = new Portfolio();
    let state: State = "idle";
    let best = loadBest(BEST_KEY);
    let timeLeft = 0;
    let resultsLeft = 0;
    let finalResult = 0;
    let newBest = false;
    let message = "";
    let messageLeft = 0;
    let screenTimer = 0;
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
    const startRound = () => {
        state = "playing";
        timeLeft = ROUND_SECONDS;
        market.reset();
        portfolio.reset();
        trades.length = 0;
        flash("Market open! Watch the quantum core.");
        board.setTicker("BUY LOW   ▲   SELL HIGH   ▲   WATCH THE QUANTUM CORE   ▲   MINT MEANS UP, PINK MEANS DOWN   ▲   ");
        board.showScreen(true);
        sounds.trade("start", soundAt);
    };

    const endRound = (cancelled: boolean) => {
        setSignal("none");
        if (cancelled) {
            state = "idle";
            board.showScreen(false);
            board.setTicker(idleTicker());
            return;
        }
        portfolio.close(market.price);
        finalResult = portfolio.realized;
        newBest = best === null || finalResult > best;
        if (newBest) {
            best = finalResult;
            saveBest(BEST_KEY, finalResult);
        }
        state = "results";
        resultsLeft = RESULTS_SECONDS;
        drawResults();
        sounds.trade("end", soundAt);
    };

    const trade = (kind: TradeKind) => {
        const result = portfolio.trade(kind, market.price);
        if (result.outcome === "ignored") {
            flash(kind === "buy" ? "Already holding. Shoot SELL to take profit!" : "Already short. Shoot BUY to close it!");
            return;
        }
        trades.push({ sample: market.sampleCount, kind });
        if (result.outcome === "opened") {
            flash(`${kind === "buy" ? "Bought" : "Sold short"} ${SHARES} at ${result.price.toFixed(2)}`);
            sounds.trade(kind, soundAt);
        } else {
            flash(`Closed for ${formatMoney(result.profit)}`);
            sounds.trade(result.profit >= 0 ? "profit" : "loss", soundAt);
        }
    };

    const press = (kind: TradeKind) => {
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

    // ----- Screen

    const { screen, screenSize, updateScreen } = board;
    const W = screenSize.width;
    const H = screenSize.height;
    const font = (size: number) => `900 ${size}px ${UI.font}`;

    const drawChart = () => {
        const { price, history, sampleCount, signal } = market;
        const { position, entry } = portfolio;
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
        screen.fillText(formatClock(timeLeft), W - 36, 44);
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
        const toX = (index: number) => left + ((index / (MARKET.historySamples - 1)) * (right - left));
        const offset = MARKET.historySamples - history.length;

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
        const total = portfolio.total(price);
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
                market.step(dt);
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
            hud.set(`TRADING  ${formatClock(timeLeft)}`, UI.pinkDeep, "Come back!",
                `Leaving the trading floor ends the round in ${Math.max(0, LEAVE_GRACE - awayFor).toFixed(1)} s.`, UI.pinkDeep);
        } else if (state === "idle") {
            hud.set("QUANTUM TRADER", UI.navy, "Shoot BUY or SELL to play",
                `Buy low, sell high in ${ROUND_SECONDS} s. The quantum core glows mint or pink when it senses the market turning.${best !== null ? ` Best: ${formatMoney(best)}` : ""}`);
        } else if (state === "playing") {
            const total = portfolio.total(market.price);
            const signal = market.signal;
            const signalHint = signal === "up" ? "Core says UP: buy!" : signal === "down" ? "Core says DOWN: sell!" : "";
            hud.set(`TRADING  ${formatClock(timeLeft)}`, timeLeft < 10 ? UI.pinkDeep : UI.gold, `P&L ${formatMoney(total)}`,
                messageLeft > 0 ? message : signalHint || positionText(portfolio.position, portfolio.entry),
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
