import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import {
  GetAudienceDemographicsInput,
  GetAudienceReachInput,
  ListSavedAudiencesInput,
  DemographicPivot,
} from '../lib/types.js';

// Standard metrics interface
interface StandardMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number | null;
  engagements: number;
  engagementRate: number | null;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  conversions: number;
  conversionRate: number | null;
  costPerConversion: number | null;
  audiencePenetration: number | null;
}

// Helper to calculate standard metrics from a raw analytics record
function calculateStandardMetrics(record: any, estimatedAudienceSize?: number): StandardMetrics {
  const impressions = record.impressions || 0;
  const clicks = record.clicks || 0;
  const spend = parseFloat(record.costInUsd) || 0;
  const conversions = record.externalWebsiteConversions || 0;
  const engagements = record.totalEngagements || 0;
  const reach = record.approximateUniqueImpressions || (impressions > 0 ? Math.round(impressions * 0.7) : 0);

  return {
    spend,
    impressions,
    clicks,
    reach,
    frequency: reach > 0 ? Number((impressions / reach).toFixed(2)) : null,
    engagements,
    engagementRate: impressions > 0 ? Number(((engagements / impressions) * 100).toFixed(2)) : null,
    ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
    cpm: impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : null,
    cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : null,
    conversions,
    conversionRate: clicks > 0 ? Number(((conversions / clicks) * 100).toFixed(2)) : null,
    costPerConversion: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
    audiencePenetration: estimatedAudienceSize && estimatedAudienceSize > 0
      ? Number(((reach / estimatedAudienceSize) * 100).toFixed(2))
      : null,
  };
}

// Mapping of demographic types to readable names
const DEMOGRAPHIC_TYPE_MAP: Record<DemographicPivot, string> = {
  MEMBER_JOB_FUNCTION: 'Job Function',
  MEMBER_SENIORITY: 'Seniority',
  MEMBER_INDUSTRY: 'Industry',
  MEMBER_COMPANY_SIZE: 'Company Size',
  MEMBER_JOB_TITLE: 'Job Title',
  MEMBER_COMPANY: 'Company',
  MEMBER_COUNTRY: 'Country',
  MEMBER_COUNTRY_V2: 'Country',
  MEMBER_REGION: 'Region',
  MEMBER_REGION_V2: 'Region',
};

// Tool definitions
export const getAudienceDemographicsTool: Tool = {
  name: 'get_audience_demographics',
  description: 'Retrieves demographic breakdown of who saw or interacted with your ads. Shows performance segmented by job function, seniority, industry, company size, or geographic location. Essential for understanding if you\'re reaching your target audience. Note: Demographic data has a 12-24 hour delay.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'The LinkedIn Ad Account ID',
      },
      campaignIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific campaigns',
      },
      demographicType: {
        type: 'string',
        enum: [
          'MEMBER_JOB_FUNCTION',
          'MEMBER_SENIORITY',
          'MEMBER_INDUSTRY',
          'MEMBER_COMPANY_SIZE',
          'MEMBER_JOB_TITLE',
          'MEMBER_COMPANY',
          'MEMBER_COUNTRY',
          'MEMBER_COUNTRY_V2',
          'MEMBER_REGION',
          'MEMBER_REGION_V2',
        ],
        description: 'The demographic dimension to analyze (MEMBER_COUNTRY and MEMBER_REGION are the newer versions)',
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Default: today',
      },
      metric: {
        type: 'string',
        enum: ['impressions', 'clicks', 'costInUsd'],
        description: 'Primary metric to sort by. Default: impressions',
      },
      limit: {
        type: 'number',
        description: 'Top N results to return (max 100). Default: 25',
      },
    },
    required: ['accountId', 'demographicType', 'startDate'],
  },
};

export const getAudienceReachTool: Tool = {
  name: 'get_audience_reach',
  description: 'Shows unique member reach and audience penetration for campaigns. Helps understand what percentage of your target audience you\'ve reached. Note: Date range must be 92 days or less.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'The LinkedIn Ad Account ID',
      },
      campaignIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific campaigns',
      },
      campaignGroupIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by campaign groups',
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format (max 92 days range)',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Default: today',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

export const listSavedAudiencesTool: Tool = {
  name: 'list_saved_audiences',
  description: 'Lists saved/matched audiences available in the account for targeting. Shows audience names, sizes, and statuses to help plan campaign targeting.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'The LinkedIn Ad Account ID',
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['ACTIVE', 'EXPIRED', 'PROCESSING'],
        },
        description: 'Filter by status',
      },
      audienceType: {
        type: 'string',
        enum: ['MATCHED', 'LOOKALIKE', 'PREDICTIVE'],
        description: 'Filter by audience type',
      },
    },
    required: ['accountId'],
  },
};

// Tool handlers
export async function handleGetAudienceDemographics(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetAudienceDemographicsInput;

  if (!input.accountId || !input.demographicType || !input.startDate) {
    throw new Error('accountId, demographicType, and startDate are required');
  }

  const analytics = await client.getAudienceDemographics({
    accountId: input.accountId,
    demographicType: input.demographicType,
    campaignIds: input.campaignIds,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const sortMetric = input.metric || 'impressions';
  const limit = Math.min(input.limit || 25, 100);

  // Calculate totals for percentage calculations
  const totalRecord = analytics.reduce(
    (acc, r: any) => ({
      impressions: acc.impressions + (r.impressions || 0),
      clicks: acc.clicks + (r.clicks || 0),
      costInUsd: acc.costInUsd + (parseFloat(r.costInUsd) || 0),
      totalEngagements: acc.totalEngagements + (r.totalEngagements || 0),
      externalWebsiteConversions: acc.externalWebsiteConversions + (r.externalWebsiteConversions || 0),
      approximateUniqueImpressions: acc.approximateUniqueImpressions + (r.approximateUniqueImpressions || 0),
    }),
    { impressions: 0, clicks: 0, costInUsd: 0, totalEngagements: 0, externalWebsiteConversions: 0, approximateUniqueImpressions: 0 }
  );

  // Process and sort results with standard metrics
  let segments = analytics.map((record: any) => {
    const urn = record.pivotValues?.[0] || '';
    // Extract name from URN (last part after colon)
    const name = urn.split(':').pop() || urn;
    const standardMetrics = calculateStandardMetrics(record);

    return {
      name,
      urn,
      metrics: standardMetrics,
      percentOfTotal: totalRecord.impressions > 0
        ? Number(((record.impressions || 0) / totalRecord.impressions * 100).toFixed(2))
        : 0,
    };
  });

  // Sort by the selected metric
  segments.sort((a, b) => {
    const aVal = (a.metrics as any)[sortMetric] as number || 0;
    const bVal = (b.metrics as any)[sortMetric] as number || 0;
    return bVal - aVal;
  });

  // Limit results
  segments = segments.slice(0, limit);

  return {
    demographicType: input.demographicType,
    demographicTypeName: DEMOGRAPHIC_TYPE_MAP[input.demographicType],
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
    segments,
    totals: calculateStandardMetrics(totalRecord),
    note: 'Demographic data may have a 12-24 hour delay and shows only top 100 values per creative per day.',
  };
}

export async function handleGetAudienceReach(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetAudienceReachInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  // Validate date range (max 92 days)
  const startDate = new Date(input.startDate);
  const endDate = input.endDate ? new Date(input.endDate) : new Date();
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > 92) {
    throw new Error(
      `Date range exceeds maximum of 92 days. Current range: ${daysDiff} days. Please reduce the date range.`
    );
  }

  const analytics = await client.getAudienceReach({
    accountId: input.accountId,
    campaignIds: input.campaignIds,
    campaignGroupIds: input.campaignGroupIds,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const results = analytics.map((record: any) => {
    const entityUrn = record.pivotValues?.[0] || '';
    const entityId = entityUrn.split(':').pop() || '';
    const entityType = entityUrn.includes('Campaign')
      ? 'CAMPAIGN'
      : entityUrn.includes('CampaignGroup')
        ? 'CAMPAIGN_GROUP'
        : 'ACCOUNT';

    const reach = record.approximateMemberReach || 0;
    const impressions = record.impressions || 0;

    return {
      entityType,
      entityId,
      metrics: {
        approximateMemberReach: reach,
        impressions,
        frequency: reach > 0 ? (impressions / reach).toFixed(2) : null,
      },
    };
  });

  // Calculate account totals
  const accountTotals = results.reduce(
    (acc, r) => ({
      totalReach: acc.totalReach + r.metrics.approximateMemberReach,
      totalImpressions: acc.totalImpressions + r.metrics.impressions,
    }),
    { totalReach: 0, totalImpressions: 0 }
  );

  return {
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
    entities: results,
    accountTotals: {
      ...accountTotals,
      averageFrequency:
        accountTotals.totalReach > 0
          ? (accountTotals.totalImpressions / accountTotals.totalReach).toFixed(2)
          : null,
    },
    note: 'Reach data requires a date range of 92 days or less.',
  };
}

export async function handleListSavedAudiences(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as ListSavedAudiencesInput;

  if (!input.accountId) {
    throw new Error('accountId is required');
  }

  const audiences = await client.listSavedAudiences(input.accountId, {
    status: input.status,
    type: input.audienceType,
  });

  return {
    audiences: audiences.map(audience => ({
      id: audience.id,
      name: audience.name,
      type: audience.type,
      status: audience.status,
      memberCount: audience.memberCount,
      matchRate: audience.matchRate,
      createdAt: new Date(audience.createdAt).toISOString(),
      lastModified: new Date(audience.lastModified).toISOString(),
    })),
    totalCount: audiences.length,
  };
}
