# Drift Detection Rules

This document explains the drift detection rules and how they work.

## Overview

Pulse uses four primary drift detectors, each focusing on different aspects of segment behavior:

1. **Size Jump**: Sudden changes in segment size
2. **Distribution Shift**: Changes in attribute distributions
3. **Conversion Anomaly**: Unexpected conversion rate changes
4. **Inactivity Creep**: Increasing churn/exit rates

## 1. Size Jump Detector

### What It Detects
Significant changes in total segment size between snapshots.

### Threshold
- **Default**: 15% (configurable via `DRIFT_SIZE_CHANGE_THRESHOLD`)
- **Custom**: Can be set per-segment in baseline configuration

### Detection Logic
```typescript
changePercent = abs(current_size - previous_size) / previous_size

if (changePercent >= threshold) {
  // Drift detected
}
```

### Severity Levels
- **Critical**: Change ≥ 3× threshold (≥45% by default)
- **High**: Change ≥ 2× threshold (≥30% by default)
- **Medium**: Change ≥ 1.5× threshold (≥22.5% by default)
- **Low**: Change ≥ threshold (≥15% by default)

### Common Causes
- Schema/data pipeline changes
- Product feature launches
- Seasonal patterns
- Data quality issues
- Segment definition errors

### Example
```
Previous: 10,000 users
Current: 5,800 users
Change: -42%
Threshold: 15%
Result: CRITICAL drift detected
```

## 2. Distribution Shift Detector

### What It Detects
Changes in how segment members are distributed across attribute values.

### Threshold
- **Default**: 20% (configurable via `DRIFT_DISTRIBUTION_THRESHOLD`)

### Detection Logic
Uses Total Variation Distance to measure distribution shift:

```typescript
for each critical_attribute:
  shift = 0.5 * sum(abs(current_prob[v] - previous_prob[v]))
  
  if (shift >= threshold) {
    // Drift detected
  }
```

### Critical Attributes
Monitored attributes can be specified in segment baseline:
```json
{
  "criticalAttributes": ["platform", "tier", "app_version"]
}
```

If not specified, all attributes in the distribution are monitored.

### Common Causes
- SDK/app version updates
- Platform-specific bugs
- A/B test exposures
- Regional rollouts
- Tracking implementation changes

### Example
```
Platform distribution shift:
Previous: iOS 45%, Android 40%, Web 15%
Current: iOS 78%, Android 0%, Web 22%

Android users disappeared (SDK update broke tracking)
Result: HIGH drift detected
```

## 3. Conversion Anomaly Detector

### What It Detects
Unexpected changes in conversion rates for the segment.

### Threshold
- **Default**: 25% (configurable via `DRIFT_CONVERSION_THRESHOLD`)

### Detection Logic
```typescript
changePercent = abs(current_rate - previous_rate) / previous_rate

if (changePercent >= threshold) {
  // Drift detected
}
```

### Requirements
- Segment must track conversion events
- Both snapshots must have conversion data

### Common Causes
- Conversion tracking changes
- Product experience changes
- Pricing/offer changes
- User cohort shifts
- Technical issues in conversion funnel

### Example
```
Previous: 15% conversion rate
Current: 10% conversion rate
Change: -33.3%
Threshold: 25%
Result: MEDIUM drift detected
```

## 4. Inactivity Creep Detector

### What It Detects
Increasing churn/exit rates that suggest growing inactivity.

### Threshold
- **Default**: 30% (configurable via `DRIFT_INACTIVITY_THRESHOLD`)

### Detection Logic
```typescript
current_churn = velocity_out / current_size
previous_churn = velocity_out / previous_size

changePercent = abs(current_churn - previous_churn) / previous_churn

if (changePercent >= threshold && current_churn > previous_churn) {
  // Drift detected (only on increases)
}
```

### Focus
Only triggers on **increased** churn (decreased churn is good).

### Common Causes
- Engagement feature removal
- Notification/email cadence changes
- Product complexity increases
- Competitor launches
- Seasonal disengagement

### Example
```
Previous churn rate: 3%
Current churn rate: 5%
Change: +66.7%
Threshold: 30%
Result: HIGH drift detected
```

## Configuring Thresholds

### Global Configuration (.env)
```env
DRIFT_SIZE_CHANGE_THRESHOLD=0.15
DRIFT_DISTRIBUTION_THRESHOLD=0.20
DRIFT_CONVERSION_THRESHOLD=0.25
DRIFT_INACTIVITY_THRESHOLD=0.30
```

### Per-Segment Configuration
```json
{
  "baseline": {
    "alertThresholds": {
      "sizeChangePercent": 0.10,
      "distributionShift": 0.15,
      "conversionAnomaly": 0.20,
      "inactivityCreep": 0.25
    }
  }
}
```

Per-segment settings override global defaults.

## Drift Workflow

1. **Snapshot Taken**: New snapshot captured for segment
2. **Comparison**: Compare with previous snapshot
3. **Detection**: Run all drift detectors
4. **Incident Creation**: Create incident if drift detected
5. **Explanation**: LLM generates explanation
6. **Alerting**: Send notifications via Slack/Email/Teams

## Best Practices

### Threshold Tuning
- Start with defaults
- Monitor false positive rate
- Tighten thresholds for critical segments
- Loosen for experimental/volatile segments

### Critical Segments
For high-value segments (e.g., enterprise customers):
- Lower thresholds (10-15% instead of 20-30%)
- Monitor more attributes
- Enable all detection types

### Noisy Segments
For segments with natural volatility:
- Higher thresholds
- Focus on size jump only
- Consider expected ranges instead

### Monitoring Cadence
- Daily snapshots recommended
- Hourly for real-time segments
- Weekly minimum for slow-changing segments

## Disabling Detection

### Globally Disable
Set monitoring to false in baseline:
```json
{
  "baseline": {
    "monitoringEnabled": false
  }
}
```

### Disable Specific Detectors
Set threshold to 1.0 (100%) to effectively disable:
```json
{
  "baseline": {
    "alertThresholds": {
      "conversionAnomaly": 1.0  // Disabled
    }
  }
}
```
