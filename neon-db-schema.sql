-- Neon Database Schema Dump
-- Generated at 2026-01-08T13:32:00.864Z

CREATE TABLE public.bins (
  id                   bigint NOT NULL DEFAULT nextval('bins_id_seq'::regclass),
  warehouse_id         bigint,
  bin_number           character varying(20) NOT NULL,
  description          character varying(255),
  capacity             integer DEFAULT 100,
  current_count        integer DEFAULT 0,
  is_active            boolean DEFAULT true,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cart_items (
  id                   bigint NOT NULL DEFAULT nextval('cart_items_id_seq'::regclass),
  user_id              bigint NOT NULL,
  product_id           bigint NOT NULL,
  quantity             integer NOT NULL DEFAULT 1,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.categories (
  id                   bigint NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name                 character varying(255) NOT NULL,
  description          text,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.inventory_movements (
  id                   bigint NOT NULL DEFAULT nextval('inventory_movements_id_seq'::regclass),
  product_id           bigint,
  from_warehouse_id    bigint,
  to_warehouse_id      bigint,
  from_bin             character varying(20),
  to_bin               character varying(20),
  quantity             integer NOT NULL DEFAULT 1,
  movement_type        character varying(20) NOT NULL,
  status               character varying(20) DEFAULT 'pending'::character varying,
  notes                text,
  scanned_at           timestamp with time zone,
  created_by           bigint,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.order_items (
  id                   bigint NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  order_id             bigint,
  product_id           bigint,
  quantity             integer NOT NULL,
  price                numeric NOT NULL,
  created_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.orders (
  id                   bigint NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  user_id              bigint,
  total_amount         numeric NOT NULL,
  status               character varying(50) NOT NULL DEFAULT 'pending'::character varying,
  shipping_address     text NOT NULL,
  payment_method       character varying(50) NOT NULL,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.product_reviews (
  id                   bigint NOT NULL DEFAULT nextval('product_reviews_id_seq'::regclass),
  product_id           bigint NOT NULL,
  user_id              bigint NOT NULL,
  rating               integer NOT NULL,
  title                character varying(255),
  comment              text,
  is_verified_purchase boolean DEFAULT false,
  helpful_count        integer DEFAULT 0,
  not_helpful_count    integer DEFAULT 0,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.products (
  id                   bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  category_id          bigint,
  name                 character varying(255) NOT NULL,
  description          text,
  part_number          character varying(50),
  barcode              character varying(50),
  condition_status     character varying(50) NOT NULL,
  price                numeric NOT NULL,
  quantity             integer NOT NULL DEFAULT 0,
  image_url            character varying(500),
  warehouse_id         bigint,
  bin_number           character varying(20),
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.query_logs (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp            timestamp with time zone DEFAULT now(),
  query                text,
  model                text,
  action               text,
  duration             integer,
  status               integer,
  error                text
);

CREATE TABLE public.review_helpfulness (
  id                   bigint NOT NULL DEFAULT nextval('review_helpfulness_id_seq'::regclass),
  review_id            bigint NOT NULL,
  user_id              bigint NOT NULL,
  is_helpful           boolean NOT NULL,
  created_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.users (
  id                   bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email                character varying(255) NOT NULL,
  password             character varying(255) NOT NULL,
  first_name           character varying(100),
  last_name            character varying(100),
  address              text,
  city                 character varying(100),
  state                character varying(100),
  zip_code             character varying(20),
  phone                character varying(20),
  role                 character varying(20) NOT NULL DEFAULT 'customer'::character varying,
  email_verified       boolean DEFAULT false,
  verification_token   character varying(255),
  email_verification_token character varying(255),
  email_verification_expires timestamp with time zone,
  email_verification_sent_at timestamp with time zone,
  reset_token          character varying(255),
  reset_token_expires  timestamp with time zone,
  is_approved          boolean DEFAULT true,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.warehouses (
  id                   bigint NOT NULL DEFAULT nextval('warehouses_id_seq'::regclass),
  name                 character varying(100) NOT NULL,
  location             character varying(255),
  country              character varying(50),
  is_active            boolean DEFAULT true,
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now()
);

CREATE TABLE public.wishlist (
  id                   bigint NOT NULL DEFAULT nextval('wishlist_id_seq'::regclass),
  user_id              bigint NOT NULL,
  product_id           bigint NOT NULL,
  created_at           timestamp with time zone DEFAULT now()
);

