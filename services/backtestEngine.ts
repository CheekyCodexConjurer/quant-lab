import { Candle, Trade, BacktestResult } from '../types';

// Simulating a sophisticated strategy result from Lean Engine
export const runBacktest = (data: Candle[]): BacktestResult => {
  const trades: Trade[] = [];
  let equity = 10000;
  const equityCurve = [{ time: data[0].time, value: equity }];
  
  // Mock strategy logic (fixed internal parameters)
  const shortPeriod = 9;
  const longPeriod = 21;
  let position: 'long' | null = null;
  let entryPrice = 0;
  let entryIndex = 0;

  // Helper to calculate SMA
  const getSMA = (index: number, period: number) => {
    if (index < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[index - i].close;
    }
    return sum / period;
  };

  let maxPeak = equity;
  let maxDrawdown = 0;

  for (let i = longPeriod; i < data.length; i++) {
    const shortSMA = getSMA(i, shortPeriod);
    const longSMA = getSMA(i, longPeriod);
    const prevShortSMA = getSMA(i - 1, shortPeriod);
    const prevLongSMA = getSMA(i - 1, longPeriod);

    if (!shortSMA || !longSMA || !prevShortSMA || !prevLongSMA) continue;

    // Buy Signal
    if (position === null && prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
      position = 'long';
      entryPrice = data[i].close;
      entryIndex = i;
    }
    // Sell Signal
    else if (position === 'long' && prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
      const exitPrice = data[i].close;
      const profit = (exitPrice - entryPrice) * 10000; 
      const profitPercent = (exitPrice - entryPrice) / entryPrice;
      
      trades.push({
        id: `ORD-${i}`,
        entryTime: data[entryIndex].time,
        exitTime: data[i].time,
        entryPrice,
        exitPrice,
        direction: 'long',
        profit,
        profitPercent
      });

      equity += profit;
      position = null;
    }
    
    // Track Drawdown
    if (equity > maxPeak) maxPeak = equity;
    const currentDrawdown = (maxPeak - equity) / maxPeak;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

    equityCurve.push({ time: data[i].time, value: equity });
  }

  const wins = trades.filter(t => t.profit > 0).length;
  const totalTrades = trades.length;

  return {
    totalTrades,
    winRate: totalTrades > 0 ? wins / totalTrades : 0,
    totalProfit: equity - 10000,
    drawdown: maxDrawdown,
    trades,
    equityCurve
  };
};