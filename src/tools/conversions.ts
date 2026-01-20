import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import {
  GetConversionPerformanceInput,
  ListConversionsInput,
  GetLeadGenPerformanceInput,
  ListLeadFormsInput,
} from '../lib/types.js';

// Tool definitions
export const getConversionPerformanceTool: Tool = {
  name: 'get_conversion_performance',
  description: 'Retrieves conversion metrics broken down by conversion type/action. Shows which conversions are being driven by which campaigns, with cost per conversion and conversion value.',
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
      includePostView: {
        type: 'boolean',
        description: 'Include view-through conversions. Default: true',
      },
      timeGranularity: {
        type: 'string',
        enum: ['ALL', 'DAILY'],
        description: 'Time granularity. Default: ALL',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

export const listConversionsTool: Tool = {
  name: 'list_conversions',
  description: 'Lists all conversion tracking rules configured for an account. Shows conversion names, types, attribution windows, and enabled status.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'The LinkedIn Ad Account ID',
      },
      enabledOnly: {
        type: 'boolean',
        description: 'Only show enabled conversions. Default: false',
      },
    },
    required: ['accountId'],
  },
};

export const getLeadGenPerformanceTool: Tool = {
  name: 'get_lead_gen_performance',
  description: 'Retrieves lead generation form performance including form submissions, qualified leads, and cost per lead. Essential for B2B marketers running lead gen campaigns.',
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
      timeGranularity: {
        type: 'string',
        enum: ['ALL', 'DAILY'],
        description: 'Time granularity. Default: ALL',
      },
    },
    required: ['accountId', 'startDate'],
  },
};

export const listLeadFormsTool: Tool = {
  name: 'list_lead_forms',
  description: 'Lists all lead generation forms configured for an account with their questions and settings. Helps understand what forms are available and their configuration.',
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
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
        },
        description: 'Filter by status',
      },
      includeQuestions: {
        type: 'boolean',
        description: 'Include form questions. Default: true',
      },
    },
    required: ['accountId'],
  },
};

// Tool handlers
export async function handleGetConversionPerformance(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetConversionPerformanceInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  const analytics = await client.getConversionPerformance({
    accountId: input.accountId,
    campaignIds: input.campaignIds,
    startDate: input.startDate,
    endDate: input.endDate,
    includePostView: input.includePostView,
    timeGranularity: input.timeGranularity,
  });

  // Get conversion definitions for names
  const conversionDefs = await client.listConversions(input.accountId);
  const conversionMap = new Map(conversionDefs.map(c => [c.id, c]));

  const results = analytics.map((record: any) => {
    const conversionUrn = record.pivotValues?.[0] || '';
    const conversionId = conversionUrn.split(':').pop() || '';
    const conversionDef = conversionMap.get(conversionId);

    const totalConversions = record.externalWebsiteConversions || 0;
    const postClickConversions = record.externalWebsitePostClickConversions || 0;
    const postViewConversions = record.externalWebsitePostViewConversions || 0;
    const cost = parseFloat(record.costInUsd) || 0;
    const conversionValue = parseFloat(record.conversionValueInLocalCurrency) || 0;

    return {
      conversionId,
      conversionName: conversionDef?.name || 'Unknown',
      conversionType: conversionDef?.type || 'Unknown',
      metrics: {
        totalConversions,
        postClickConversions,
        postViewConversions,
        conversionValue,
        costPerConversion: totalConversions > 0 ? cost / totalConversions : null,
      },
    };
  });

  // Calculate totals
  const totals = results.reduce(
    (acc, r) => ({
      totalConversions: acc.totalConversions + r.metrics.totalConversions,
      totalValue: acc.totalValue + r.metrics.conversionValue,
      totalCost: acc.totalCost + (r.metrics.costPerConversion || 0) * r.metrics.totalConversions,
    }),
    { totalConversions: 0, totalValue: 0, totalCost: 0 }
  );

  return {
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
    conversions: results,
    totals: {
      ...totals,
      overallCostPerConversion:
        totals.totalConversions > 0 ? totals.totalCost / totals.totalConversions : null,
    },
  };
}

export async function handleListConversions(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as ListConversionsInput;

  if (!input.accountId) {
    throw new Error('accountId is required');
  }

  const conversions = await client.listConversions(input.accountId, input.enabledOnly);

  return {
    conversions: conversions.map(conversion => ({
      id: conversion.id,
      name: conversion.name,
      type: conversion.type,
      conversionMethod: conversion.conversionMethod || 'INSIGHT_TAG',
      enabled: conversion.enabled,
      postClickAttributionWindow: conversion.postClickAttributionWindowSize,
      viewThroughAttributionWindow: conversion.viewThroughAttributionWindowSize,
      attributionType: conversion.attributionType,
    })),
    totalCount: conversions.length,
  };
}

export async function handleGetLeadGenPerformance(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as GetLeadGenPerformanceInput;

  if (!input.accountId || !input.startDate) {
    throw new Error('accountId and startDate are required');
  }

  const analytics = await client.getLeadGenPerformance({
    accountId: input.accountId,
    campaignIds: input.campaignIds,
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

    const leads = record.oneClickLeads || 0;
    const formOpens = record.oneClickLeadFormOpens || 0;
    const qualifiedLeads = record.qualifiedLeads || 0;
    const cost = parseFloat(record.costInUsd) || 0;

    return {
      campaignId,
      campaignName: campaign?.name || 'Unknown',
      metrics: {
        oneClickLeads: leads,
        oneClickLeadFormOpens: formOpens,
        qualifiedLeads,
        costPerLead: leads > 0 ? cost / leads : null,
        costPerQualifiedLead: qualifiedLeads > 0 ? cost / qualifiedLeads : null,
        formOpenToSubmitRate: formOpens > 0 ? ((leads / formOpens) * 100).toFixed(2) : null,
        leadQualificationRate: leads > 0 ? ((qualifiedLeads / leads) * 100).toFixed(2) : null,
      },
    };
  });

  // Calculate totals
  const totals = results.reduce(
    (acc, r) => ({
      totalLeads: acc.totalLeads + r.metrics.oneClickLeads,
      totalFormOpens: acc.totalFormOpens + r.metrics.oneClickLeadFormOpens,
      totalQualifiedLeads: acc.totalQualifiedLeads + r.metrics.qualifiedLeads,
      totalCost: acc.totalCost + (r.metrics.costPerLead || 0) * r.metrics.oneClickLeads,
    }),
    { totalLeads: 0, totalFormOpens: 0, totalQualifiedLeads: 0, totalCost: 0 }
  );

  return {
    dateRange: {
      start: input.startDate,
      end: input.endDate || new Date().toISOString().split('T')[0],
    },
    leadMetrics: {
      ...totals,
      overallCostPerLead: totals.totalLeads > 0 ? totals.totalCost / totals.totalLeads : null,
      overallFormOpenToSubmitRate:
        totals.totalFormOpens > 0
          ? ((totals.totalLeads / totals.totalFormOpens) * 100).toFixed(2)
          : null,
      overallLeadQualificationRate:
        totals.totalLeads > 0
          ? ((totals.totalQualifiedLeads / totals.totalLeads) * 100).toFixed(2)
          : null,
    },
    byCampaign: results,
  };
}

export async function handleListLeadForms(
  client: LinkedInApiClient,
  args: unknown
): Promise<unknown> {
  const input = args as ListLeadFormsInput;

  if (!input.accountId) {
    throw new Error('accountId is required');
  }

  const forms = await client.listLeadForms(input.accountId, input.status);

  return {
    forms: forms.map(form => {
      const result: Record<string, unknown> = {
        id: form.id,
        name: form.name,
        status: form.status,
        headline: form.headline,
        description: form.description,
        thankYouMessage: form.thankYouMessage,
        landingPageUrl: form.landingPageUrl,
      };

      if (input.includeQuestions !== false && form.questions) {
        result.questions = form.questions.map(q => ({
          questionId: q.questionId,
          questionType: q.questionType,
          questionText: q.questionText,
          required: q.required,
          predefinedField: q.predefinedField,
        }));
      }

      return result;
    }),
    totalCount: forms.length,
  };
}
