# Implement Comparative Code Metrics Visualization

## Description
Our dashboard currently shows basic code metrics but lacks comparative visualizations that would help understand the relationship between suggested and accepted code.

## Requirements
- Create comparative visualizations for:
  - Total code lines suggested vs. accepted
  - Total suggestions vs. acceptances
- Add developer-to-developer comparison capabilities
- Include team average benchmarks

## Technical Details
- Use existing data from the `AmazonQDevLogging` table:
  - `Chat_AICodeLines` and `Inline_AICodeLines` for code lines
  - `Inline_SuggestionsCount` and `Inline_AcceptanceCount` for suggestions
- Implement new comparative chart components using Chart.js
- Add API endpoints for aggregated comparative data

## Acceptance Criteria
- [ ] Dashboard displays comparative charts for code metrics
- [ ] Users can compare their metrics against team averages
- [ ] Optional developer-to-developer comparison feature
- [ ] All visualizations respond to existing filters (date range)
- [ ] Export functionality for comparative data

## Related to
- Gap Analysis: Code Completion Metrics