import { forecast, formatMoney, gaussian, Market, MARKET, pickTrend, Portfolio, SHARES, type Signal, type Trend } from "../../src/scenes/world/tradingMarket";
import { seededRandom, sequence } from "../helpers/random";

describe("Portfolio", () => {
    it("buying then selling makes the price difference on every share", () => {
        const portfolio = new Portfolio();
        expect(portfolio.trade("buy", 100)).toEqual({ outcome: "opened", kind: "buy", price: 100 });
        expect(portfolio.position).toBe(1);
        const result = portfolio.trade("sell", 104.5);
        expect(result).toEqual({ outcome: "closed", kind: "sell", profit: 4.5 * SHARES });
        expect(portfolio.position).toBe(0);
        expect(portfolio.realized).toBeCloseTo(4.5 * SHARES);
    });

    it("a short position profits when the price falls", () => {
        const portfolio = new Portfolio();
        portfolio.trade("sell", 100);
        expect(portfolio.position).toBe(-1);
        expect(portfolio.openProfit(97)).toBeCloseTo(3 * SHARES);
        const result = portfolio.trade("buy", 97);
        expect(result.outcome).toBe("closed");
        expect(portfolio.realized).toBeCloseTo(3 * SHARES);
    });

    it("loses money on a bad trade", () => {
        const portfolio = new Portfolio();
        portfolio.trade("buy", 100);
        portfolio.trade("sell", 98);
        expect(portfolio.realized).toBeCloseTo(-2 * SHARES);
    });

    it("ignores buying while already long and selling while already short", () => {
        const portfolio = new Portfolio();
        portfolio.trade("buy", 100);
        expect(portfolio.trade("buy", 120)).toEqual({ outcome: "ignored", kind: "buy" });
        expect(portfolio.entry).toBe(100);

        const short = new Portfolio();
        short.trade("sell", 100);
        expect(short.trade("sell", 90).outcome).toBe("ignored");
    });

    it("counts open and closed profit together, and closes an open position at the end", () => {
        const portfolio = new Portfolio();
        portfolio.trade("buy", 100);
        portfolio.trade("sell", 102);
        portfolio.trade("buy", 101);
        expect(portfolio.total(105)).toBeCloseTo((2 + 4) * SHARES);
        expect(portfolio.close(105)).toBeCloseTo(4 * SHARES);
        expect(portfolio.position).toBe(0);
        expect(portfolio.realized).toBeCloseTo(6 * SHARES);
    });

    it("has no open profit while flat", () => {
        expect(new Portfolio().openProfit(123)).toBe(0);
    });
});

describe("forecast", () => {
    it("is right when the roll is under the accuracy", () => {
        expect(forecast("up", sequence(0.1))).toBe("up");
        expect(forecast("down", sequence(0.1))).toBe("down");
        expect(forecast("flat", sequence(0.1))).toBe("none");
    });

    it("says the opposite when it's wrong about a trend", () => {
        expect(forecast("up", sequence(0.95))).toBe("down");
        expect(forecast("down", sequence(0.95))).toBe("up");
    });

    it("says up or down when it's wrong about a flat market", () => {
        expect(forecast("flat", sequence(0.95, 0.2))).toBe("up");
        expect(forecast("flat", sequence(0.95, 0.7))).toBe("down");
    });

    it("is right about as often as the configured accuracy", () => {
        const random = seededRandom(1);
        const trends: Trend[] = ["up", "down", "flat"];
        const expected: Record<Trend, Signal> = { up: "up", down: "down", flat: "none" };
        let right = 0;
        const rounds = 20000;
        for (let i = 0; i < rounds; i++) {
            const trend = trends[i % 3];
            if (forecast(trend, random) === expected[trend]) {
                right++;
            }
        }
        expect(right / rounds).toBeGreaterThan(MARKET.signalAccuracy - 0.02);
        expect(right / rounds).toBeLessThan(MARKET.signalAccuracy + 0.02);
    });
});

describe("pickTrend", () => {
    it("picks up, down and flat by the roll at the start price", () => {
        expect(pickTrend(MARKET.startPrice, sequence(0.1))).toBe("up");
        expect(pickTrend(MARKET.startPrice, sequence(0.5))).toBe("down");
        expect(pickTrend(MARKET.startPrice, sequence(0.9))).toBe("flat");
    });

    it("leans towards bringing the price back to the start", () => {
        const count = (price: number) => {
            const random = seededRandom(7);
            let ups = 0;
            for (let i = 0; i < 5000; i++) {
                ups += pickTrend(price, random) === "up" ? 1 : 0;
            }
            return ups / 5000;
        };
        expect(count(MARKET.startPrice - 30)).toBeGreaterThan(0.55);
        expect(count(MARKET.startPrice + 30)).toBeLessThan(0.25);
    });
});

describe("gaussian", () => {
    it("has a mean near 0 and a spread near 1", () => {
        const random = seededRandom(3);
        const values = Array.from({ length: 20000 }, () => gaussian(random));
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + ((v - mean) ** 2), 0) / values.length;
        expect(Math.abs(mean)).toBeLessThan(0.05);
        expect(variance).toBeGreaterThan(0.9);
        expect(variance).toBeLessThan(1.1);
    });
});

describe("Market", () => {
    it("starts at the start price with some history to draw", () => {
        const market = new Market(seededRandom(1));
        expect(market.price).toBe(MARKET.startPrice);
        expect(market.history.length).toBe(20);
        expect(market.signal).toBe("none");
    });

    it("shows its forecast ahead of each trend change, then switches to the forecast trend", () => {
        const market = new Market(seededRandom(11));
        const shown: Signal[] = [];
        market.onSignal = (signal) => shown.push(signal);
        const dt = 1 / 60;
        let changes = 0;
        for (let i = 0; i < 60 * 60; i++) {
            const before = market.upcomingTrend;
            const wasDecided = before !== null;
            market.step(dt);
            if (!wasDecided && market.upcomingTrend !== null) {
                // Decided (and forecast) about signalLead seconds before it starts.
                expect(market.timeToTrendChange).toBeLessThanOrEqual(MARKET.signalLead);
                expect(market.timeToTrendChange).toBeGreaterThan(MARKET.signalLead - (2 * dt));
            }
            if (wasDecided && market.upcomingTrend === null) {
                expect(market.trend).toBe(before);
                changes++;
            }
        }
        // A minute of trading has many trend changes, each forecast and then cleared again.
        expect(changes).toBeGreaterThan(10);
        expect(shown.filter((signal) => signal !== "none").length).toBeGreaterThan(5);
        expect(shown).toContain("none");
    });

    it("keeps a capped history, sampled ten times a second", () => {
        const market = new Market(seededRandom(5));
        for (let i = 0; i < 600; i++) {
            market.step(0.05);
        }
        expect(market.sampleCount).toBe(300);
        expect(market.history.length).toBe(MARKET.historySamples);
        expect(market.history[market.history.length - 1]).toBe(market.price);
    });

    it("never drops below the minimum price", () => {
        const market = new Market(seededRandom(9));
        for (let i = 0; i < 20000; i++) {
            market.step(0.05);
            expect(market.price).toBeGreaterThanOrEqual(MARKET.minPrice);
        }
    });

    it("rises in an up trend and falls in a down trend, on average", () => {
        const drift = (trend: Trend) => {
            const market = new Market(seededRandom(13));
            let total = 0;
            for (let run = 0; run < 200; run++) {
                market.reset();
                market.trend = trend;
                const start = market.price;
                // Less than the first trend's length, so the trend doesn't change.
                for (let i = 0; i < 10; i++) {
                    market.step(0.1);
                }
                total += market.price - start;
            }
            return total / 200;
        };
        expect(drift("up")).toBeGreaterThan(MARKET.trendSpeed * 0.7);
        expect(drift("down")).toBeLessThan(-MARKET.trendSpeed * 0.7);
    });
});

describe("formatMoney", () => {
    it("rounds to whole dollars with a sign and thousands separators", () => {
        expect(formatMoney(1240.4)).toBe("+$1,240");
        expect(formatMoney(0)).toBe("+$0");
        expect(formatMoney(-35.6)).toBe("−$36");
    });
});
