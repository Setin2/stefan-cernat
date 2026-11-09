/**
 * The rules of Quantum Trader (see tradingGame.ts), kept free of Babylon so they can be tested on
 * their own: the simulated market with its "quantum-inspired" forecast, and the player's trades.
 *
 * Randomness comes from a `random` function (Math.random by default), so tests can make it
 * repeatable.
 */

export type Trend = "up" | "down" | "flat";
/** What the quantum core shows: which way it expects the market to go next. */
export type Signal = "up" | "down" | "none";
export type Random = () => number;

export const MARKET = {
    startPrice: 100,
    minPrice: 5,
    /** Trend speeds (price per second) and how long a trend lasts. */
    trendSpeed: 2.6,
    trendSeconds: { min: 2.8, max: 4.6 },
    /** Random wobble on top of the trend. */
    noise: 1.3,
    /** How long before a trend change the forecast shows, how often it's right, how long it stays. */
    signalLead: 1.5,
    signalAccuracy: 0.8,
    signalLinger: 0.6,
    /** Price samples kept for the chart, one every sampleSeconds. */
    sampleSeconds: 0.1,
    historySamples: 160,
};

/** Shares per trade. */
export const SHARES = 100;

/**
 * The next trend: up or down 40% of the time each and flat 20%, leaning towards whichever brings
 * the price back towards its start (at most 25 points of the 40), so it stays in range.
 */
export function pickTrend(price: number, random: Random = Math.random): Trend {
    const lean = Math.max(-0.25, Math.min(0.25, (MARKET.startPrice - price) / 60));
    const roll = random();
    return roll < 0.4 + lean ? "up" : roll < 0.8 ? "down" : "flat";
}

/**
 * The core's forecast of a trend: right `accuracy` of the time. A wrong forecast of an up or down
 * trend says the opposite; a wrong forecast of a flat market says up or down.
 */
export function forecast(actual: Trend, random: Random = Math.random, accuracy = MARKET.signalAccuracy): Signal {
    const right = random() < accuracy;
    if (actual === "flat") {
        return right ? "none" : random() < 0.5 ? "up" : "down";
    }
    return right ? actual : actual === "up" ? "down" : "up";
}

/** A standard normal random number (Box-Muller). */
export function gaussian(random: Random = Math.random): number {
    const u = 1 - random();
    const v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** The simulated market: a price following trends that switch every few seconds, plus noise. */
export class Market {
    public price = MARKET.startPrice;
    public trend: Trend = "flat";
    /** The forecast currently shown. */
    public signal: Signal = "none";
    /** Recent prices for the chart, oldest first. */
    public readonly history: number[] = [];
    /** Samples taken since the round started (for placing trade markers on the chart). */
    public sampleCount = 0;
    /** Called whenever the forecast shown changes. */
    public onSignal: ((signal: Signal) => void) | null = null;

    private trendLeft = 0;
    private nextTrend: Trend | null = null;
    private signalLeft = 0;
    private sampleTimer = 0;

    public constructor(private readonly random: Random = Math.random) {
        this.reset();
    }

    public reset(): void {
        this.price = MARKET.startPrice;
        this.trend = "flat";
        this.trendLeft = 1.5;
        this.nextTrend = null;
        this.setSignal("none");
        this.signalLeft = 0;
        this.sampleTimer = 0;
        this.sampleCount = 0;
        this.history.length = 0;
        // A short flat stretch, so the chart doesn't start empty.
        for (let i = 0; i < 20; i++) {
            this.history.push(MARKET.startPrice + ((this.random() - 0.5) * 0.6));
        }
    }

    /** Seconds until the current trend ends. */
    public get timeToTrendChange(): number {
        return this.trendLeft;
    }

    /** The trend that comes next, once it has been decided (signalLead seconds before it starts). */
    public get upcomingTrend(): Trend | null {
        return this.nextTrend;
    }

    public step(dt: number): void {
        this.trendLeft -= dt;
        if (this.nextTrend === null && this.trendLeft <= MARKET.signalLead) {
            this.nextTrend = pickTrend(this.price, this.random);
            this.signalLeft = this.trendLeft + MARKET.signalLinger;
            this.setSignal(forecast(this.nextTrend, this.random));
        }
        if (this.trendLeft <= 0) {
            this.trend = this.nextTrend ?? pickTrend(this.price, this.random);
            this.nextTrend = null;
            this.trendLeft = MARKET.trendSeconds.min + (this.random() * (MARKET.trendSeconds.max - MARKET.trendSeconds.min));
        }
        if (this.signalLeft > 0) {
            this.signalLeft -= dt;
            if (this.signalLeft <= 0) {
                this.setSignal("none");
            }
        }

        const drift = this.trend === "up" ? MARKET.trendSpeed : this.trend === "down" ? -MARKET.trendSpeed : 0;
        this.price = Math.max(MARKET.minPrice, this.price + (drift * dt) + (gaussian(this.random) * MARKET.noise * Math.sqrt(dt)));

        this.sampleTimer += dt;
        while (this.sampleTimer >= MARKET.sampleSeconds) {
            this.sampleTimer -= MARKET.sampleSeconds;
            this.sampleCount++;
            this.history.push(this.price);
            if (this.history.length > MARKET.historySamples) {
                this.history.shift();
            }
        }
    }

    private setSignal(signal: Signal): void {
        if (signal !== this.signal) {
            this.signal = signal;
            this.onSignal?.(signal);
        }
    }
}

export type TradeKind = "buy" | "sell";
export type TradeResult =
    | { outcome: "opened"; kind: TradeKind; price: number }
    | { outcome: "closed"; kind: TradeKind; profit: number }
    /** Buying while already long, or selling while already short. */
    | { outcome: "ignored"; kind: TradeKind };

/**
 * The player's position: flat, long (bought) or short (sold), always SHARES shares. BUY opens a
 * long or closes a short; SELL opens a short or closes a long.
 */
export class Portfolio {
    /** 1 long, -1 short, 0 flat. */
    public position = 0;
    public entry = 0;
    /** Profit from closed trades. */
    public realized = 0;

    public reset(): void {
        this.position = 0;
        this.entry = 0;
        this.realized = 0;
    }

    public trade(kind: TradeKind, price: number): TradeResult {
        const direction = kind === "buy" ? 1 : -1;
        if (this.position === direction) {
            return { outcome: "ignored", kind };
        }
        if (this.position === 0) {
            this.position = direction;
            this.entry = price;
            return { outcome: "opened", kind, price };
        }
        return { outcome: "closed", kind, profit: this.close(price) };
    }

    /** Profit of the open position at `price` (0 when flat). */
    public openProfit(price: number): number {
        return this.position === 0 ? 0 : this.position * (price - this.entry) * SHARES;
    }

    /** Realized plus open profit. */
    public total(price: number): number {
        return this.realized + this.openProfit(price);
    }

    /** Closes any open position at `price`; returns its profit. */
    public close(price: number): number {
        const profit = this.openProfit(price);
        this.realized += profit;
        this.position = 0;
        return profit;
    }
}

/** "+$1,240" or "−$35" (a real minus sign), rounded to whole dollars. */
export function formatMoney(value: number): string {
    const rounded = Math.round(value);
    return `${rounded < 0 ? "−" : "+"}$${Math.abs(rounded).toLocaleString("en-US")}`;
}
