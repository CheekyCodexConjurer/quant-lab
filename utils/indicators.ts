import { Candle } from '../types';

export const calculateEMA = (data: Candle[], period: number) => {
  if (!data || data.length === 0) return [];

  const k = 2 / (period + 1);
  const emaData = [];
  let ema = data[0].close;

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    ema = price * k + ema * (1 - k);
    if (i >= period) {
      emaData.push({ time: data[i].time, value: ema });
    }
  }

  return emaData;
};

export const DEFAULT_INDICATOR_CODE = `import talib
import numpy as np

def calculate(inputs):
    """
    Calculate EMA 200 Indicator
    :param inputs: Dictionary containing 'close', 'open', 'high', 'low' arrays
    :return: Array of indicator values
    """
    close_prices = np.array(inputs['close'])
    ema = talib.EMA(close_prices, timeperiod=200)

    return ema
`;

export const NEW_INDICATOR_TEMPLATE = `import talib
import numpy as np

def calculate(inputs):
    """
    New Indicator Template
    """
    return inputs['close']
`;
