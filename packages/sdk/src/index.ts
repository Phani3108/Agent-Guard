import axios from "axios";
import { Decision } from "@agentguard/contracts";

export interface InspectOptions {
    tenantId: string;
    requestId: string;
    text?: string;
    payload?: any;
}

export class AgentGuardClient {
    constructor(private baseUrl: string, private apiKey?: string) { }

    async inspect(options: InspectOptions): Promise<Decision> {
        const response = await axios.post<Decision>(
            `${this.baseUrl}/inspect`,
            {
                tenant_id: options.tenantId,
                request_id: options.requestId,
                text: options.text,
                payload: options.payload,
            },
            {
                headers: this.apiKey ? { Authorization: `Api-Key ${this.apiKey}` } : {},
            }
        );

        // Validate the response against the Zod schema
        return Decision.parse(response.data);
    }
}
