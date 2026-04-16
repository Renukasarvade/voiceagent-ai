std::vector<int> fibonacci(int n) {
    std::vector<int> fibSeries = {0, 1};
    while (fibSeries.size() < n) {
        fibSeries.push_back(fibSeries.back() + fibSeries[fibSeries.size() - 2]);
    }
    return fibSeries;
}