import talib
import numpy as np

def calculate(inputs):
    """
    Calculate EMA 200 Indicator
    :param inputs: Dictionary containing 'close', 'open', 'high', 'low' arrays
    :return: Array of indicator values
    """
    close_prices = np.array(inputs['close'])
    ema = talib.EMA(close_prices, timeperiod=2000)

    return ema
