import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { LinkedInApiClient } from "../lib/linkedin-api.js";
import { SearchAdLibraryInput } from "../lib/types.js";

// Tool definition
export const searchAdLibraryTool: Tool = {
  name: "search_ad_library",
  description:
    "Searches the LinkedIn Ad Library for ads matching criteria. Find and analyze real ads from any advertiser across different countries and time periods. Supports filtering by keyword, advertiser name, country, date range, targeting facets, and impression range. Returns ad preview URLs, advertiser details, targeting information, and impression statistics. Maximum 25 results per request (use pagination).",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description:
          "Keywords to search in ad content. Multiple keywords separated by space are treated as AND logic.",
      },
      countries: {
        type: "array",
        items: { type: "string" },
        description:
          'Two-letter country codes to filter ads by served country (e.g., "us", "gb", "de").',
      },
      advertiser: {
        type: "string",
        description: "Advertiser name to search against.",
      },
      startDate: {
        type: "string",
        description:
          "Start date for when ads were served (YYYY-MM-DD format). Default: 2 days ago.",
      },
      endDate: {
        type: "string",
        description:
          "End date for when ads were served (YYYY-MM-DD format, exclusive). Default: 1 day ago.",
      },
      start: {
        type: "number",
        description: "Pagination offset. Default: 0",
        default: 0,
      },
      count: {
        type: "number",
        description: "Number of results per page (max 25). Default: 25",
        default: 25,
      },
      payerName: {
        type: "string",
        description: "Entity who paid for sponsoring the ad.",
      },
      includedTargetingFacetCategories: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "LANGUAGE",
            "LOCATION",
            "AUDIENCE",
            "AGE",
            "GENDER",
            "COMPANY",
            "EDUCATION",
            "JOB",
            "INTERESTS",
            "TRAITS",
          ],
        },
        description:
          "Filter ads that include these targeting facet categories.",
      },
      excludedTargetingFacetCategories: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "LANGUAGE",
            "LOCATION",
            "AUDIENCE",
            "AGE",
            "GENDER",
            "COMPANY",
            "EDUCATION",
            "JOB",
            "INTERESTS",
            "TRAITS",
          ],
        },
        description:
          "Filter ads that exclude these targeting facet categories.",
      },
      totalImpressionsRangeFrom: {
        type: "number",
        description: "Lower bound of total impressions range.",
      },
      totalImpressionsRangeTo: {
        type: "number",
        description: "Upper bound of total impressions range (0 = 1M+).",
      },
      sortByField: {
        type: "string",
        enum: ["CREATED_TIME"],
        description: "Field to sort by. Default: CREATED_TIME",
      },
      sortByOrder: {
        type: "string",
        enum: ["ASCENDING", "DESCENDING"],
        description: "Sort order. Default: DESCENDING",
      },
    },
  },
};

// Tool handler
export async function handleSearchAdLibrary(
  client: LinkedInApiClient,
  args: unknown,
): Promise<unknown> {
  const input = args as SearchAdLibraryInput & {
    totalImpressionsRangeFrom?: number;
    totalImpressionsRangeTo?: number;
    sortByField?: "CREATED_TIME";
    sortByOrder?: "ASCENDING" | "DESCENDING";
  };

  // Build the impressions range from separate inputs if provided
  let totalImpressionsRange: { from: number; to: number } | undefined;
  if (
    input.totalImpressionsRangeFrom !== undefined ||
    input.totalImpressionsRangeTo !== undefined
  ) {
    totalImpressionsRange = {
      from: input.totalImpressionsRangeFrom ?? 0,
      to: input.totalImpressionsRangeTo ?? 0,
    };
  }

  // Build sortBy from separate inputs if provided
  let sortBy:
    | { field: "CREATED_TIME"; order: "ASCENDING" | "DESCENDING" }
    | undefined;
  if (input.sortByField && input.sortByOrder) {
    sortBy = { field: input.sortByField, order: input.sortByOrder };
  }

  const result = await client.searchAdLibrary({
    keyword: input.keyword,
    countries: input.countries,
    advertiser: input.advertiser,
    startDate: input.startDate,
    endDate: input.endDate,
    start: input.start,
    count: input.count,
    payerName: input.payerName,
    includedTargetingFacetCategories: input.includedTargetingFacetCategories,
    excludedTargetingFacetCategories: input.excludedTargetingFacetCategories,
    totalImpressionsRange,
    sortBy,
  });

  return {
    ads: result.elements.map((ad) => ({
      adUrl: ad.adUrl,
      isRestricted: ad.isRestricted,
      restrictionDetails: ad.restrictionDetails,
      advertiserName: ad.details.advertiser.advertiserName,
      advertiserUrl: ad.details.advertiser.advertiserUrl,
      adPayer: ad.details.advertiser.adPayer,
      type: ad.details.type,
      targeting: ad.details.adTargeting.map((t) => ({
        facet: t.facetName,
        included: t.isIncluded ? t.includedSegments : [],
        excluded: t.isExcluded ? t.excludedSegments : [],
      })),
      statistics: {
        firstImpressionAt: ad.details.adStatistics.firstImpressionAt
          ? new Date(ad.details.adStatistics.firstImpressionAt).toISOString()
          : null,
        latestImpressionAt: ad.details.adStatistics.latestImpressionAt
          ? new Date(ad.details.adStatistics.latestImpressionAt).toISOString()
          : null,
        totalImpressionsRange: ad.details.adStatistics.totalImpressions,
        impressionsByCountry:
          ad.details.adStatistics.impressionsDistributionByCountry.map((c) => ({
            country: c.country.replace("urn:li:country:", "").toUpperCase(),
            percentage: c.impressionPercentage,
          })),
      },
    })),
    paging: {
      start: result.paging?.start || input.start || 0,
      count: result.elements.length,
      total: result.paging?.total,
    },
  };
}
