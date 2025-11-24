
import { Candle } from '../types';

export const generateData = (count: number = 500, symbol: string = 'CL1!', timeframe: string = 'D1'): Candle[] => {
  let price = 1.1000;
  let volatility = 0.002;

  // Set realistic starting prices based on symbol (Futures Continuous)
  switch(symbol) {
    case 'CL1!': // Crude Oil
      price = 75.00;
      volatility = 0.5;
      break;
    case 'NG1!': // Natural Gas
      price = 2.50;
      volatility = 0.05;
      break;
    case 'GC1!': // Gold
      price = 2000.00;
      volatility = 15.0;
      break;
    case 'HG1!': // Copper
      price = 3.80;
      volatility = 0.04;
      break;
    case 'SI1!': // Silver
      price = 23.50;
      volatility = 0.3;
      break;
    case 'ES1!': // E-Mini S&P 500
      price = 4500.00;
      volatility = 25.0;
      break;
    case 'NQ1!': // Nasdaq 100
      price = 15000.00;
      volatility = 80.0;
      break;
    case 'BTC1!': // Bitcoin
      price = 35000.00;
      volatility = 500.0;
      break;
    case 'ETH1!': // Ethereum
      price = 2000.00;
      volatility = 30.0;
      break;
    case 'ZC1!': // Corn
      price = 480.00;
      volatility = 5.0;
      break;
    case 'ZS1!': // Soybean
      price = 1300.00;
      volatility = 12.0;
      break;
    case 'EURUSD':
    default:
      if (symbol.includes('USD') || symbol.includes('EUR')) {
        price = 1.1000;
        volatility = 0.002;
      } else {
        // Fallback for unknown symbols
        price = 100.00;
        volatility = 1.0;
      }
      break;
  }

  // Adjust volatility based on timeframe for simulation variety
  if (timeframe.startsWith('M')) {
    volatility *= 0.2;
  } else if (timeframe.startsWith('H')) {
    volatility *= 0.5;
  }

  // Determine time interval in milliseconds
  let intervalMs = 24 * 60 * 60 * 1000; // Default D1
  if (timeframe === 'M1') intervalMs = 60 * 1000;
  else if (timeframe === 'M5') intervalMs = 5 * 60 * 1000;
  else if (timeframe === 'M15') intervalMs = 15 * 60 * 1000;
  else if (timeframe === 'H1') intervalMs = 60 * 60 * 1000;
  else if (timeframe === 'H4') intervalMs = 4 * 60 * 60 * 1000;

  const data: Candle[] = [];
  // Start from a recent date, working backwards or forwards. Let's go forwards from 2023.
  let currentTime = new Date('2023-01-01T00:00:00Z').getTime();

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);

    // If intraday (M/H), use unix timestamp (number). If Daily (D1), use string YYYY-MM-DD.
    // Lightweight charts prefers timestamps for intraday.
    let time: string | number;
    
    if (timeframe === 'D1') {
       time = new Date(currentTime).toISOString().split('T')[0];
    } else {
       // Using UNIX timestamp (seconds) for intraday is standard for Lightweight Charts
       time = currentTime / 1000; 
    }

    data.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 10000)
    });

    price = close;
    currentTime += intervalMs;
  }

  return data;
};
