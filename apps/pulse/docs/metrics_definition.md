# Snapshot Metrics Definition

This document defines the metrics captured in each segment snapshot.

## Core Metrics

### Size
- **Type**: Integer
- **Description**: Total number of users/entities in the segment at snapshot time
- **Usage**: Primary metric for detecting segment growth/shrinkage

### Attribute Distributions
- **Type**: JSON object
- **Description**: Distribution of categorical attributes across segment members
- **Structure**: 
  ```json
  {
    "attribute_name": {
      "value1": count1,
      "value2": count2,
      ...
    }
  }
  ```
- **Common Attributes**:
  - `platform`: Distribution across iOS, Android, Web
  - `status`: Active, Dormant, Churned counts
  - `tier`: Free, Premium, Enterprise counts
  - Custom attributes based on segment definition

### Conversion Rate
- **Type**: Decimal (0.0 - 1.0)
- **Description**: Percentage of segment members who completed desired action
- **Optional**: Only tracked if segment has conversion events defined
- **Example**: 0.15 = 15% conversion rate

### Velocity In
- **Type**: Integer
- **Description**: Number of new users entering the segment since last snapshot
- **Usage**: Measures segment acquisition rate
- **Calculation**: Users matching segment criteria who weren't in previous snapshot

### Velocity Out
- **Type**: Integer  
- **Description**: Number of users leaving the segment since last snapshot
- **Usage**: Measures segment churn/exit rate
- **Calculation**: Users in previous snapshot who no longer match criteria

## Metadata

### Timestamp
- **Type**: Timestamp with timezone
- **Description**: When the snapshot was taken
- **Format**: ISO 8601

### Segment ID
- **Type**: UUID
- **Description**: Reference to the segment being snapshot

## Computed Metrics

These metrics are derived from the core metrics:

### Net Velocity
- **Formula**: `velocity_in - velocity_out`
- **Description**: Net change in segment size from user movement

### Churn Rate
- **Formula**: `velocity_out / size`
- **Description**: Percentage of segment leaving

### Growth Rate
- **Formula**: `(current_size - previous_size) / previous_size`
- **Description**: Percentage change in segment size

### Attribute Entropy
- **Description**: Measure of distribution diversity
- **Usage**: High entropy = even distribution, low entropy = skewed

## Baseline Expectations

Segments can define expected ranges for metrics:

```json
{
  "expectedSize": {
    "min": 8000,
    "max": 12000
  },
  "expectedConversionRate": {
    "min": 0.15,
    "max": 0.25
  }
}
```

When metrics fall outside these ranges, drift detection is more likely to flag anomalies.

## Data Quality Considerations

- **Null Handling**: Missing attributes tracked separately
- **Sparse Distributions**: Attributes with < 1% of segment ignored
- **Sampling**: For very large segments (>1M), may use statistical sampling
- **Freshness**: Snapshots should be taken at consistent intervals

## Example Snapshot

```json
{
  "id": "snap-123",
  "segmentId": "seg-456",
  "timestamp": "2026-01-26T10:00:00Z",
  "size": 10500,
  "attributeDistributions": {
    "platform": {
      "ios": 4725,
      "android": 4200,
      "web": 1575
    },
    "tier": {
      "free": 6300,
      "premium": 3150,
      "enterprise": 1050
    }
  },
  "conversionRate": 0.16,
  "velocityIn": 525,
  "velocityOut": 315
}
```
