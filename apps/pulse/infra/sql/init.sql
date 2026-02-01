-- Pulse Database Schema
-- Agentic Segment Drift & Reach Intelligence

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    definition JSONB NOT NULL,
    owner VARCHAR(255) NOT NULL,
    baseline JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_segments_is_active ON segments(is_active);
CREATE INDEX idx_segments_owner ON segments(owner);
CREATE INDEX idx_segments_created_at ON segments(created_at DESC);

-- Snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    size INTEGER NOT NULL,
    attr_distributions JSONB NOT NULL DEFAULT '{}',
    conv_rate DECIMAL(5, 4),
    velocity_in INTEGER NOT NULL DEFAULT 0,
    velocity_out INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_snapshots_segment_id ON snapshots(segment_id);
CREATE INDEX idx_snapshots_ts ON snapshots(ts DESC);
CREATE INDEX idx_snapshots_segment_ts ON snapshots(segment_id, ts DESC);

-- Drift incidents table
CREATE TABLE IF NOT EXISTS drift_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id UUID NOT NULL REFERENCES segments(id) ON DELETE CASCADE,
    ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    evidence JSONB NOT NULL,
    explanation_text TEXT,
    recommendations JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255)
);

CREATE INDEX idx_drift_segment_id ON drift_incidents(segment_id);
CREATE INDEX idx_drift_ts ON drift_incidents(ts DESC);
CREATE INDEX idx_drift_status ON drift_incidents(status);
CREATE INDEX idx_drift_severity ON drift_incidents(severity);
CREATE INDEX idx_drift_type ON drift_incidents(type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_incidents_updated_at BEFORE UPDATE ON drift_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some initial data for demo (optional)
-- INSERT INTO segments (name, definition, owner, baseline) VALUES
-- (
--     'High-Value Active Users',
--     '{"rules": [{"field": "ltv", "operator": ">", "value": 1000}, {"field": "last_active_days", "operator": "<=", "value": 7}], "logicalOperator": "AND"}',
--     'growth-team',
--     '{"monitoringEnabled": true, "expectedSize": {"min": 8000, "max": 12000}}'
-- );

-- Grant permissions (adjust as needed for your setup)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pulse;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pulse;
