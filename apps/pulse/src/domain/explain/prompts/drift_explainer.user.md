Analyze this segment drift incident:

**Segment Information:**
- Name: {{segmentName}}
- Owner: {{segmentOwner}}
- Definition: {{segmentDefinition}}

**Drift Incident:**
- Type: {{driftType}}
- Severity: {{driftSeverity}}
- Detected: {{detectedAt}}

**Evidence:**
- Current Value: {{currentValue}}
- Previous Value: {{previousValue}}
- Change: {{changePercent}}% (threshold: {{threshold}}%)
{{#if affectedAttributes}}
- Affected Attributes: {{affectedAttributes}}
{{/if}}

**Additional Context:**
{{details}}

**Task:**
Explain this drift incident. Provide:
1. What changed (be specific)
2. Why it likely changed (list possible causes in order of likelihood)
3. What to do next (3-5 actionable recommendations)

Focus on practical insights that help the team resolve this issue.
