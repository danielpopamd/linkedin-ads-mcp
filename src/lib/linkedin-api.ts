import { TokenStore } from "../auth/token-store.js";
import {
  LinkedInApiResponse,
  LinkedInApiError,
  AdAccount,
  Campaign,
  CampaignGroup,
  Creative,
  Conversion,
  LeadGenForm,
  SavedAudience,
  AnalyticsRecord,
  DateRange,
  TimeGranularity,
  DemographicPivot,
  EntityPivot,
  AdLibraryAd,
  SearchAdLibraryInput,
} from "./types.js";

const LINKEDIN_API_BASE = "https://api.linkedin.com";
const LINKEDIN_VERSION = "202601"; // January 2026 API version

// Default metrics for different report types
const DEFAULT_PERFORMANCE_METRICS = [
  "impressions",
  "clicks",
  "landingPageClicks",
  "totalEngagements",
  "costInUsd",
  "costInLocalCurrency",
  "externalWebsiteConversions",
  "approximateUniqueImpressions",
  "averageDwellTime",
  "audiencePenetration",
];

const DEFAULT_CREATIVE_METRICS = [
  ...DEFAULT_PERFORMANCE_METRICS,
  "likes",
  "comments",
  "shares",
  "reactions",
  "follows",
];

const VIDEO_METRICS = [
  "videoViews",
  "videoStarts",
  "videoCompletions",
  "videoFirstQuartileCompletions",
  "videoMidpointCompletions",
  "videoThirdQuartileCompletions",
];

const LEAD_GEN_METRICS = [
  "oneClickLeads",
  "oneClickLeadFormOpens",
  "qualifiedLeads",
];

const REACH_METRICS = [
  "approximateMemberReach",
  "impressions",
  "audiencePenetration",
];

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, string | string[] | number | boolean | undefined>;
  restliMethod?:
    | "FINDER"
    | "BATCH_GET"
    | "GET"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "PARTIAL_UPDATE"
    | "BATCH_PARTIAL_UPDATE"
    | "BATCH_CREATE";
  /** If true, return the full Response object instead of parsing JSON */
  rawResponse?: boolean;
}

export class LinkedInApiClient {
  private tokenStore: TokenStore;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor(tokenStore: TokenStore) {
    this.tokenStore = tokenStore;
  }

  /**
   * Makes an authenticated request to the LinkedIn API.
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const accessToken = await this.tokenStore.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated. Please run: npm run auth");
    }

    let urlString = `${LINKEDIN_API_BASE}${endpoint}`;
    const queryParts: string[] = [];

    // Add query parameters
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            // Arrays need List() wrapper
            queryParts.push(
              `${key}=List(${value.map((v) => encodeURIComponent(v)).join(",")})`,
            );
          } else if (key === "fields" || key === "dateRange") {
            // Fields and dateRange should not have their internal commas/colons encoded
            queryParts.push(`${key}=${value}`);
          } else {
            queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
          }
        }
      }
    }

    if (queryParts.length > 0) {
      urlString += "?" + queryParts.join("&");
    }

    const url = new URL(urlString);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    };

    if (options.restliMethod) {
      headers["X-RestLi-Method"] = options.restliMethod;
    }

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        const response = await fetch(url.toString(), {
          method: options.method || "GET",
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.retryDelay * Math.pow(2, attempt);
          console.error(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: LinkedInApiError;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { status: response.status, message: errorText };
          }
          throw new Error(
            `LinkedIn API error (${response.status}): ${errorData.message}`,
          );
        }

        // Return raw response if requested (for write operations that need headers)
        if (options.rawResponse) {
          return response as unknown as T;
        }

        // Handle empty responses (201 Created, 204 No Content)
        const contentLength = response.headers.get("content-length");
        if (
          response.status === 204 ||
          response.status === 201 ||
          contentLength === "0"
        ) {
          // Extract ID from x-restli-id header if present (for create operations)
          const restliId = response.headers.get("x-restli-id");
          if (restliId) {
            return { id: restliId } as T;
          }
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-retryable errors
        if (
          lastError.message.includes("Not authenticated") ||
          lastError.message.includes("Invalid access token")
        ) {
          throw lastError;
        }

        if (attempt < this.retryCount - 1) {
          const waitTime = this.retryDelay * Math.pow(2, attempt);
          console.error(`Request failed, retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Formats a date string (YYYY-MM-DD) into LinkedIn's date format.
   */
  private formatDateRange(startDate: string, endDate?: string): string {
    const start = this.parseDate(startDate);
    const end = endDate
      ? this.parseDate(endDate)
      : this.parseDate(new Date().toISOString().split("T")[0]);

    return `(start:(year:${start.year},month:${start.month},day:${start.day}),end:(year:${end.year},month:${end.month},day:${end.day}))`;
  }

  private parseDate(dateStr: string): {
    year: number;
    month: number;
    day: number;
  } {
    const [year, month, day] = dateStr.split("-").map(Number);
    return { year, month, day };
  }

  // ==================== Account Management ====================

  /**
   * Lists all ad accounts accessible to the authenticated user.
   */
  async listAdAccounts(
    options: {
      status?: string[];
      type?: string;
      includeTest?: boolean;
    } = {},
  ): Promise<AdAccount[]> {
    const params: Record<string, string | string[]> = {
      q: "search",
    };

    if (options.status?.length) {
      params["search.status.values"] = options.status;
    }
    if (options.type) {
      params["search.type.values"] = [options.type];
    }

    const response = await this.request<LinkedInApiResponse<AdAccount>>(
      "/rest/adAccounts",
      { params },
    );

    let accounts = response.elements || [];

    // Filter out test accounts unless explicitly requested
    if (!options.includeTest) {
      accounts = accounts.filter((account) => !account.test);
    }

    return accounts;
  }

  /**
   * Gets details for a specific ad account.
   */
  async getAccountDetails(accountId: string): Promise<AdAccount> {
    return this.request<AdAccount>(`/rest/adAccounts/${accountId}`);
  }

  // ==================== Campaign Management ====================

  /**
   * Lists campaigns for an account.
   */
  async listCampaigns(
    accountId: string,
    options: {
      campaignGroupIds?: string[];
      status?: string[];
    } = {},
  ): Promise<Campaign[]> {
    const params: Record<string, string | string[]> = {
      q: "search",
    };

    if (options.campaignGroupIds?.length) {
      params["search.campaignGroup.values"] = options.campaignGroupIds.map(
        (id) => `urn:li:sponsoredCampaignGroup:${id}`,
      );
    }
    if (options.status?.length) {
      params["search.status.values"] = options.status;
    }

    try {
      const response = await this.request<LinkedInApiResponse<Campaign>>(
        `/rest/adAccounts/${accountId}/adCampaigns`,
        { params },
      );
      return response.elements || [];
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      return [];
    }
  }

  /**
   * Gets campaign by ID.
   */
  async getCampaign(
    accountId: string,
    campaignId: string,
  ): Promise<Campaign | null> {
    try {
      return await this.request<Campaign>(
        `/rest/adAccounts/${accountId}/adCampaigns/${campaignId}`,
      );
    } catch (error) {
      console.error(`Failed to fetch campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Gets multiple campaigns by IDs.
   */
  async getCampaignsByIds(
    accountId: string,
    campaignIds: string[],
  ): Promise<Map<string, Campaign>> {
    const campaignMap = new Map<string, Campaign>();

    // Fetch campaigns in parallel batches
    const batchSize = 10;
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      const batch = campaignIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((id) => this.getCampaign(accountId, id)),
      );
      results.forEach((campaign, idx) => {
        if (campaign) {
          campaignMap.set(batch[idx], campaign);
        }
      });
    }

    return campaignMap;
  }

  /**
   * Lists campaign groups for an account.
   */
  async listCampaignGroups(
    accountId: string,
    options: {
      status?: string[];
    } = {},
  ): Promise<CampaignGroup[]> {
    const params: Record<string, string | string[]> = {
      q: "search",
    };

    if (options.status?.length) {
      params["search.status.values"] = options.status;
    }

    const response = await this.request<LinkedInApiResponse<CampaignGroup>>(
      `/rest/adAccounts/${accountId}/adCampaignGroups`,
      { params },
    );
    return response.elements || [];
  }

  /**
   * Lists creatives for campaigns.
   */
  async listCreatives(
    accountId: string,
    options: {
      campaignIds?: string[];
      creativeIds?: string[];
      isTestAccount?: boolean;
      pageSize?: number;
    } = {},
  ): Promise<Creative[]> {
    const params: Record<string, string | string[]> = {
      q: "criteria",
      pageSize: String(options.pageSize ?? 100),
    };

    if (options.campaignIds?.length) {
      params.campaigns = options.campaignIds.map(
        (id) => `urn:li:sponsoredCampaign:${id}`,
      );
    }

    if (options.creativeIds?.length) {
      params.creatives = options.creativeIds.map(
        (id) => `urn:li:sponsoredCreative:${id}`,
      );
    }

    if (options.isTestAccount !== undefined) {
      params.isTestAccount = String(options.isTestAccount);
    }

    try {
      const response = await this.request<LinkedInApiResponse<Creative>>(
        `/rest/adAccounts/${accountId}/creatives`,
        { params, restliMethod: "FINDER" },
      );
      return response.elements || [];
    } catch (error) {
      console.error("Failed to fetch creatives:", error);
      return [];
    }
  }

  /**
   * Gets a single creative with full content details.
   */
  async getCreative(
    accountId: string,
    creativeId: string,
  ): Promise<any | null> {
    try {
      // Use the creatives endpoint with URN-encoded creative ID
      const encodedId = encodeURIComponent(
        `urn:li:sponsoredCreative:${creativeId}`,
      );
      return await this.request<any>(
        `/rest/adAccounts/${accountId}/creatives/${encodedId}`,
      );
    } catch (error) {
      console.error(`Failed to fetch creative ${creativeId}:`, error);
      return null;
    }
  }

  /**
   * Gets multiple creatives with full content by IDs using batch lookup.
   * Uses the search API for more efficient batch retrieval.
   */
  async getCreativesByIds(
    accountId: string,
    creativeIds: string[],
  ): Promise<Map<string, any>> {
    const creativeMap = new Map<string, any>();

    // Convert IDs to URN format for the API query
    const creativeUrns = creativeIds.map(
      (id) => `urn:li:sponsoredCreative:${id}`,
    );

    // Fetch creatives in batches of 50 to avoid URL length limits
    const batchSize = 50;
    for (let i = 0; i < creativeUrns.length; i += batchSize) {
      const batchUrns = creativeUrns.slice(i, i + batchSize);
      const batchIds = creativeIds.slice(i, i + batchSize);

      try {
        const creatives = await this.listCreatives(accountId, {
          creativeIds: batchIds,
          pageSize: 100,
        });

        for (const creative of creatives) {
          // Extract numeric ID from URN (format: urn:li:sponsoredCreative:123)
          const idMatch = creative.id?.match(/urn:li:sponsoredCreative:(\d+)/);
          if (idMatch) {
            const id = idMatch[1];
            creativeMap.set(id, creative);
          }
        }
      } catch (error) {
        console.error("Failed to fetch batch of creatives:", error);
      }
    }

    return creativeMap;
  }

  // ==================== Content (Posts & Images) ====================

  /**
   * Fetches a post/share by URN to get the content including image references.
   */
  async getPost(postUrn: string): Promise<any | null> {
    try {
      const encodedUrn = encodeURIComponent(postUrn);
      return await this.request<any>(`/rest/posts/${encodedUrn}`);
    } catch (error) {
      console.error(`Failed to fetch post ${postUrn}:`, error);
      return null;
    }
  }

  /**
   * Fetches an image by URN to get the download URL.
   */
  async getImage(
    imageUrn: string,
  ): Promise<{ downloadUrl: string; status: string } | null> {
    try {
      const encodedUrn = encodeURIComponent(imageUrn);
      return await this.request<any>(`/rest/images/${encodedUrn}`);
    } catch (error) {
      console.error(`Failed to fetch image ${imageUrn}:`, error);
      return null;
    }
  }

  /**
   * Fetches multiple images by URN in a batch.
   */
  async getImagesBatch(imageUrns: string[]): Promise<Map<string, string>> {
    const imageMap = new Map<string, string>();

    if (imageUrns.length === 0) return imageMap;

    try {
      const encodedUrns = imageUrns
        .map((urn) => encodeURIComponent(urn))
        .join(",");
      const response = await this.request<{ results: Record<string, any> }>(
        `/rest/images?ids=List(${encodedUrns})`,
      );

      if (response?.results) {
        for (const [urn, data] of Object.entries(response.results)) {
          if (data.downloadUrl) {
            imageMap.set(urn, data.downloadUrl);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch images batch:", error);
    }

    return imageMap;
  }

  /**
   * Gets the full creative content including resolved images.
   * This requires r_organization_social scope.
   */
  async getCreativeContent(
    creative: any,
    debug = false,
  ): Promise<{
    imageUrl: string;
    headline: string;
    primaryText: string;
    landingPageUrl: string;
    contentType: string;
    carouselImages: string[];
  }> {
    const result = {
      imageUrl: "",
      headline: creative.name || "",
      primaryText: "",
      landingPageUrl: "",
      contentType: "OTHER" as string,
      carouselImages: [] as string[],
    };

    const reference = creative?.content?.reference;
    if (!reference) return result;

    // Handle non-post references (InMail, etc.)
    if (!reference.includes("share") && !reference.includes("ugcPost")) {
      if (reference.includes("adInMailContent")) {
        result.contentType = "INMAIL";
      }
      return result;
    }

    try {
      // Fetch the referenced post/share
      const post = await this.getPost(reference);
      if (!post) return result;

      if (debug) {
        console.log(
          "\nPost structure:",
          JSON.stringify(post, null, 2).substring(0, 2000),
        );
      }

      // Extract content from the post
      const commentary = post.commentary || "";
      result.primaryText = commentary;

      // Check for media content in different structures
      // LinkedIn posts can have: content.media, content.article, or content.multiImage
      const content = post.content || {};

      // Single media
      if (content.media) {
        const media = content.media;
        result.headline = result.headline || media.title || "";
        result.landingPageUrl = media.landingPage || "";

        // Get image from media URN
        const imageUrn = media.id;
        if (imageUrn && imageUrn.includes("image")) {
          const image = await this.getImage(imageUrn);
          if (image?.downloadUrl) {
            result.imageUrl = image.downloadUrl;
          }
        }
      }

      // Multi-image posts
      if (content.multiImage?.images?.length > 0) {
        const firstImage = content.multiImage.images[0];
        const imageUrn = firstImage.id;
        if (imageUrn && imageUrn.includes("image")) {
          const image = await this.getImage(imageUrn);
          if (image?.downloadUrl) {
            result.imageUrl = image.downloadUrl;
          }
        }
      }

      // Article content
      if (content.article) {
        const article = content.article;
        result.headline = result.headline || article.title || "";
        result.landingPageUrl = result.landingPageUrl || article.source || "";

        // Thumbnail can be a URN or direct URL
        if (article.thumbnail) {
          if (article.thumbnail.includes("urn:li:image:")) {
            // It's an image URN, fetch the download URL
            const image = await this.getImage(article.thumbnail);
            if (image?.downloadUrl) {
              result.imageUrl = image.downloadUrl;
            }
          } else {
            // It's a direct URL
            result.imageUrl = article.thumbnail;
          }
        }
      }

      // Use contentLandingPage if available
      if (post.contentLandingPage && !result.landingPageUrl) {
        result.landingPageUrl = post.contentLandingPage;
      }

      // Determine content type from actual post structure
      if (content.multiImage?.images?.length > 1) {
        result.contentType = "CAROUSEL";
      } else if (content.media?.id?.includes("video")) {
        result.contentType = "VIDEO";
      } else if (content.media?.id?.includes("image") || result.imageUrl) {
        result.contentType = "IMAGE";
      } else if (content.article) {
        result.contentType = "ARTICLE";
      } else if (
        commentary &&
        !content.media &&
        !content.multiImage &&
        !content.article
      ) {
        result.contentType = "TEXT";
      }
    } catch (error) {
      // Silently fail - already logged in getPost
    }

    return result;
  }

  // ==================== Analytics ====================

  /**
   * Gets analytics data with a specific pivot.
   */
  async getAnalytics(options: {
    accountId: string;
    pivot: EntityPivot | DemographicPivot;
    startDate: string;
    endDate?: string;
    timeGranularity?: TimeGranularity;
    campaigns?: string[];
    campaignGroups?: string[];
    metrics?: string[];
  }): Promise<AnalyticsRecord[]> {
    const dateRange = this.formatDateRange(options.startDate, options.endDate);
    const metrics = options.metrics || DEFAULT_PERFORMANCE_METRICS;

    // Include dateRange field when using time-based granularity
    const fieldsToRequest = [...metrics, "pivotValues"];
    if (options.timeGranularity && options.timeGranularity !== "ALL") {
      fieldsToRequest.push("dateRange");
    }

    const params: Record<string, string | string[]> = {
      q: "analytics",
      pivot: options.pivot,
      dateRange,
      timeGranularity: options.timeGranularity || "ALL",
      accounts: [`urn:li:sponsoredAccount:${options.accountId}`],
      fields: fieldsToRequest.join(","),
    };

    if (options.campaigns?.length) {
      params.campaigns = options.campaigns.map(
        (id) => `urn:li:sponsoredCampaign:${id}`,
      );
    }
    if (options.campaignGroups?.length) {
      params.campaignGroups = options.campaignGroups.map(
        (id) => `urn:li:sponsoredCampaignGroup:${id}`,
      );
    }

    const response = await this.request<LinkedInApiResponse<AnalyticsRecord>>(
      "/rest/adAnalytics",
      { params },
    );
    return response.elements || [];
  }

  /**
   * Gets campaign performance metrics.
   */
  async getCampaignPerformance(options: {
    accountId: string;
    campaignIds?: string[];
    campaignGroupIds?: string[];
    startDate: string;
    endDate?: string;
    timeGranularity?: TimeGranularity;
    metrics?: string[];
  }): Promise<AnalyticsRecord[]> {
    return this.getAnalytics({
      ...options,
      pivot: "CAMPAIGN",
      campaigns: options.campaignIds,
      campaignGroups: options.campaignGroupIds,
    });
  }

  /**
   * Gets creative performance metrics.
   */
  async getCreativePerformance(options: {
    accountId: string;
    campaignIds?: string[];
    creativeIds?: string[];
    startDate: string;
    endDate?: string;
    timeGranularity?: TimeGranularity;
    includeVideoMetrics?: boolean;
  }): Promise<AnalyticsRecord[]> {
    // Remove audiencePenetration (unsupported for CREATIVE pivot) and costInLocalCurrency
    // (redundant with costInUsd) to stay under LinkedIn's 20-field API limit
    let metrics = DEFAULT_CREATIVE_METRICS.filter(
      (m) => m !== "audiencePenetration" && m !== "costInLocalCurrency",
    );
    if (options.includeVideoMetrics !== false) {
      metrics = [...metrics, ...VIDEO_METRICS];
    }

    return this.getAnalytics({
      accountId: options.accountId,
      pivot: "CREATIVE",
      startDate: options.startDate,
      endDate: options.endDate,
      timeGranularity: options.timeGranularity,
      campaigns: options.campaignIds,
      metrics,
    });
  }

  /**
   * Gets campaign group performance metrics.
   */
  async getCampaignGroupPerformance(options: {
    accountId: string;
    startDate: string;
    endDate?: string;
    timeGranularity?: TimeGranularity;
  }): Promise<AnalyticsRecord[]> {
    return this.getAnalytics({
      ...options,
      pivot: "CAMPAIGN_GROUP",
    });
  }

  /**
   * Gets audience demographic breakdown.
   */
  async getAudienceDemographics(options: {
    accountId: string;
    demographicType: DemographicPivot;
    campaignIds?: string[];
    startDate: string;
    endDate?: string;
  }): Promise<AnalyticsRecord[]> {
    return this.getAnalytics({
      accountId: options.accountId,
      pivot: options.demographicType,
      startDate: options.startDate,
      endDate: options.endDate,
      campaigns: options.campaignIds,
      metrics: [...DEFAULT_PERFORMANCE_METRICS, "totalEngagements"],
    });
  }

  /**
   * Gets reach and frequency metrics.
   */
  async getAudienceReach(options: {
    accountId: string;
    campaignIds?: string[];
    campaignGroupIds?: string[];
    startDate: string;
    endDate?: string;
  }): Promise<AnalyticsRecord[]> {
    // Note: approximateMemberReach requires date range of 92 days or less
    return this.getAnalytics({
      accountId: options.accountId,
      pivot: options.campaignIds?.length ? "CAMPAIGN" : "ACCOUNT",
      startDate: options.startDate,
      endDate: options.endDate,
      campaigns: options.campaignIds,
      campaignGroups: options.campaignGroupIds,
      metrics: REACH_METRICS,
    });
  }

  /**
   * Gets lead generation metrics.
   */
  async getLeadGenPerformance(options: {
    accountId: string;
    campaignIds?: string[];
    startDate: string;
    endDate?: string;
    timeGranularity?: TimeGranularity;
  }): Promise<AnalyticsRecord[]> {
    return this.getAnalytics({
      accountId: options.accountId,
      pivot: "CAMPAIGN",
      startDate: options.startDate,
      endDate: options.endDate,
      campaigns: options.campaignIds,
      timeGranularity: options.timeGranularity,
      metrics: [...LEAD_GEN_METRICS, "costInUsd", "impressions", "clicks"],
    });
  }

  /**
   * Gets conversion performance by conversion action.
   */
  async getConversionPerformance(options: {
    accountId: string;
    campaignIds?: string[];
    startDate: string;
    endDate?: string;
    includePostView?: boolean;
    timeGranularity?: TimeGranularity;
  }): Promise<AnalyticsRecord[]> {
    const metrics = [
      "externalWebsiteConversions",
      "externalWebsitePostClickConversions",
      "costInUsd",
      "conversionValueInLocalCurrency",
    ];

    if (options.includePostView !== false) {
      metrics.push("externalWebsitePostViewConversions");
    }

    return this.getAnalytics({
      accountId: options.accountId,
      pivot: "CONVERSION",
      startDate: options.startDate,
      endDate: options.endDate,
      campaigns: options.campaignIds,
      timeGranularity: options.timeGranularity,
      metrics,
    });
  }

  // ==================== Conversions ====================

  /**
   * Lists conversion tracking rules for an account.
   */
  async listConversions(
    accountId: string,
    enabledOnly = false,
  ): Promise<Conversion[]> {
    const params: Record<string, string> = {
      q: "account",
      account: `urn:li:sponsoredAccount:${accountId}`,
    };

    const response = await this.request<LinkedInApiResponse<Conversion>>(
      "/rest/conversions",
      { params },
    );
    let conversions = response.elements || [];

    if (enabledOnly) {
      conversions = conversions.filter((c) => c.enabled);
    }

    return conversions;
  }

  // ==================== Lead Gen ====================

  /**
   * Lists lead generation forms for an account.
   */
  async listLeadForms(
    accountId: string,
    status?: string[],
  ): Promise<LeadGenForm[]> {
    const params: Record<string, string | string[]> = {
      q: "owner",
      owner: `(sponsoredAccount:urn:li:sponsoredAccount:${accountId})`,
    };

    const response = await this.request<LinkedInApiResponse<LeadGenForm>>(
      "/rest/leadForms",
      { params },
    );
    let forms = response.elements || [];

    if (status?.length) {
      forms = forms.filter((f) => status.includes(f.status));
    }

    return forms;
  }

  // ==================== Audiences ====================

  // ==================== Ad Library ====================

  /**
   * Searches the LinkedIn Ad Library for ads matching criteria.
   * This is a public API that doesn't require ad account access — any
   * authenticated LinkedIn user can search the ad library.
   */
  async searchAdLibrary(
    options: SearchAdLibraryInput,
  ): Promise<LinkedInApiResponse<AdLibraryAd>> {
    const queryParts: string[] = ["q=criteria"];

    if (options.keyword) {
      queryParts.push(`keyword=${encodeURIComponent(options.keyword)}`);
    }

    if (options.countries?.length) {
      const countryUrns = options.countries
        .map((c) => encodeURIComponent(`urn:li:country:${c.toLowerCase()}`))
        .join(",");
      queryParts.push(`countries=(value:List(${countryUrns}))`);
    }

    if (options.advertiser) {
      queryParts.push(`advertiser=${encodeURIComponent(options.advertiser)}`);
    }

    if (options.startDate || options.endDate) {
      const now = new Date();
      const defaultStart = new Date(now);
      defaultStart.setDate(defaultStart.getDate() - 2);
      const defaultEnd = new Date(now);
      defaultEnd.setDate(defaultEnd.getDate() - 1);

      const start = options.startDate
        ? this.parseDate(options.startDate)
        : {
            year: defaultStart.getFullYear(),
            month: defaultStart.getMonth() + 1,
            day: defaultStart.getDate(),
          };
      const end = options.endDate
        ? this.parseDate(options.endDate)
        : {
            year: defaultEnd.getFullYear(),
            month: defaultEnd.getMonth() + 1,
            day: defaultEnd.getDate(),
          };

      queryParts.push(
        `dateRange=(start:(day:${start.day},month:${start.month},year:${start.year}),end:(day:${end.day},month:${end.month},year:${end.year}))`,
      );
    }

    if (options.start !== undefined) {
      queryParts.push(`start=${options.start}`);
    }

    if (options.count !== undefined) {
      queryParts.push(`count=${Math.min(options.count, 25)}`);
    }

    if (options.payerName) {
      queryParts.push(`payerName=${encodeURIComponent(options.payerName)}`);
    }

    if (options.includedTargetingFacetCategories?.length) {
      queryParts.push(
        `includedTargetingFacetCategories=List(${options.includedTargetingFacetCategories.join(",")})`,
      );
    }

    if (options.excludedTargetingFacetCategories?.length) {
      queryParts.push(
        `excludedTargetingFacetCategories=List(${options.excludedTargetingFacetCategories.join(",")})`,
      );
    }

    if (options.totalImpressionsRange) {
      queryParts.push(
        `totalImpressionsRange=(from:${options.totalImpressionsRange.from},to:${options.totalImpressionsRange.to})`,
      );
    }

    if (options.sortBy) {
      queryParts.push(
        `sortBy=(order:${options.sortBy.order},field:${options.sortBy.field})`,
      );
    }

    const endpoint = `/rest/adLibrary?${queryParts.join("&")}`;
    return this.request<LinkedInApiResponse<AdLibraryAd>>(endpoint);
  }

  // ==================== Campaign Group Management (Write) ====================

  /**
   * Creates a new campaign group.
   */
  async createCampaignGroup(
    accountId: string,
    data: {
      name: string;
      status: string;
      runSchedule: { start: number; end?: number };
      totalBudget?: { amount: string; currencyCode: string };
      dailyBudget?: { amount: string; currencyCode: string };
      objectiveType?: string;
    },
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      `/rest/adAccounts/${accountId}/adCampaignGroups`,
      {
        method: "POST",
        body: {
          account: `urn:li:sponsoredAccount:${accountId}`,
          ...data,
        },
      },
    );
  }

  /**
   * Partially updates a campaign group.
   */
  async updateCampaignGroup(
    accountId: string,
    campaignGroupId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await this.request<void>(
      `/rest/adAccounts/${accountId}/adCampaignGroups/${campaignGroupId}`,
      {
        method: "POST",
        restliMethod: "PARTIAL_UPDATE",
        body: {
          patch: {
            $set: updates,
          },
        },
      },
    );
  }

  /**
   * Deletes a draft campaign group, or sets non-draft to PENDING_DELETION.
   */
  async deleteCampaignGroup(
    accountId: string,
    campaignGroupId: string,
    isDraft: boolean,
  ): Promise<void> {
    if (isDraft) {
      await this.request<void>(
        `/rest/adAccounts/${accountId}/adCampaignGroups/${campaignGroupId}`,
        {
          method: "DELETE",
        },
      );
    } else {
      await this.updateCampaignGroup(accountId, campaignGroupId, {
        status: "PENDING_DELETION",
      });
    }
  }

  // ==================== Campaign Management (Write) ====================

  /**
   * Creates a new campaign.
   */
  async createCampaign(
    accountId: string,
    data: {
      name: string;
      campaignGroup: string;
      status: string;
      type: string;
      objectiveType: string;
      costType: string;
      dailyBudget?: { amount: string; currencyCode: string };
      totalBudget?: { amount: string; currencyCode: string };
      unitCost: { amount: string; currencyCode: string };
      locale: { country: string; language: string };
      targetingCriteria: unknown;
      runSchedule?: { start: number; end?: number };
      offsiteDeliveryEnabled?: boolean;
      audienceExpansionEnabled?: boolean;
      creativeSelection?: string;
      politicalIntent?: string;
    },
  ): Promise<{ id: string }> {
    const campaignGroupUrn = data.campaignGroup.startsWith("urn:")
      ? data.campaignGroup
      : `urn:li:sponsoredCampaignGroup:${data.campaignGroup}`;
    const { campaignGroup: _cg, ...rest } = data;
    return this.request<{ id: string }>(
      `/rest/adAccounts/${accountId}/adCampaigns`,
      {
        method: "POST",
        body: {
          account: `urn:li:sponsoredAccount:${accountId}`,
          campaignGroup: campaignGroupUrn,
          ...rest,
        },
      },
    );
  }

  /**
   * Partially updates a campaign.
   */
  async updateCampaign(
    accountId: string,
    campaignId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    await this.request<void>(
      `/rest/adAccounts/${accountId}/adCampaigns/${campaignId}`,
      {
        method: "POST",
        restliMethod: "PARTIAL_UPDATE",
        body: {
          patch: {
            $set: updates,
          },
        },
      },
    );
  }

  /**
   * Deletes a draft campaign, or sets non-draft to PENDING_DELETION.
   */
  async deleteCampaign(
    accountId: string,
    campaignId: string,
    isDraft: boolean,
  ): Promise<void> {
    if (isDraft) {
      await this.request<void>(
        `/rest/adAccounts/${accountId}/adCampaigns/${campaignId}`,
        {
          method: "DELETE",
        },
      );
    } else {
      await this.updateCampaign(accountId, campaignId, {
        status: "PENDING_DELETION",
      });
    }
  }

  // ==================== Creative Management (Write) ====================

  /**
   * Creates a new creative.
   */
  async createCreative(
    accountId: string,
    data: {
      campaign: string;
      content?: unknown;
      intendedStatus: string;
      inlineContent?: unknown;
      leadgenCallToAction?: unknown;
      name?: string;
    },
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      campaign: data.campaign.startsWith("urn:")
        ? data.campaign
        : `urn:li:sponsoredCampaign:${data.campaign}`,
      intendedStatus: data.intendedStatus,
    };
    if (data.content) body.content = data.content;
    if (data.inlineContent) body.inlineContent = data.inlineContent;
    if (data.leadgenCallToAction)
      body.leadgenCallToAction = data.leadgenCallToAction;
    if (data.name) body.name = data.name;

    return this.request<{ id: string }>(
      `/rest/adAccounts/${accountId}/creatives`,
      {
        method: "POST",
        body,
      },
    );
  }

  /**
   * Creates a new inline creative (ad with content created directly, not referencing an existing post).
   * Uses the ?action=createInline endpoint.
   */
  async createInlineCreative(
    accountId: string,
    data: {
      campaign: string;
      intendedStatus: string;
      name?: string;
      organizationId: string;
      commentary: string;
      mediaId?: string;
      mediaTitle?: string;
      landingPageUrl?: string;
      callToActionLabel?: string;
      leadgenCallToAction?: { destination: string; label: string };
    },
  ): Promise<{ id: string }> {
    const campaignUrn = data.campaign.startsWith("urn:")
      ? data.campaign
      : `urn:li:sponsoredCampaign:${data.campaign}`;
    const orgUrn = data.organizationId.startsWith("urn:")
      ? data.organizationId
      : `urn:li:organization:${data.organizationId}`;

    const post: Record<string, unknown> = {
      adContext: {
        dscAdAccount: `urn:li:sponsoredAccount:${accountId}`,
        dscStatus: "ACTIVE",
      },
      author: orgUrn,
      commentary: data.commentary,
      visibility: "PUBLIC",
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    if (data.mediaId) {
      post.content = {
        media: {
          id: data.mediaId,
          title: data.mediaTitle || "",
        },
      };
    }

    if (data.landingPageUrl) {
      post.contentLandingPage = data.landingPageUrl;
    }

    if (data.callToActionLabel) {
      post.contentCallToActionLabel = data.callToActionLabel;
    }

    const creative: Record<string, unknown> = {
      inlineContent: { post },
      campaign: campaignUrn,
      intendedStatus: data.intendedStatus,
    };

    if (data.name) creative.name = data.name;
    if (data.leadgenCallToAction)
      creative.leadgenCallToAction = data.leadgenCallToAction;

    return this.request<{ id: string }>(
      `/rest/adAccounts/${accountId}/creatives?action=createInline`,
      {
        method: "POST",
        body: { creative },
      },
    );
  }

  /**
   * Uploads an image to LinkedIn for use in ads.
   * Two-step process: 1) Initialize upload to get URL + URN, 2) PUT binary to upload URL.
   */
  async uploadImage(data: {
    owner: string;
    filePath: string;
    accountId?: string;
    assetName?: string;
  }): Promise<{ imageUrn: string; uploadUrl: string }> {
    // Support both organization and sponsoredAccount as owner
    let ownerUrn: string;
    if (data.owner.startsWith("urn:")) {
      ownerUrn = data.owner;
    } else {
      // Default to organization URN, but callers can pass sponsoredAccount URN directly
      ownerUrn = `urn:li:organization:${data.owner}`;
    }

    // Step 1: Initialize upload
    const initBody: Record<string, unknown> = {
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    };

    // Optionally register in media library
    if (data.accountId && data.assetName) {
      (
        initBody.initializeUploadRequest as Record<string, unknown>
      ).mediaLibraryMetadata = {
        associatedAccount: `urn:li:sponsoredAccount:${data.accountId}`,
        assetName: data.assetName,
      };
    }

    const initResponse = await this.request<{
      value: {
        uploadUrl: string;
        image: string;
        uploadUrlExpiresAt: number;
      };
    }>("/rest/images?action=initializeUpload", {
      method: "POST",
      body: initBody,
    });

    const { uploadUrl, image: imageUrn } = initResponse.value;

    // Step 2: Upload the binary file
    const fs = await import("fs");
    const path = await import("path");

    if (!fs.existsSync(data.filePath)) {
      throw new Error(`File not found: ${data.filePath}`);
    }

    const fileBuffer = fs.readFileSync(data.filePath);
    const ext = path.extname(data.filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";

    const accessToken = await this.tokenStore.getAccessToken();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `Image upload failed (${uploadResponse.status}): ${errorText}`,
      );
    }

    return { imageUrn, uploadUrl };
  }

  /**
   * Partially updates a creative (e.g., status change).
   */
  async updateCreative(
    accountId: string,
    creativeId: string,
    updates: Record<string, unknown>,
  ): Promise<void> {
    const encodedId = encodeURIComponent(
      creativeId.startsWith("urn:")
        ? creativeId
        : `urn:li:sponsoredCreative:${creativeId}`,
    );
    await this.request<void>(
      `/rest/adAccounts/${accountId}/creatives/${encodedId}`,
      {
        method: "POST",
        restliMethod: "PARTIAL_UPDATE",
        body: {
          patch: {
            $set: updates,
          },
        },
      },
    );
  }

  // ==================== Audiences ====================

  /**
   * Lists saved/matched audiences for an account.
   */
  async listSavedAudiences(
    accountId: string,
    options: {
      status?: string[];
      type?: string;
    } = {},
  ): Promise<SavedAudience[]> {
    const params: Record<string, string> = {
      q: "account",
      account: `urn:li:sponsoredAccount:${accountId}`,
    };

    const response = await this.request<LinkedInApiResponse<SavedAudience>>(
      "/rest/dmpSegments",
      { params },
    );
    let audiences = response.elements || [];

    if (options.status?.length) {
      audiences = audiences.filter((a) => options.status!.includes(a.status));
    }
    if (options.type) {
      audiences = audiences.filter((a) => a.type === options.type);
    }

    return audiences;
  }
}
