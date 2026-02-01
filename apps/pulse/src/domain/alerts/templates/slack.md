🚨 **Segment Drift Alert** 🚨

**Segment:** {{segmentName}}
**Owner:** @{{segmentOwner}}
**Severity:** {{severityEmoji}} {{severity}}

**Drift Type:** {{driftType}}
**Detected:** {{detectedAt}}

---

**What Changed:**
{{explanation}}

**Evidence:**
• Current Value: {{currentValue}}
• Previous Value: {{previousValue}}
• Change: {{changePercent}}%

{{#if recommendations}}
**Recommendations:**
{{#each recommendations}}
{{priority}} {{action}}
{{/each}}
{{/if}}

---

_View incident: {{incidentUrl}}_
