import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import { ComparePerformanceInput, GetDailyTrendsInput } from '../lib/types.js';

// Tool definitions
export const comparePerformanceTool: Tool = {
  name: 'compare_performance',
  description: 'Compares performance between two time periods, campaigns, or campaign groups. Calculates percentage changes and highlights significant differences. Essential for reporting on performance trends.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'The LinkedIn Ad Account ID',
      },
      comparisonType: {
        type: 'string',
        enum: ['TIME_PERIOD', 'CAMPAIGNS', 'CAMPAIGN_GROUPS'],
        description: 'Type of comparison to make',
      },
      periodA: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date for period A (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'End date for period A (YYYY-MM-DD)',
          },
          entityIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Entity IDs for comparison (campaigns or campaign groups)',
          },
        },
        description: 'First period or entity set for comparison',
      },
      periodB: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date for period B (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'End date for period B (YYYY-MM-DD)',
          },
          entityIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Entity IDs for comparison (campaigns or campaign groups)',
          },
        },
        description: 'Second period or entity set for comparison',
      },
    },
    required: ['accountId', 'comparisonType', 'periodA', 'periodB'],
  },
};

export const getDailyTrendsTool: Tool = {
  name: 'get_daily_trends',
  description: 'Retrieves daily performance trends over a specified period. Returns time-series data for visualizing performance patterns, identifying anomalies, and understanding day-of-week effects.',
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
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Default: today',
      },
      metrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'Metrics to include. Default: impressions, clicks, costInUsd, conversions',
      },
      entityLevel: {
        type: 'string',
        enum: ['ACCOUNT', 'CAMPAIGN_GROUP', 'CAMPAIGN'],
        description: 'Level of aggregation. Default: ACCOUNT',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

// Helper to calculate percentage change
function calculatePercentageChange(oldVal: number, newVal: number): number | null {
  if (oldVal === 0) return newVal > 0 ? 100 : null;
  return ((newVal - oldVal) / oldVal) * 100;
}

// Helper to format date for display
function formatDateForLabel(startDate: string, endDate?: string): string {
  const start = new Date(startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const end = endDate
    ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Today';
  return `${start} - ${end}`;
}

// Tool handlers
export async function handleComparePerformance(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as ComparePerformanceInput;

  if (!input.accountId || !input.comparisonType || !input.periodA || !input.periodB) {
    throw new Error('accountId, comparisonType, periodA, and periodB are required');
  }

  let metricsA: Record<string, number>;
  let metricsB: Record<string, number>;
  let labelA: string;
  let labelB: string;

  if (input.comparisonType === 'TIME_PERIOD') {
    // Compare same account/campaigns across two time periods
    if (!input.periodA.startDate || !input.periodB.startDate) {
      throw new Error('startDate is required for both periods in TIME_PERIOD comparison');
    }

    const [analyticsA, analyticsB] = await Promise.all([
      client.getAnalytics({
        accountId: input.accountId,
        pivot: 'ACCOUNT',
        startDate: input.periodA.startDate,
        endDate: input.periodA.endDate,
        timeGranularity: 'ALL',
      }),
      client.getAnalytics({
        accountId: input.accountId,
        pivot: 'ACCOUNT',
        startDate: input.periodB.startDate,
        endDate: input.periodB.endDate,
        timeGranularity: 'ALL',
      }),
    ]);

    metricsA = aggregateMetrics(analyticsA);
    metricsB = aggregateMetrics(analyticsB);
    labelA = formatDateForLabel(input.periodA.startDate, input.periodA.endDate);
    labelB = formatDateForLabel(input.periodB.startDate, input.periodB.endDate);
  } else if (input.comparisonType === 'CAMPAIGNS') {
    // Compare two sets of campaigns
    if (!input.periodA.entityIds?.length || !input.periodB.entityIds?.length) {
      throw new Error('entityIds are required for both periods in CAMPAIGNS comparison');
    }

    const startDate = input.periodA.startDate || getDefaultStartDate();
    const endDate = input.periodA.endDate;

    const [analyticsA, analyticsB] = await Promise.all([
      client.getCampaignPerformance({
        accountId: input.accountId,
        campaignIds: input.periodA.entityIds,
        startDate,
        endDate,
      }),
      client.getCampaignPerformance({
        accountId: input.accountId,
        campaignIds: input.periodB.entityIds,
        startDate,
        endDate,
      }),
    ]);

    metricsA = aggregateMetrics(analyticsA);
    metricsB = aggregateMetrics(analyticsB);
    labelA = `Campaigns: ${input.periodA.entityIds.join(', ')}`;
    labelB = `Campaigns: ${input.periodB.entityIds.join(', ')}`;
  } else {
    // CAMPAIGN_GROUPS comparison
    if (!input.periodA.entityIds?.length || !input.periodB.entityIds?.length) {
      throw new Error('entityIds are required for both periods in CAMPAIGN_GROUPS comparison');
    }

    const startDate = input.periodA.startDate || getDefaultStartDate();
    const endDate = input.periodA.endDate;

    const [analyticsA, analyticsB] = await Promise.all([
      client.getCampaignPerformance({
        accountId: input.accountId,
        campaignGroupIds: input.periodA.entityIds,
        startDate,
        endDate,
      }),
      client.getCampaignPerformance({
        accountId: input.accountId,
        campaignGroupIds: input.periodB.entityIds,
        startDate,
        endDate,
      }),
    ]);

    metricsA = aggregateMetrics(analyticsA);
    metricsB = aggregateMetrics(analyticsB);
    labelA = `Campaign Groups: ${input.periodA.entityIds.join(', ')}`;
    labelB = `Campaign Groups: ${input.periodB.entityIds.join(', ')}`;
  }

  // Calculate changes
  const changes: Record<string, { absolute: number; percentage: number | null }> = {};
  const metricKeys = ['impressions', 'clicks', 'costInUsd', 'conversions'];

  for (const key of metricKeys) {
    const valA = metricsA[key] || 0;
    const valB = metricsB[key] || 0;
    changes[key] = {
      absolute: valB - valA,
      percentage: calculatePercentageChange(valA, valB),
    };
  }

  // Add derived metrics
  const ctrA = metricsA.impressions > 0 ? (metricsA.clicks / metricsA.impressions) * 100 : 0;
  const ctrB = metricsB.impressions > 0 ? (metricsB.clicks / metricsB.impressions) * 100 : 0;
  changes['ctr'] = {
    absolute: ctrB - ctrA,
    percentage: calculatePercentageChange(ctrA, ctrB),
  };

  const cpcA = metricsA.clicks > 0 ? metricsA.costInUsd / metricsA.clicks : 0;
  const cpcB = metricsB.clicks > 0 ? metricsB.costInUsd / metricsB.clicks : 0;
  changes['costPerClick'] = {
    absolute: cpcB - cpcA,
    percentage: calculatePercentageChange(cpcA, cpcB),
  };

  // Generate insights
  const insights: string[] = [];
  if (changes.impressions.percentage !== null && Math.abs(changes.impressions.percentage) > 10) {
    const direction = changes.impressions.percentage > 0 ? 'increased' : 'decreased';
    insights.push(`Impressions ${direction} by ${Math.abs(changes.impressions.percentage).toFixed(1)}%`);
  }
  if (changes.ctr.percentage !== null && Math.abs(changes.ctr.percentage) > 10) {
    const direction = changes.ctr.percentage > 0 ? 'improved' : 'declined';
    insights.push(`CTR ${direction} by ${Math.abs(changes.ctr.percentage).toFixed(1)}%`);
  }
  if (changes.costPerClick.percentage !== null && Math.abs(changes.costPerClick.percentage) > 10) {
    const direction = changes.costPerClick.percentage > 0 ? 'increased' : 'decreased';
    insights.push(`Cost per click ${direction} by ${Math.abs(changes.costPerClick.percentage).toFixed(1)}%`);
  }

  return {
    comparisonType: input.comparisonType,
    periodA: {
      label: labelA,
      metrics: {
        impressions: metricsA.impressions || 0,
        clicks: metricsA.clicks || 0,
        costInUsd: metricsA.costInUsd || 0,
        conversions: metricsA.conversions || 0,
        ctr: ctrA.toFixed(2),
        costPerClick: cpcA.toFixed(2),
      },
    },
    periodB: {
      label: labelB,
      metrics: {
        impressions: metricsB.impressions || 0,
        clicks: metricsB.clicks || 0,
        costInUsd: metricsB.costInUsd || 0,
        conversions: metricsB.conversions || 0,
        ctr: ctrB.toFixed(2),
        costPerClick: cpcB.toFixed(2),
      },
    },
    changes,
    insights,
  };
}

export async function handleGetDailyTrends(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetDailyTrendsInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  const pivot = input.entityLevel === 'CAMPAIGN'
    ? 'CAMPAIGN'
    : input.entityLevel === 'CAMPAIGN_GROUP'
      ? 'CAMPAIGN_GROUP'
      : 'ACCOUNT';

  const analytics = await client.getAnalytics({
    accountId: input.accountId,
    pivot: pivot as 'ACCOUNT' | 'CAMPAIGN' | 'CAMPAIGN_GROUP',
    startDate: input.startDate,
    endDate: input.endDate,
    timeGranularity: 'DAILY',
    campaigns: input.campaignIds,
  });

  // Group by date
  const byDate = new Map<string, Record<string, number>>();

  for (const record of analytics as any[]) {
    if (record.dateRange) {
      const date = `${record.dateRange.start.year}-${String(record.dateRange.start.month).padStart(2, '0')}-${String(record.dateRange.start.day).padStart(2, '0')}`;

      if (!byDate.has(date)) {
        byDate.set(date, { impressions: 0, clicks: 0, costInUsd: 0, conversions: 0 });
      }

      const metrics = byDate.get(date)!;
      metrics.impressions += record.impressions || 0;
      metrics.clicks += record.clicks || 0;
      metrics.costInUsd += parseFloat(record.costInUsd) || 0;
      metrics.conversions += record.externalWebsiteConversions || 0;
    }
  }

  // Convert to array and sort by date
  const dataPoints = Array.from(byDate.entries())
    .map(([date, metrics]) => ({
      date,
      metrics: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        costInUsd: Number(metrics.costInUsd.toFixed(2)),
        conversions: metrics.conversions,
        ctr: metrics.impressions > 0
          ? Number(((metrics.clicks / metrics.impressions) * 100).toFixed(2))
          : 0,
        costPerConversion: metrics.conversions > 0
          ? Number((metrics.costInUsd / metrics.conversions).toFixed(2))
          : null,
      },
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate summary statistics
  const totals = dataPoints.reduce(
    (acc, dp) => ({
      impressions: acc.impressions + dp.metrics.impressions,
      clicks: acc.clicks + dp.metrics.clicks,
      costInUsd: acc.costInUsd + dp.metrics.costInUsd,
      conversions: acc.conversions + dp.metrics.conversions,
    }),
    { impressions: 0, clicks: 0, costInUsd: 0, conversions: 0 }
  );

  const averageDaily = {
    impressions: dataPoints.length > 0 ? Math.round(totals.impressions / dataPoints.length) : 0,
    clicks: dataPoints.length > 0 ? Math.round(totals.clicks / dataPoints.length) : 0,
    costInUsd:
      dataPoints.length > 0 ? Number((totals.costInUsd / dataPoints.length).toFixed(2)) : 0,
    conversions:
      dataPoints.length > 0 ? Number((totals.conversions / dataPoints.length).toFixed(2)) : 0,
  };

  // Find peak and lowest days
  let peakDay = dataPoints[0];
  let lowestDay = dataPoints[0];

  for (const dp of dataPoints) {
    if (dp.metrics.impressions > (peakDay?.metrics.impressions || 0)) {
      peakDay = dp;
    }
    if (dp.metrics.impressions < (lowestDay?.metrics.impressions || Infinity)) {
      lowestDay = dp;
    }
  }

  // Calculate weekday averages
  const weekdayData: Record<string, { impressions: number[]; clicks: number[] }> = {
    sunday: { impressions: [], clicks: [] },
    monday: { impressions: [], clicks: [] },
    tuesday: { impressions: [], clicks: [] },
    wednesday: { impressions: [], clicks: [] },
    thursday: { impressions: [], clicks: [] },
    friday: { impressions: [], clicks: [] },
    saturday: { impressions: [], clicks: [] },
  };

  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (const dp of dataPoints) {
    const dayOfWeek = new Date(dp.date).getDay();
    const weekday = weekdayNames[dayOfWeek];
    weekdayData[weekday].impressions.push(dp.metrics.impressions);
    weekdayData[weekday].clicks.push(dp.metrics.clicks);
  }

  const weekdayAverages: Record<string, { avgImpressions: number; avgClicks: number }> = {};
  for (const [day, data] of Object.entries(weekdayData)) {
    weekdayAverages[day] = {
      avgImpressions:
        data.impressions.length > 0
          ? Math.round(data.impressions.reduce((a, b) => a + b, 0) / data.impressions.length)
          : 0,
      avgClicks:
        data.clicks.length > 0
          ? Math.round(data.clicks.reduce((a, b) => a + b, 0) / data.clicks.length)
          : 0,
    };
  }

  return {
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
    granularity: 'DAILY',
    dataPoints,
    summary: {
      averageDaily,
      peakDay: peakDay
        ? { date: peakDay.date, impressions: peakDay.metrics.impressions }
        : null,
      lowestDay: lowestDay
        ? { date: lowestDay.date, impressions: lowestDay.metrics.impressions }
        : null,
      weekdayAverages,
      totals,
    },
  };
}

// Helper function to aggregate metrics from analytics records
// Note: LinkedIn API returns metrics directly on the record (not nested under .metrics)
function aggregateMetrics(records: any[]): Record<string, number> {
  return records.reduce(
    (acc, r) => ({
      impressions: acc.impressions + (r.impressions || 0),
      clicks: acc.clicks + (r.clicks || 0),
      costInUsd: acc.costInUsd + (parseFloat(r.costInUsd) || 0),
      conversions: acc.conversions + (r.externalWebsiteConversions || 0),
    }),
    { impressions: 0, clicks: 0, costInUsd: 0, conversions: 0 }
  );
}

// Helper to get default start date (30 days ago)
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
