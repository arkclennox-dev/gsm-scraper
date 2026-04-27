export interface AffiliateProduct {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  destination_url: string;
  category: string | null;
  source_platform: string;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
  total_clicks?: number;
  redirect_url?: string;
}

export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  intro: string | null;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  disclosure_text: string | null;
  status: "draft" | "published" | "archived";
  custom_head_script: string | null;
  custom_body_script: string | null;
  created_at: string;
  updated_at: string;
  products_count?: number;
  total_clicks?: number;
}

export interface LandingPageProduct {
  id: string;
  landing_page_id: string;
  product_id: string;
  sort_order: number;
  custom_title: string | null;
  custom_description: string | null;
  custom_cta: string;
  created_at: string;
  product?: AffiliateProduct;
}

export interface ClickEvent {
  id: string;
  product_id: string | null;
  landing_page_id: string | null;
  product_slug: string | null;
  landing_page_slug: string | null;
  redirect_slug: string | null;
  destination_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  is_duplicate: boolean;
  is_bot: boolean;
  created_at: string;
}

export interface AdSpendReport {
  id: string;
  report_date: string;
  platform: string;
  campaign_name: string;
  adset_name: string | null;
  ad_name: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  spend: number;
  impressions: number;
  link_clicks: number;
  landing_page_views: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_url: string | null;
  default_disclosure_text: string | null;
  meta_pixel_id: string | null;
  ga4_measurement_id: string | null;
  global_head_script: string | null;
  global_body_script: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  status: "active" | "revoked";
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportOverview {
  redirect_clicks: number;
  non_duplicate_clicks: number;
  bot_clicks: number;
  duplicate_clicks: number;
  spend: number;
  impressions: number;
  meta_link_clicks: number;
  meta_landing_page_views: number;
  cost_per_redirect_click: number;
  cost_per_non_duplicate_click: number;
  meta_cpc: number;
  click_gap: number;
  duplicate_rate: number;
  bot_rate: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}
