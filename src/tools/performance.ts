import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import {
  GetCampaignPerformanceInput,
  GetCreativePerformanceInput,
  GetCampaignGroupsInput,
  AnalyticsMetrics,
} from '../lib/types.js';

// Standard metrics that should be included in all performance reports
// Spend, Impressions, CTR, Clicks, Reach, Freq, Engagements, Engagement Rate, CPM, CPC, Conv, Conv%, Cost/Conv, Audience Penetration
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

// Legacy helper for backwards compatibility
function calculateDerivedMetrics(record: any): Record<string, number | null> {
  const metrics = calculateStandardMetrics(record);
  return {
    ctr: metrics.ctr,
    cpc: metrics.cpc,
    cpm: metrics.cpm,
    conversionRate: metrics.conversionRate,
    costPerConversion: metrics.costPerConversion,
    engagementRate: metrics.engagementRate,
    reach: metrics.reach,
    frequency: metrics.frequency,
  };
}

// Tool definitions
export const getCampaignPerformanceTool: Tool = {
  name: 'get_campaign_performance',
  description: 'Retrieves performance metrics for campaigns within a specified date range. Returns key metrics like impressions, clicks, spend, CTR, and conversions. The primary tool for daily campaign monitoring and optimization decisions.',
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
        description: 'Specific campaign IDs to filter. If omitted, returns all campaigns.',
      },
      campaignGroupIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by campaign group IDs',
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Default: today',
      },
      timeGranularity: {
        type: 'string',
        enum: ['ALL', 'DAILY', 'MONTHLY'],
        description: 'Time granularity for the data. Default: ALL',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

export const getCreativePerformanceTool: Tool = {
  name: 'get_creative_performance',
  description: 'Retrieves performance metrics for individual ad creatives. Shows which specific ads are performing best, including engagement metrics (likes, comments, shares) and video metrics. Essential for creative optimization.',
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
        description: 'Filter creatives by campaign IDs',
      },
      creativeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific creative IDs to fetch',
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Default: today',
      },
      timeGranularity: {
        type: 'string',
        enum: ['ALL', 'DAILY'],
        description: 'Time granularity. Default: ALL',
      },
      includeVideoMetrics: {
        type: 'boolean',
        description: 'Include video-specific metrics. Default: true',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

export const getCampaignGroupsTool: Tool = {
  name: 'get_campaign_groups',
  description: 'Lists all campaign groups for an account with their configuration and optionally aggregated performance. Campaign groups help organize campaigns and control budget at a higher level.',
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
          enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'],
        },
        description: 'Filter by status',
      },
      includePerformance: {
        type: 'boolean',
        description: 'Include performance metrics. Default: true',
      },
      startDate: {
        type: 'string',
        description: 'Start date for performance (if included)',
      },
      endDate: {
        type: 'string',
        description: 'End date for performance (if included)',
      },
    },
    required: ['accountId'],
  },
};

// Tool handlers
export async function handleGetCampaignPerformance(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetCampaignPerformanceInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  const analytics = await client.getCampaignPerformance({
    accountId: input.accountId,
    campaignIds: input.campaignIds,
    campaignGroupIds: input.campaignGroupIds,
    startDate: input.startDate,
    endDate: input.endDate,
    timeGranularity: input.timeGranularity,
  });

  // Extract campaign IDs from analytics results and fetch them directly
  const campaignIds = analytics
    .map((record: any) => record.pivotValues?.[0]?.split(':').pop())
    .filter((id): id is string => Boolean(id));

  // Get campaign details by IDs (this handles pagination correctly)
  const campaignMap = await client.getCampaignsByIds(input.accountId, campaignIds);

  const results = analytics.map((record: any) => {
    const campaignUrn = record.pivotValues?.[0] || '';
    const campaignId = campaignUrn.split(':').pop() || '';
    const campaign = campaignMap.get(campaignId);
    const standardMetrics = calculateStandardMetrics(record);

    return {
      campaignId,
      campaignName: campaign?.name || 'Unknown',
      campaignGroupId: campaign?.campaignGroup?.split(':').pop() || null,
      status: campaign?.status || 'Unknown',
      metrics: {
        ...standardMetrics,
        landingPageClicks: record.landingPageClicks || 0,
        costInLocalCurrency: parseFloat(record.costInLocalCurrency) || 0,
      },
    };
  });

  // Calculate totals with standard metrics
  const totalRecord = results.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.metrics.impressions,
      clicks: acc.clicks + r.metrics.clicks,
      costInUsd: acc.costInUsd + r.metrics.spend,
      totalEngagements: acc.totalEngagements + r.metrics.engagements,
      externalWebsiteConversions: acc.externalWebsiteConversions + r.metrics.conversions,
      approximateUniqueImpressions: acc.approximateUniqueImpressions + r.metrics.reach,
    }),
    {
      impressions: 0, clicks: 0, costInUsd: 0, totalEngagements: 0,
      externalWebsiteConversions: 0, approximateUniqueImpressions: 0
    }
  );

  return {
    campaigns: results,
    totals: calculateStandardMetrics(totalRecord),
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
  };
}

export async function handleGetCreativePerformance(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetCreativePerformanceInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  const analytics = await client.getCreativePerformance({
    accountId: input.accountId,
    campaignIds: input.campaignIds,
    startDate: input.startDate,
    endDate: input.endDate,
    timeGranularity: input.timeGranularity,
    includeVideoMetrics: input.includeVideoMetrics,
  });

  // Extract creative IDs from analytics results
  const creativeIds = analytics
    .map((record: any) => record.pivotValues?.[0]?.split(':').pop())
    .filter((id): id is string => Boolean(id));

  // Fetch creative details to get names
  const creativeMap = await client.getCreativesByIds(input.accountId, creativeIds);

  const results = analytics.map((record: any) => {
    const creativeUrn = record.pivotValues?.[0] || '';
    const creativeId = creativeUrn.split(':').pop() || '';
    const creative = creativeMap.get(creativeId);
    const standardMetrics = calculateStandardMetrics(record);

    // Extract creative name from the creative object
    const creativeName = creative?.name || creative?.content?.textAd?.text?.substring(0, 50) || `Creative ${creativeId}`;

    return {
      creativeId,
      creativeName,
      status: creative?.status || 'Unknown',
      metrics: {
        // Standard metrics
        ...standardMetrics,
        // Landing page clicks
        landingPageClicks: record.landingPageClicks || 0,
        // Engagement breakdown
        likes: record.likes || 0,
        comments: record.comments || 0,
        shares: record.shares || 0,
        reactions: record.reactions || 0,
        follows: record.follows || 0,
        // Video metrics (if available)
        videoViews: record.videoViews || 0,
        videoCompletions: record.videoCompletions || 0,
        videoFirstQuartileCompletions: record.videoFirstQuartileCompletions || 0,
        videoMidpointCompletions: record.videoMidpointCompletions || 0,
        videoThirdQuartileCompletions: record.videoThirdQuartileCompletions || 0,
        videoCompletionRate: record.videoViews > 0
          ? Number(((record.videoCompletions || 0) / record.videoViews * 100).toFixed(2))
          : null,
      },
    };
  });

  // Calculate totals with standard metrics
  const totalRecord = results.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.metrics.impressions,
      clicks: acc.clicks + r.metrics.clicks,
      costInUsd: acc.costInUsd + r.metrics.spend,
      totalEngagements: acc.totalEngagements + r.metrics.engagements,
      externalWebsiteConversions: acc.externalWebsiteConversions + r.metrics.conversions,
      approximateUniqueImpressions: acc.approximateUniqueImpressions + r.metrics.reach,
      likes: acc.likes + r.metrics.likes,
      comments: acc.comments + r.metrics.comments,
      shares: acc.shares + r.metrics.shares,
      videoViews: acc.videoViews + r.metrics.videoViews,
      videoCompletions: acc.videoCompletions + r.metrics.videoCompletions,
    }),
    {
      impressions: 0, clicks: 0, costInUsd: 0, totalEngagements: 0,
      externalWebsiteConversions: 0, approximateUniqueImpressions: 0,
      likes: 0, comments: 0, shares: 0, videoViews: 0, videoCompletions: 0
    }
  );

  const totals = {
    ...calculateStandardMetrics(totalRecord),
    likes: totalRecord.likes,
    comments: totalRecord.comments,
    shares: totalRecord.shares,
    videoViews: totalRecord.videoViews,
    videoCompletions: totalRecord.videoCompletions,
    videoCompletionRate: totalRecord.videoViews > 0
      ? Number((totalRecord.videoCompletions / totalRecord.videoViews * 100).toFixed(2))
      : null,
  };

  return {
    creatives: results,
    totals,
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
  };
}

export async function handleGetCampaignGroups(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetCampaignGroupsInput;

  if (!input.accountId) {
    throw new Error('accountId is required');
  }

  const groups = await client.listCampaignGroups(input.accountId, {
    status: input.status,
  });

  // Get campaign counts per group
  const campaigns = await client.listCampaigns(input.accountId);
  const campaignCountByGroup = campaigns.reduce((acc, c) => {
    const groupId = c.campaignGroup?.split(':').pop() || '';
    acc[groupId] = (acc[groupId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get performance if requested
  let performanceByGroup: Record<string, StandardMetrics> = {};
  if (input.includePerformance !== false && input.startDate) {
    const analytics = await client.getCampaignGroupPerformance({
      accountId: input.accountId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    performanceByGroup = analytics.reduce((acc, record: any) => {
      const groupUrn = record.pivotValues?.[0] || '';
      const groupId = groupUrn.split(':').pop() || '';
      acc[groupId] = calculateStandardMetrics(record);
      return acc;
    }, {} as Record<string, StandardMetrics>);
  }

  return {
    campaignGroups: groups.map(group => ({
      id: group.id,
      name: group.name,
      status: group.status,
      totalBudget: group.totalBudget,
      runSchedule: group.runSchedule
        ? {
            start: group.runSchedule.start
              ? new Date(group.runSchedule.start).toISOString()
              : null,
            end: group.runSchedule.end
              ? new Date(group.runSchedule.end).toISOString()
              : null,
          }
        : null,
      campaignCount: campaignCountByGroup[group.id] || 0,
      performance: performanceByGroup[group.id] || null,
    })),
  };
}
