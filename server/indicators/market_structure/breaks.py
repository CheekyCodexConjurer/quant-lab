def is_valid_high_break(open_price, close_price, high_price, level):
    if high_price < level:
        return False
    cmax = max(open_price, close_price)
    if cmax > level:
        return True
    if cmax == level and high_price > level:
        return True
    return False


def is_valid_low_break(open_price, close_price, low_price, level):
    if low_price > level:
        return False
    cmin = min(open_price, close_price)
    if cmin < level:
        return True
    if cmin == level and low_price < level:
        return True
    return False

