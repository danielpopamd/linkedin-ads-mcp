// LinkedIn API Types

export interface LinkedInTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
  token_type: string;
  expires_at: number; // Unix timestamp when token expires
}

export interface AdAccount {
  id: string;
  name: string;
  currency: string;
  type: 'BUSINESS' | 'ENTERPRISE';
  status: 'ACTIVE' | 'DRAFT' | 'CANCELED' | 'PENDING_DELETION' | 'REMOVED';
  servingStatuses: string[];
  reference: string;
  notifiedOnCampaignOptimization: boolean;
  notifiedOnCreativeApproval: boolean;
  notifiedOnCreativeRejection: boolean;
  notifiedOnEndOfCampaign: boolean;
  test: boolean;
  version?: {
    versionTag: string;
  };
}

export interface CampaignGroup {
  id: string;
  account: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT' | 'CANCELED';
  runSchedule?: {
    start: number;
    end?: number;
  };
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
}

export interface Campaign {
  id: string;
  account: string;
  campaignGroup: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT' | 'CANCELED';
  type: string;
  objectiveType: string;
  costType: string;
  dailyBudget?: {
    amount: string;
    currencyCode: string;
  };
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
  runSchedule?: {
    start: number;
    end?: number;
  };
}

export interface Creative {
  id: string;
  campaign: string;
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED' | 'CANCELED';
  type: string;
  review?: {
    status: string;
    reviewedAt?: number;
  };
}

// Analytics Types
export interface DateRange {
  start: {
    year: number;
    month: number;
    day: number;
  };
  end: {
    year: number;
    month: number;
    day: number;
  };
}

export interface AnalyticsMetrics {
  impressions?: number;
  clicks?: number;
  landingPageClicks?: number;
  totalEngagements?: number;
  costInUsd?: number;
  costInLocalCurrency?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  reactions?: number;
  follows?: number;
  companyPageClicks?: number;
  externalWebsiteConversions?: number;
  externalWebsitePostClickConversions?: number;
  externalWebsitePostViewConversions?: number;
  oneClickLeads?: number;
  oneClickLeadFormOpens?: number;
  qualifiedLeads?: number;
  videoViews?: number;
  videoStarts?: number;
  videoCompletions?: number;
  videoFirstQuartileCompletions?: number;
  videoMidpointCompletions?: number;
  videoThirdQuartileCompletions?: number;
  approximateMemberReach?: number;
  approximateUniqueImpressions?: number;
  audiencePenetration?: number;
  conversionValueInLocalCurrency?: number;
}

export interface AnalyticsRecord {
  pivotValues: string[];
  dateRange?: DateRange;
  metrics: AnalyticsMetrics;
}

export type DemographicPivot =
  | 'MEMBER_JOB_FUNCTION'
  | 'MEMBER_SENIORITY'
  | 'MEMBER_INDUSTRY'
  | 'MEMBER_COMPANY_SIZE'
  | 'MEMBER_JOB_TITLE'
  | 'MEMBER_COMPANY'
  | 'MEMBER_COUNTRY'
  | 'MEMBER_COUNTRY_V2'
  | 'MEMBER_REGION'
  | 'MEMBER_REGION_V2';

export type EntityPivot =
  | 'ACCOUNT'
  | 'CAMPAIGN_GROUP'
  | 'CAMPAIGN'
  | 'CREATIVE'
  | 'CONVERSION';

export type TimeGranularity = 'ALL' | 'DAILY' | 'MONTHLY' | 'YEARLY';

// Conversion Types
export interface Conversion {
  id: string;
  name: string;
  account: string;
  type: string;
  enabled: boolean;
  postClickAttributionWindowSize: number;
  viewThroughAttributionWindowSize: number;
  attributionType: string;
  conversionMethod?: string;
}

// Lead Gen Types
export interface LeadGenForm {
  id: string;
  name: string;
  account: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'ARCHIVED';
  headline: string;
  description?: string;
  thankYouMessage: string;
  landingPageUrl?: string;
  questions?: LeadGenFormQuestion[];
}

export interface LeadGenFormQuestion {
  questionId: number;
  questionType: string;
  questionText: string;
  required: boolean;
  predefinedField?: string;
}

// Audience Types
export interface SavedAudience {
  id: string;
  name: string;
  account: string;
  type: 'MATCHED' | 'LOOKALIKE' | 'PREDICTIVE';
  status: 'ACTIVE' | 'EXPIRED' | 'PROCESSING' | 'FAILED';
  memberCount?: number;
  matchRate?: number;
  createdAt: number;
  lastModified: number;
}

// API Response Types
export interface LinkedInApiResponse<T> {
  elements: T[];
  paging?: {
    count: number;
    start: number;
    total?: number;
    links?: Array<{
      rel: string;
      href: string;
    }>;
  };
}

export interface LinkedInApiError {
  status: number;
  serviceErrorCode?: number;
  code?: string;
  message: string;
}

// Tool Input Types
export interface ListAdAccountsInput {
  status?: Array<'ACTIVE' | 'DRAFT' | 'CANCELED' | 'PENDING_DELETION'>;
  type?: 'BUSINESS' | 'ENTERPRISE';
  includeTest?: boolean;
}

export interface GetAccountDetailsInput {
  accountId: string;
}

export interface GetCampaignPerformanceInput {
  accountId: string;
  campaignIds?: string[];
  campaignGroupIds?: string[];
  startDate: string;
  endDate?: string;
  timeGranularity?: TimeGranularity;
  metrics?: string[];
}

export interface GetCreativePerformanceInput {
  accountId: string;
  campaignIds?: string[];
  creativeIds?: string[];
  startDate: string;
  endDate?: string;
  timeGranularity?: TimeGranularity;
  includeVideoMetrics?: boolean;
}

export interface GetCampaignGroupsInput {
  accountId: string;
  status?: Array<'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT'>;
  includePerformance?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface GetAudienceDemographicsInput {
  accountId: string;
  campaignIds?: string[];
  demographicType: DemographicPivot;
  startDate: string;
  endDate?: string;
  metric?: 'impressions' | 'clicks' | 'costInUsd';
  limit?: number;
}

export interface GetAudienceReachInput {
  accountId: string;
  campaignIds?: string[];
  campaignGroupIds?: string[];
  startDate: string;
  endDate?: string;
}

export interface ListSavedAudiencesInput {
  accountId: string;
  status?: Array<'ACTIVE' | 'EXPIRED' | 'PROCESSING'>;
  audienceType?: 'MATCHED' | 'LOOKALIKE' | 'PREDICTIVE';
}

export interface GetConversionPerformanceInput {
  accountId: string;
  campaignIds?: string[];
  startDate: string;
  endDate?: string;
  includePostView?: boolean;
  timeGranularity?: TimeGranularity;
}

export interface ListConversionsInput {
  accountId: string;
  enabledOnly?: boolean;
}

export interface GetLeadGenPerformanceInput {
  accountId: string;
  campaignIds?: string[];
  startDate: string;
  endDate?: string;
  timeGranularity?: TimeGranularity;
}

export interface ListLeadFormsInput {
  accountId: string;
  status?: Array<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>;
  includeQuestions?: boolean;
}

export interface ComparePerformanceInput {
  accountId: string;
  comparisonType: 'TIME_PERIOD' | 'CAMPAIGNS' | 'CAMPAIGN_GROUPS';
  periodA: {
    startDate?: string;
    endDate?: string;
    entityIds?: string[];
  };
  periodB: {
    startDate?: string;
    endDate?: string;
    entityIds?: string[];
  };
  metrics?: string[];
}

export interface GetDailyTrendsInput {
  accountId: string;
  campaignIds?: string[];
  startDate: string;
  endDate?: string;
  metrics?: string[];
  entityLevel?: 'ACCOUNT' | 'CAMPAIGN_GROUP' | 'CAMPAIGN';
}
