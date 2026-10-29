import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { LinkedInApiClient } from '../lib/linkedin-api.js';
import {
  CreateCampaignGroupInput,
  UpdateCampaignGroupInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  UpdateCreativeStatusInput,
  CreateCreativeInput,
  CreateInlineAdInput,
  DeleteCampaignInput,
  DeleteCampaignGroupInput,
  ListCampaignsInput,
  UploadImageInput,
} from '../lib/types.js';

// ==================== Campaign Group Tools ====================

export const createCampaignGroupTool: Tool = {
  name: 'create_campaign_group',
  description: 'Creates a new LinkedIn campaign group for organizing campaigns. Campaign groups manage status, budget, and performance across multiple related campaigns.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      name: { type: 'string', description: 'Name of the campaign group (max 100 characters)' },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFT'],
        description: 'Initial status. Default: DRAFT',
      },
      startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
      endDate: { type: 'string', description: 'End date in YYYY-MM-DD format. Required if totalBudget is set' },
      totalBudgetAmount: { type: 'string', description: 'Total budget amount (e.g., "5000.00")' },
      totalBudgetCurrency: { type: 'string', description: 'Budget currency code (e.g., "USD"). Must match account currency' },
      dailyBudgetAmount: { type: 'string', description: 'Daily budget amount (only with DYNAMIC budget optimization)' },
      dailyBudgetCurrency: { type: 'string', description: 'Daily budget currency code' },
      objectiveType: {
        type: 'string',
        enum: ['BRAND_AWARENESS', 'ENGAGEMENT', 'JOB_APPLICANTS', 'LEAD_GENERATION', 'WEBSITE_CONVERSIONS', 'WEBSITE_VISIT', 'VIDEO_VIEWS'],
        description: 'Campaign group objective type. Immutable once set. All campaigns in the group inherit this objective.',
      },
    },
    required: ['accountId', 'name', 'startDate'],
  },
};

export async function handleCreateCampaignGroup(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as CreateCampaignGroupInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.name) throw new Error('name is required');
  if (!input.startDate) throw new Error('startDate is required');

  const startTimestamp = new Date(input.startDate).getTime();
  const endTimestamp = input.endDate ? new Date(input.endDate).getTime() : undefined;

  const data: Parameters<typeof client.createCampaignGroup>[1] = {
    name: input.name,
    status: input.status || 'DRAFT',
    runSchedule: {
      start: startTimestamp,
      end: endTimestamp,
    },
  };

  if (input.totalBudgetAmount) {
    data.totalBudget = {
      amount: input.totalBudgetAmount,
      currencyCode: input.totalBudgetCurrency || 'USD',
    };
  }

  if (input.dailyBudgetAmount) {
    data.dailyBudget = {
      amount: input.dailyBudgetAmount,
      currencyCode: input.dailyBudgetCurrency || 'USD',
    };
  }

  if (input.objectiveType) {
    data.objectiveType = input.objectiveType;
  }

  const result = await client.createCampaignGroup(input.accountId, data);

  return {
    success: true,
    campaignGroupId: result.id,
    name: input.name,
    status: input.status || 'DRAFT',
    message: `Campaign group "${input.name}" created successfully`,
  };
}

export const updateCampaignGroupTool: Tool = {
  name: 'update_campaign_group',
  description: 'Updates an existing LinkedIn campaign group. Can change status (ACTIVE/PAUSED/ARCHIVED/DRAFT), budget, name, or end date.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignGroupId: { type: 'string', description: 'The campaign group ID to update' },
      name: { type: 'string', description: 'New name for the campaign group' },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'],
        description: 'New status. ACTIVE->PAUSED, ACTIVE->ARCHIVED, DRAFT->ACTIVE are common transitions.',
      },
      totalBudgetAmount: { type: 'string', description: 'New total budget amount' },
      totalBudgetCurrency: { type: 'string', description: 'Budget currency code' },
      endDate: { type: 'number', description: 'New end date as Unix timestamp in milliseconds' },
    },
    required: ['accountId', 'campaignGroupId'],
  },
};

export async function handleUpdateCampaignGroup(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as UpdateCampaignGroupInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignGroupId) throw new Error('campaignGroupId is required');

  const updates: Record<string, unknown> = {};

  if (input.name) updates.name = input.name;
  if (input.status) updates.status = input.status;
  if (input.totalBudgetAmount) {
    updates.totalBudget = {
      amount: input.totalBudgetAmount,
      currencyCode: input.totalBudgetCurrency || 'USD',
    };
  }
  if (input.endDate) {
    updates.runSchedule = { end: input.endDate };
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('At least one field to update must be provided');
  }

  await client.updateCampaignGroup(input.accountId, input.campaignGroupId, updates);

  return {
    success: true,
    campaignGroupId: input.campaignGroupId,
    updatedFields: Object.keys(updates),
    message: `Campaign group ${input.campaignGroupId} updated successfully`,
  };
}

export const deleteCampaignGroupTool: Tool = {
  name: 'delete_campaign_group',
  description: 'Deletes a LinkedIn campaign group. Draft groups are deleted immediately. Non-draft groups are set to PENDING_DELETION status.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignGroupId: { type: 'string', description: 'The campaign group ID to delete' },
    },
    required: ['accountId', 'campaignGroupId'],
  },
};

export async function handleDeleteCampaignGroup(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as DeleteCampaignGroupInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignGroupId) throw new Error('campaignGroupId is required');

  // First fetch the campaign group to check its current status
  const groups = await client.listCampaignGroups(input.accountId, {});
  const group = groups.find(g => String(g.id) === String(input.campaignGroupId));

  const isDraft = group?.status === 'DRAFT';
  await client.deleteCampaignGroup(input.accountId, input.campaignGroupId, isDraft);

  return {
    success: true,
    campaignGroupId: input.campaignGroupId,
    action: isDraft ? 'DELETED' : 'PENDING_DELETION',
    message: isDraft
      ? `Draft campaign group ${input.campaignGroupId} deleted`
      : `Campaign group ${input.campaignGroupId} set to PENDING_DELETION`,
  };
}

// ==================== Campaign Tools ====================

export const createCampaignTool: Tool = {
  name: 'create_campaign',
  description: 'Creates a new LinkedIn ad campaign within a campaign group. Requires targeting criteria, budget, and objective type.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      name: { type: 'string', description: 'Campaign name' },
      campaignGroupId: { type: 'string', description: 'Campaign group ID to place this campaign under' },
      objectiveType: {
        type: 'string',
        enum: ['BRAND_AWARENESS', 'ENGAGEMENT', 'JOB_APPLICANTS', 'LEAD_GENERATION', 'WEBSITE_CONVERSIONS', 'WEBSITE_VISIT', 'VIDEO_VIEWS'],
        description: 'Campaign objective type',
      },
      type: {
        type: 'string',
        enum: ['TEXT_AD', 'SPONSORED_UPDATES', 'SPONSORED_INMAILS', 'DYNAMIC'],
        description: 'Campaign type. Default: SPONSORED_UPDATES',
      },
      costType: {
        type: 'string',
        enum: ['CPM', 'CPC', 'CPV'],
        description: 'Cost/bid type. Default: CPM',
      },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFT'],
        description: 'Initial status. Default: DRAFT',
      },
      dailyBudgetAmount: { type: 'string', description: 'Daily budget amount (e.g., "50.00")' },
      dailyBudgetCurrency: { type: 'string', description: 'Currency code. Default: USD' },
      totalBudgetAmount: { type: 'string', description: 'Total/lifetime budget amount' },
      totalBudgetCurrency: { type: 'string', description: 'Currency code. Default: USD' },
      unitCostAmount: { type: 'string', description: 'Bid amount per unit (e.g., "5.00")' },
      unitCostCurrency: { type: 'string', description: 'Currency code. Default: USD' },
      localeCountry: { type: 'string', description: 'Target country code. Default: US' },
      localeLanguage: { type: 'string', description: 'Target language code. Default: en' },
      startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
      endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      targetingCriteria: {
        type: 'object',
        description: 'Targeting criteria object with include/exclude conditions. Example: {"include":{"and":[{"or":{"urn:li:adTargetingFacet:locations":["urn:li:geo:103644278"]}}]}}',
      },
      offsiteDeliveryEnabled: { type: 'boolean', description: 'Enable LinkedIn Audience Network delivery. Default: false' },
      audienceExpansionEnabled: { type: 'boolean', description: 'Enable audience expansion. Default: false' },
      creativeSelection: {
        type: 'string',
        enum: ['OPTIMIZED', 'ROUND_ROBIN'],
        description: 'Creative rotation strategy. Default: OPTIMIZED',
      },
      politicalIntent: {
        type: 'string',
        enum: ['POLITICAL', 'NOT_POLITICAL', 'NOT_DECLARED'],
        description: 'Political advertising intent. Default: NOT_POLITICAL',
      },
    },
    required: ['accountId', 'name', 'campaignGroupId', 'objectiveType', 'dailyBudgetAmount', 'unitCostAmount', 'targetingCriteria'],
  },
};

export async function handleCreateCampaign(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as CreateCampaignInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.name) throw new Error('name is required');
  if (!input.campaignGroupId) throw new Error('campaignGroupId is required');
  if (!input.objectiveType) throw new Error('objectiveType is required');
  if (!input.dailyBudgetAmount) throw new Error('dailyBudgetAmount is required');
  if (!input.unitCostAmount) throw new Error('unitCostAmount is required');
  if (!input.targetingCriteria) throw new Error('targetingCriteria is required');

  const currency = input.dailyBudgetCurrency || 'USD';

  const data: Parameters<typeof client.createCampaign>[1] = {
    name: input.name,
    campaignGroup: input.campaignGroupId,
    status: input.status || 'DRAFT',
    type: input.type || 'SPONSORED_UPDATES',
    objectiveType: input.objectiveType,
    costType: input.costType || 'CPM',
    dailyBudget: {
      amount: input.dailyBudgetAmount,
      currencyCode: currency,
    },
    unitCost: {
      amount: input.unitCostAmount,
      currencyCode: input.unitCostCurrency || currency,
    },
    locale: {
      country: input.localeCountry || 'US',
      language: input.localeLanguage || 'en',
    },
    targetingCriteria: input.targetingCriteria,
    offsiteDeliveryEnabled: input.offsiteDeliveryEnabled ?? false,
    audienceExpansionEnabled: input.audienceExpansionEnabled ?? false,
    creativeSelection: input.creativeSelection || 'OPTIMIZED',
    politicalIntent: input.politicalIntent || 'NOT_POLITICAL',
  };

  if (input.totalBudgetAmount) {
    data.totalBudget = {
      amount: input.totalBudgetAmount,
      currencyCode: input.totalBudgetCurrency || currency,
    };
  }

  if (input.startDate || input.endDate) {
    data.runSchedule = {
      start: input.startDate ? new Date(input.startDate).getTime() : Date.now(),
      end: input.endDate ? new Date(input.endDate).getTime() : undefined,
    };
  }

  const result = await client.createCampaign(input.accountId, data);

  return {
    success: true,
    campaignId: result.id,
    name: input.name,
    status: input.status || 'DRAFT',
    objectiveType: input.objectiveType,
    message: `Campaign "${input.name}" created successfully`,
  };
}

export const updateCampaignTool: Tool = {
  name: 'update_campaign',
  description: 'Updates an existing LinkedIn campaign. Can change status (ACTIVE/PAUSED/ARCHIVED), budget, name, targeting, bid amount, and other settings. Uses partial update - only specified fields are changed.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignId: { type: 'string', description: 'The campaign ID to update' },
      name: { type: 'string', description: 'New campaign name' },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'],
        description: 'New status. Common transitions: DRAFT->ACTIVE, ACTIVE->PAUSED, PAUSED->ACTIVE, ACTIVE->ARCHIVED',
      },
      dailyBudgetAmount: { type: 'string', description: 'New daily budget amount' },
      dailyBudgetCurrency: { type: 'string', description: 'Budget currency code' },
      totalBudgetAmount: { type: 'string', description: 'New total/lifetime budget amount' },
      totalBudgetCurrency: { type: 'string', description: 'Budget currency code' },
      unitCostAmount: { type: 'string', description: 'New bid amount per unit' },
      unitCostCurrency: { type: 'string', description: 'Bid currency code' },
      endDate: { type: 'number', description: 'New end date as Unix timestamp in milliseconds' },
      targetingCriteria: {
        type: 'object',
        description: 'New targeting criteria object. Replaces existing targeting entirely.',
      },
      offsiteDeliveryEnabled: { type: 'boolean', description: 'Enable/disable LinkedIn Audience Network' },
      audienceExpansionEnabled: { type: 'boolean', description: 'Enable/disable audience expansion' },
      optimizationTargetType: { type: 'string', description: 'Optimization target type' },
    },
    required: ['accountId', 'campaignId'],
  },
};

export async function handleUpdateCampaign(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as UpdateCampaignInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignId) throw new Error('campaignId is required');

  const updates: Record<string, unknown> = {};

  if (input.name) updates.name = input.name;
  if (input.status) updates.status = input.status;
  if (input.dailyBudgetAmount) {
    updates.dailyBudget = {
      amount: input.dailyBudgetAmount,
      currencyCode: input.dailyBudgetCurrency || 'USD',
    };
  }
  if (input.totalBudgetAmount) {
    updates.totalBudget = {
      amount: input.totalBudgetAmount,
      currencyCode: input.totalBudgetCurrency || 'USD',
    };
  }
  if (input.unitCostAmount) {
    updates.unitCost = {
      amount: input.unitCostAmount,
      currencyCode: input.unitCostCurrency || 'USD',
    };
  }
  if (input.endDate) {
    updates.runSchedule = { end: input.endDate };
  }
  if (input.targetingCriteria) {
    updates.targetingCriteria = input.targetingCriteria;
  }
  if (input.offsiteDeliveryEnabled !== undefined) {
    updates.offsiteDeliveryEnabled = input.offsiteDeliveryEnabled;
  }
  if (input.audienceExpansionEnabled !== undefined) {
    updates.audienceExpansionEnabled = input.audienceExpansionEnabled;
  }
  if (input.optimizationTargetType) {
    updates.optimizationTargetType = input.optimizationTargetType;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('At least one field to update must be provided');
  }

  await client.updateCampaign(input.accountId, input.campaignId, updates);

  return {
    success: true,
    campaignId: input.campaignId,
    updatedFields: Object.keys(updates),
    message: `Campaign ${input.campaignId} updated successfully`,
  };
}

export const deleteCampaignTool: Tool = {
  name: 'delete_campaign',
  description: 'Deletes a LinkedIn campaign. Draft campaigns are deleted immediately. Non-draft campaigns are set to PENDING_DELETION status.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignId: { type: 'string', description: 'The campaign ID to delete' },
    },
    required: ['accountId', 'campaignId'],
  },
};

export async function handleDeleteCampaign(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as DeleteCampaignInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignId) throw new Error('campaignId is required');

  // Fetch campaign to determine if it's a draft
  const campaign = await client.getCampaign(input.accountId, input.campaignId);
  const isDraft = campaign?.status === 'DRAFT';

  await client.deleteCampaign(input.accountId, input.campaignId, isDraft);

  return {
    success: true,
    campaignId: input.campaignId,
    action: isDraft ? 'DELETED' : 'PENDING_DELETION',
    message: isDraft
      ? `Draft campaign ${input.campaignId} deleted`
      : `Campaign ${input.campaignId} set to PENDING_DELETION`,
  };
}

// ==================== Creative Tools ====================

export const updateCreativeStatusTool: Tool = {
  name: 'update_creative_status',
  description: 'Updates the intended status of a LinkedIn creative/ad. Can activate, pause, or archive creatives.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      creativeId: { type: 'string', description: 'The creative ID (numeric ID or full URN)' },
      intendedStatus: {
        type: 'string',
        enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
        description: 'New intended status for the creative',
      },
    },
    required: ['accountId', 'creativeId', 'intendedStatus'],
  },
};

export async function handleUpdateCreativeStatus(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as UpdateCreativeStatusInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.creativeId) throw new Error('creativeId is required');
  if (!input.intendedStatus) throw new Error('intendedStatus is required');

  await client.updateCreative(input.accountId, input.creativeId, {
    intendedStatus: input.intendedStatus,
  });

  return {
    success: true,
    creativeId: input.creativeId,
    intendedStatus: input.intendedStatus,
    message: `Creative ${input.creativeId} status updated to ${input.intendedStatus}`,
  };
}

export const createCreativeTool: Tool = {
  name: 'create_creative',
  description: 'Creates a new LinkedIn creative/ad under a campaign. Requires a content reference (post/share URN) or will be created as a reference to existing content.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignId: { type: 'string', description: 'Campaign ID to create the creative under (numeric ID or full URN)' },
      contentReference: { type: 'string', description: 'URN of the content to sponsor (e.g., urn:li:share:123 or urn:li:ugcPost:123)' },
      intendedStatus: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFT'],
        description: 'Initial status. Default: DRAFT',
      },
      name: { type: 'string', description: 'Optional name for the creative' },
      leadgenFormId: { type: 'string', description: 'Lead gen form ID (required for LEAD_GENERATION objective campaigns)' },
      leadgenCallToActionLabel: {
        type: 'string',
        enum: ['APPLY', 'DOWNLOAD', 'VIEW_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE', 'REGISTER', 'REQUEST_DEMO', 'JOIN', 'ATTEND'],
        description: 'Call to action label for lead gen campaigns',
      },
    },
    required: ['accountId', 'campaignId', 'contentReference'],
  },
};

export async function handleCreateCreative(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as CreateCreativeInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignId) throw new Error('campaignId is required');
  if (!input.contentReference) throw new Error('contentReference is required');

  const data: Parameters<typeof client.createCreative>[1] = {
    campaign: input.campaignId,
    content: { reference: input.contentReference },
    intendedStatus: input.intendedStatus || 'DRAFT',
  };

  if (input.name) data.name = input.name;

  if (input.leadgenFormId) {
    data.leadgenCallToAction = {
      destination: input.leadgenFormId.startsWith('urn:') ? input.leadgenFormId : `urn:li:adForm:${input.leadgenFormId}`,
      label: input.leadgenCallToActionLabel || 'LEARN_MORE',
    };
  }

  const result = await client.createCreative(input.accountId, data);

  return {
    success: true,
    creativeId: result.id,
    campaignId: input.campaignId,
    intendedStatus: input.intendedStatus || 'DRAFT',
    message: `Creative created successfully under campaign ${input.campaignId}`,
  };
}

// ==================== Inline Ad Creation ====================

export const createInlineAdTool: Tool = {
  name: 'create_inline_ad',
  description: 'Creates a new LinkedIn ad with inline content directly (without needing a pre-existing post). This creates the ad content (text, image/video, landing page, CTA) and the creative in a single call. Use this to create sponsored content ads from scratch.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignId: { type: 'string', description: 'Campaign ID to create the ad under (numeric ID or full URN)' },
      organizationId: { type: 'string', description: 'Organization/company ID that will be the ad author (numeric ID or full URN like urn:li:organization:123)' },
      commentary: { type: 'string', description: 'The ad text/copy that appears as the post commentary' },
      mediaId: {
        type: 'string',
        description: 'URN of the image or video to use (e.g., urn:li:image:C5510AQE... or urn:li:video:C5510AQE...). Upload media first via LinkedIn\'s media upload APIs.',
      },
      mediaTitle: { type: 'string', description: 'Title for the media (displayed as headline for videos)' },
      landingPageUrl: { type: 'string', description: 'Landing page URL for the ad. Required for WEBSITE_VISIT and WEBSITE_CONVERSIONS campaign objectives.' },
      callToActionLabel: {
        type: 'string',
        enum: ['APPLY', 'DOWNLOAD', 'VIEW_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE', 'REGISTER', 'REQUEST_DEMO', 'JOIN', 'ATTEND'],
        description: 'Call to action button label',
      },
      intendedStatus: {
        type: 'string',
        enum: ['ACTIVE', 'DRAFT'],
        description: 'Initial status. Default: DRAFT',
      },
      name: { type: 'string', description: 'Name for the creative (for internal reference in Campaign Manager)' },
      leadgenFormId: { type: 'string', description: 'Lead gen form ID (required for LEAD_GENERATION objective campaigns)' },
      leadgenCallToActionLabel: {
        type: 'string',
        enum: ['APPLY', 'DOWNLOAD', 'VIEW_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE', 'REGISTER', 'REQUEST_DEMO', 'JOIN', 'ATTEND'],
        description: 'Call to action label for lead gen form button',
      },
    },
    required: ['accountId', 'campaignId', 'organizationId', 'commentary'],
  },
};

export async function handleCreateInlineAd(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as CreateInlineAdInput;

  if (!input.accountId) throw new Error('accountId is required');
  if (!input.campaignId) throw new Error('campaignId is required');
  if (!input.organizationId) throw new Error('organizationId is required');
  if (!input.commentary) throw new Error('commentary is required');

  const data: Parameters<typeof client.createInlineCreative>[1] = {
    campaign: input.campaignId,
    intendedStatus: input.intendedStatus || 'DRAFT',
    organizationId: input.organizationId,
    commentary: input.commentary,
  };

  if (input.mediaId) data.mediaId = input.mediaId;
  if (input.mediaTitle) data.mediaTitle = input.mediaTitle;
  if (input.landingPageUrl) data.landingPageUrl = input.landingPageUrl;
  if (input.callToActionLabel) data.callToActionLabel = input.callToActionLabel;
  if (input.name) data.name = input.name;

  if (input.leadgenFormId) {
    data.leadgenCallToAction = {
      destination: input.leadgenFormId.startsWith('urn:') ? input.leadgenFormId : `urn:li:adForm:${input.leadgenFormId}`,
      label: input.leadgenCallToActionLabel || 'LEARN_MORE',
    };
  }

  const result = await client.createInlineCreative(input.accountId, data);

  return {
    success: true,
    creativeId: result.id,
    campaignId: input.campaignId,
    intendedStatus: input.intendedStatus || 'DRAFT',
    message: `Inline ad created successfully under campaign ${input.campaignId}`,
  };
}

// ==================== List Campaigns ====================

export const listCampaignsTool: Tool = {
  name: 'list_campaigns',
  description: 'Lists campaigns for a LinkedIn Ad Account. Unlike get_campaign_performance (which only returns campaigns with analytics data), this tool returns ALL campaigns including DRAFT and PAUSED campaigns with zero impressions. Supports filtering by campaign group and status.',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: { type: 'string', description: 'The LinkedIn Ad Account ID' },
      campaignGroupIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by campaign group IDs (numeric IDs)',
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'COMPLETED', 'DRAFT', 'CANCELED', 'REMOVED'],
        },
        description: 'Filter by campaign status. If omitted, returns all statuses.',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum campaigns to return (default 1000). Large accounts hold thousands; the response sets truncated=true when the cap is hit.',
      },
    },
    required: ['accountId'],
  },
};

export async function handleListCampaigns(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as ListCampaignsInput;

  if (!input.accountId) throw new Error('accountId is required');

  const maxResults = input.maxResults ?? 1000;
  const campaigns = await client.listCampaigns(input.accountId, {
    campaignGroupIds: input.campaignGroupIds,
    status: input.status,
    maxResults,
  });

  return {
    campaigns: campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      type: c.type,
      objectiveType: c.objectiveType,
      costType: c.costType,
      campaignGroup: c.campaignGroup,
      dailyBudget: c.dailyBudget,
      totalBudget: c.totalBudget,
      runSchedule: c.runSchedule,
    })),
    totalCount: campaigns.length,
    truncated: campaigns.length >= maxResults,
  };
}

// ==================== Image Upload ====================

export const uploadImageTool: Tool = {
  name: 'upload_image',
  description: 'Uploads an image file to LinkedIn for use in ads. Supports PNG, JPG, and GIF formats. Returns the image URN that can be used as the mediaId when creating inline ads. The image is uploaded in two steps: initialize upload (get URL + URN), then upload binary.',
  inputSchema: {
    type: 'object',
    properties: {
      organizationId: {
        type: 'string',
        description: 'Owner of the image. Can be an organization URN (urn:li:organization:123) or a sponsored account URN (urn:li:sponsoredAccount:123). Use sponsoredAccount if you only have rw_ads permissions.',
      },
      filePath: {
        type: 'string',
        description: 'Absolute path to the image file on the local filesystem',
      },
      accountId: {
        type: 'string',
        description: 'Optional: LinkedIn Ad Account ID to register the image in the account media library',
      },
      assetName: {
        type: 'string',
        description: 'Optional: Name for the asset in the media library (required if accountId is provided)',
      },
    },
    required: ['organizationId', 'filePath'],
  },
};

export async function handleUploadImage(client: LinkedInApiClient, args: unknown): Promise<unknown> {
  const input = args as UploadImageInput;

  if (!input.organizationId) throw new Error('organizationId is required');
  if (!input.filePath) throw new Error('filePath is required');

  const result = await client.uploadImage({
    owner: input.organizationId,
    filePath: input.filePath,
    accountId: input.accountId,
    assetName: input.assetName,
  });

  return {
    success: true,
    imageUrn: result.imageUrn,
    message: `Image uploaded successfully. Use imageUrn "${result.imageUrn}" as the mediaId when creating ads.`,
  };
}
