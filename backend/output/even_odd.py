# even_odd.py

def is_even_or_odd(num):
    """
    Returns 'Even' if the number is even, 'Odd' if the number is odd
    """
    if num % 2 == 0:
        return 'Even'
    else:
        return 'Odd'

# Test the function
print(is_even_or_odd(10))   # Even
print(is_even_or_odd(11))   # Odd
print(is_even_or_odd(20))   # Even
print(is_even_or_odd(21))   # Odd