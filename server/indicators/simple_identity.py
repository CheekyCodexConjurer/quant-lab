import numpy as np


def calculate(inputs):
    """
    Simple test indicator that returns the close prices as-is.
    This is used internally to validate the Indicator Execution Engine.
    """
    close = np.array(inputs.get('close', []), dtype=float)
    return close

