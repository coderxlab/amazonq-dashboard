const { 
  calculateProductivityTrends,
  groupDataByTimeInterval
} = require('../utils/trendHelpers');

describe('calculateProductivityTrends', () => {
  const mockData = {
    '2024-03-01': {
      date: '2024-03-01',
      aiCodeLines: 10,
      chatInteractions: 5,
      inlineSuggestions: 20,
      inlineAcceptances: 15
    },
    '2024-03-02': {
      date: '2024-03-02',
      aiCodeLines: 15,
      chatInteractions: 8,
      inlineSuggestions: 25,
      inlineAcceptances: 20
    },
    '2024-03-03': {
      date: '2024-03-03',
      aiCodeLines: 12,
      chatInteractions: 6,
      inlineSuggestions: 22,
      inlineAcceptances: 16
    }
  };

  it('should calculate base metrics correctly', () => {
    const trends = calculateProductivityTrends(mockData);

    expect(trends.timePoints).toEqual(['2024-03-01', '2024-03-02', '2024-03-03']);
    expect(trends.metrics.aiCodeLines).toEqual([10, 15, 12]);
    expect(trends.metrics.chatInteractions).toEqual([5, 8, 6]);
    expect(trends.metrics.inlineSuggestions).toEqual([20, 25, 22]);
    expect(trends.metrics.inlineAcceptances).toEqual([15, 20, 16]);
    expect(trends.metrics.acceptanceRate).toEqual([75, 80, 72.72727272727273]);
  });

  it('should calculate moving averages correctly', () => {
    const trends = calculateProductivityTrends(mockData);

    // First point is just itself
    expect(trends.movingAverages.aiCodeLines[0]).toBe(10);
    // Second point is average of first two points
    expect(trends.movingAverages.aiCodeLines[1]).toBe(12.5); // (10 + 15) / 2
    // Third point is average of all three points
    expect(trends.movingAverages.aiCodeLines[2]).toBeCloseTo(12.33, 2); // (10 + 15 + 12) / 3

    expect(trends.movingAverages.chatInteractions[0]).toBe(5);
    expect(trends.movingAverages.chatInteractions[1]).toBe(6.5); // (5 + 8) / 2
    expect(trends.movingAverages.chatInteractions[2]).toBeCloseTo(6.33, 2); // (5 + 8 + 6) / 3

    expect(trends.movingAverages.acceptanceRate[0]).toBe(75);
    expect(trends.movingAverages.acceptanceRate[1]).toBe(77.5); // (75 + 80) / 2
    expect(trends.movingAverages.acceptanceRate[2]).toBeCloseTo(75.91, 2); // (75 + 80 + 72.73) / 3
  });

  it('should calculate growth rates correctly', () => {
    const trends = calculateProductivityTrends(mockData);

    // First point should be null
    expect(trends.growthRates.aiCodeLines[0]).toBeNull();
    // Second point: (15 - 10) / 10 * 100 = 50%
    expect(trends.growthRates.aiCodeLines[1]).toBe(50);
    // Third point: (12 - 15) / 15 * 100 = -20%
    expect(trends.growthRates.aiCodeLines[2]).toBe(-20);

    expect(trends.growthRates.chatInteractions[0]).toBeNull();
    expect(trends.growthRates.chatInteractions[1]).toBe(60); // (8 - 5) / 5 * 100
    expect(trends.growthRates.chatInteractions[2]).toBe(-25); // (6 - 8) / 8 * 100

    expect(trends.growthRates.acceptanceRate[0]).toBeNull();
    expect(trends.growthRates.acceptanceRate[1]).toBeCloseTo(6.67, 2); // (80 - 75) / 75 * 100
    expect(trends.growthRates.acceptanceRate[2]).toBeCloseTo(-9.09, 2); // (72.73 - 80) / 80 * 100
  });

  it('should calculate totals correctly', () => {
    const trends = calculateProductivityTrends(mockData);

    expect(trends.totals.aiCodeLines).toBe(37); // 10 + 15 + 12
    expect(trends.totals.chatInteractions).toBe(19); // 5 + 8 + 6
    expect(trends.totals.inlineSuggestions).toBe(67); // 20 + 25 + 22
    expect(trends.totals.inlineAcceptances).toBe(51); // 15 + 20 + 16
  });

  it('should handle empty data correctly', () => {
    const trends = calculateProductivityTrends({});

    expect(trends.timePoints).toEqual([]);
    expect(trends.metrics.aiCodeLines).toEqual([]);
    expect(trends.movingAverages.aiCodeLines).toEqual([]);
    expect(trends.growthRates.aiCodeLines).toEqual([]);
    expect(trends.totals.aiCodeLines).toBe(0);
  });

  it('should handle single data point correctly', () => {
    const singlePoint = {
      '2024-03-01': {
        date: '2024-03-01',
        aiCodeLines: 10,
        chatInteractions: 5,
        inlineSuggestions: 20,
        inlineAcceptances: 15
      }
    };

    const trends = calculateProductivityTrends(singlePoint);

    expect(trends.timePoints).toEqual(['2024-03-01']);
    expect(trends.metrics.aiCodeLines).toEqual([10]);
    expect(trends.movingAverages.aiCodeLines).toEqual([10]); // For single point, moving average is the point itself
    expect(trends.growthRates.aiCodeLines).toEqual([null]); // No previous point for growth rate
    expect(trends.totals.aiCodeLines).toBe(10);
  });
});