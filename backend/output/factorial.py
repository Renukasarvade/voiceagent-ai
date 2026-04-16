def factorial(n: int) -> int:
    """
    Calculate the factorial of a given number.

    Args:
    n (int): The number to calculate the factorial of.

    Returns:
    int: The factorial of n.
    """
    if not isinstance(n, int):
        raise TypeError("Input must be an integer.")
    if n < 0:
        raise ValueError("Input must be a non-negative integer.")
    elif n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)