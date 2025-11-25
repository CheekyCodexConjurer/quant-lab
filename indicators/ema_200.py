import talib
import numpy as np


def calculate(inputs):
    """
    Example: EMA 200 indicator.
    Receives numpy arrays in inputs['close'].
    Returns an array with the 200-period exponential moving average.
    """
    close_prices = np.array(inputs['close'])
    return talib.EMA(close_prices, timeperiod=200)
