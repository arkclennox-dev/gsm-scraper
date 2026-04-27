-- Affiliate Products
create table if not exists affiliate_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  destination_url text not null,
  category text,
  source_platform text default 'shopee',
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Landing Pages
create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  intro text,
  content text,
  meta_title text,
  meta_description text,
  featured_image_url text,
  disclosure_text text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  custom_head_script text,
  custom_body_script text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Landing Page Products (many-to-many)
create table if not exists landing_page_products (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references landing_pages(id) on delete cascade,
  product_id uuid not null references affiliate_products(id) on delete cascade,
  sort_order int default 0,
  custom_title text,
  custom_description text,
  custom_cta text default 'Cek di Shopee',
  created_at timestamptz default now(),
  unique (landing_page_id, product_id)
);

-- Click Events
create table if not exists click_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references affiliate_products(id) on delete set null,
  landing_page_id uuid references landing_pages(id) on delete set null,
  product_slug text,
  landing_page_slug text,
  redirect_slug text,
  destination_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  user_agent text,
  ip_hash text,
  country text,
  device_type text,
  browser text,
  os text,
  is_duplicate boolean default false,
  is_bot boolean default false,
  created_at timestamptz default now()
);

-- Ad Spend Reports
create table if not exists ad_spend_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  platform text not null default 'meta',
  campaign_name text not null,
  adset_name text,
  ad_name text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  spend numeric(12,2) not null default 0,
  impressions int default 0,
  link_clicks int default 0,
  landing_page_views int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Site Settings
create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text default 'Affiliate Click Dashboard',
  site_url text,
  default_disclosure_text text default 'Beberapa link di halaman ini adalah link affiliate. Saya bisa menerima komisi jika kamu membeli melalui link tersebut, tanpa biaya tambahan untuk kamu.',
  meta_pixel_id text,
  ga4_measurement_id text,
  global_head_script text,
  global_body_script text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- API Keys
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['read'],
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_affiliate_products_slug on affiliate_products(slug);
create index if not exists idx_landing_pages_slug on landing_pages(slug);
create index if not exists idx_click_events_created_at on click_events(created_at);
create index if not exists idx_click_events_product_id on click_events(product_id);
create index if not exists idx_click_events_utm_campaign on click_events(utm_campaign);
create index if not exists idx_click_events_utm_content on click_events(utm_content);
create index if not exists idx_ad_spend_reports_report_date on ad_spend_reports(report_date);
create index if not exists idx_ad_spend_reports_utm_campaign on ad_spend_reports(utm_campaign);
create index if not exists idx_api_keys_key_hash on api_keys(key_hash);
create index if not exists idx_api_keys_status on api_keys(status);

-- RLS
alter table affiliate_products enable row level security;
alter table landing_pages enable row level security;
alter table landing_page_products enable row level security;
alter table click_events enable row level security;
alter table ad_spend_reports enable row level security;
alter table site_settings enable row level security;
alter table api_keys enable row level security;

-- Policies
create policy "Authenticated users can manage affiliate_products"
on affiliate_products for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage landing_pages"
on landing_pages for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage landing_page_products"
on landing_page_products for all to authenticated using (true) with check (true);

create policy "Authenticated users can read click_events"
on click_events for select to authenticated using (true);

create policy "Authenticated users can manage ad_spend_reports"
on ad_spend_reports for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage site_settings"
on site_settings for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage api_keys"
on api_keys for all to authenticated using (true) with check (true);

-- Allow service role to insert click events
create policy "Service role can insert click_events"
on click_events for insert to service_role with check (true);

-- Allow anon to read published landing pages
create policy "Public can read published landing_pages"
on landing_pages for select to anon using (status = 'published');

-- Allow anon to read active products
create policy "Public can read active affiliate_products"
on affiliate_products for select to anon using (status = 'active');

-- Allow anon to read landing_page_products
create policy "Public can read landing_page_products"
on landing_page_products for select to anon using (true);

-- Seed default settings
insert into site_settings (site_name, default_disclosure_text)
values ('Affiliate Click Dashboard', 'Beberapa link di halaman ini adalah link affiliate. Saya bisa menerima komisi jika kamu membeli melalui link tersebut, tanpa biaya tambahan untuk kamu.')
on conflict do nothing;
