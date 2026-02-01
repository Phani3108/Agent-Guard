import { zodToJsonSchema } from "zod-to-json-schema";
import * as fs from "fs";
import * as path from "path";
import { Decision } from "../src/decision";
import { Report } from "../src/findings";
import { AuditEvent } from "../src/audit";
import { CampaignSpec, SegmentDefinition } from "../src/specs";
import { SegmentSnapshot, DriftIncident } from "../src/pulse";

const schemas = {
    Decision,
    Report,
    AuditEvent,
    CampaignSpec,
    SegmentDefinition,
    SegmentSnapshot,
    DriftIncident,
};

const outputDir = path.resolve(__dirname, "../../contracts-schema/schema");

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

Object.entries(schemas).forEach(([name, schema]) => {
    const jsonSchema = zodToJsonSchema(schema, name);
    const outputPath = path.join(outputDir, `${name}.schema.json`);
    fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2));
    console.log(`Generated ${outputPath}`);
});
