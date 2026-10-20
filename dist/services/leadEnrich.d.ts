/**
 * Firmographic Lead Profiler & Company Intelligence Service
 *
 * Ingests domain names or business emails, aggregates firmographic intelligence
 * (company size, industry sector, tech stack, funding, headquarters), and formats
 * normalized CRM-ready payloads for autonomous agent outreach pipelines.
 */
export interface LeadEnrichRequest {
    domain: string;
    companyName?: string;
    includeTechStack?: boolean;
    includeKeyContacts?: boolean;
}
export interface KeyContactSummary {
    name: string;
    role: string;
    linkedinUrl?: string;
}
export interface FirmographicProfile {
    domain: string;
    name: string;
    legalName: string;
    industry: string;
    subIndustry: string;
    employeeRange: string;
    estimatedAnnualRevenue: string;
    headquarters: {
        city: string;
        state?: string;
        country: string;
    };
    technologiesDetected: string[];
    keyContacts?: KeyContactSummary[];
    foundedYear: number;
    enrichedAt: string;
}
/**
 * Perform firmographic enrichment lookup for a given domain or enterprise entity.
 */
export declare function enrichCompanyLead(req: LeadEnrichRequest): FirmographicProfile;
//# sourceMappingURL=leadEnrich.d.ts.map