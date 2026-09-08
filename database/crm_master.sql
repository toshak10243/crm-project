--
-- PostgreSQL database dump
--

\restrict QDch5XP07Fqaxx8brGSAzvO2cLCSBjShR6X6ymBoWasFo7q3k9DsKJfDDZVRWym

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    entity_name character varying(255),
    details jsonb,
    performed_by uuid,
    performed_by_name character varying(255),
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: background_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.background_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue character varying(100) NOT NULL,
    job_name character varying(255) NOT NULL,
    payload jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error text,
    result jsonb,
    scheduled_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.background_jobs OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    admin_name character varying(255) NOT NULL,
    admin_email character varying(255) NOT NULL,
    db_name character varying(100) NOT NULL,
    phone character varying(20),
    address text,
    is_active boolean DEFAULT true,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    plan character varying(50) DEFAULT 'trial'::character varying,
    trial_ends_at timestamp with time zone,
    subscription_start_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    subscription_plan character varying(50) DEFAULT '1year'::character varying,
    subscription_amount numeric(10,2),
    payment_reference character varying(255),
    payment_notes text,
    payment_verified_at timestamp with time zone,
    payment_verified_by uuid
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_templates (
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    subject text NOT NULL,
    body text,
    description character varying(500),
    variables text[],
    type character varying(20) DEFAULT 'email'::character varying,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: failed_login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failed_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier character varying(255),
    ip_address character varying(50),
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.failed_login_attempts OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number character varying(50) NOT NULL,
    company_id uuid NOT NULL,
    company_name character varying(255) NOT NULL,
    admin_name character varying(255) NOT NULL,
    admin_email character varying(255) NOT NULL,
    plan character varying(50) NOT NULL,
    plan_label character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    gst_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying,
    payment_mode character varying(50),
    reference_no character varying(255),
    subscription_from timestamp with time zone NOT NULL,
    subscription_to timestamp with time zone NOT NULL,
    pdf_path character varying(500),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    super_admin_id uuid,
    ip_address character varying(50),
    user_agent text,
    device character varying(255),
    status character varying(20) DEFAULT 'success'::character varying,
    failure_reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.login_history OWNER TO postgres;

--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    company_name character varying(255) NOT NULL,
    admin_email character varying(255),
    amount numeric(10,2) NOT NULL,
    plan character varying(50),
    payment_mode character varying(50),
    reference_no character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    rejection_reason text,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_history OWNER TO postgres;

--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan character varying(50) DEFAULT '1year'::character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_mode character varying(50),
    reference_no character varying(255),
    screenshot_url character varying(500),
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying,
    verified_by uuid,
    verified_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payment_requests OWNER TO postgres;

--
-- Name: super_admin_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admin_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.super_admin_otps OWNER TO postgres;

--
-- Name: super_admin_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admin_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    super_admin_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    ip_address character varying(50),
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.super_admin_tokens OWNER TO postgres;

--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    username character varying(100),
    phone character varying(20)
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    label character varying(255),
    description character varying(500),
    type character varying(50) DEFAULT 'text'::character varying,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: whatsapp_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_templates (
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    body text NOT NULL,
    description character varying(500),
    variables text[],
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_templates OWNER TO postgres;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, action, entity_type, entity_id, entity_name, details, performed_by, performed_by_name, ip_address, created_at) FROM stdin;
4a0ca3a6-a048-40fa-9156-cae6f4179204	CREATED_COMPANY	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	{"slug": "toshak-solutions-llp", "adminEmail": "toshaknoob@gmail.com"}	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	\N	2026-09-07 16:26:26.5252+05:30
1fc79d15-303a-4fbd-9cef-1c984acc4410	ACTIVATED_SUBSCRIPTION	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	{"plan": "1year", "amount": 200000}	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	\N	2026-09-07 16:28:31.808436+05:30
bddd70c4-9d6e-431b-b993-012d5544c963	DEACTIVATED_COMPANY	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	\N	\N	\N	\N	2026-09-07 16:30:48.304618+05:30
217055c8-fe3c-49df-ad24-73d5b4c4d659	ACTIVATED_COMPANY	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	::1	2026-09-07 16:36:29.59493+05:30
ece4feae-4d23-4217-9c59-2be9c76a1091	DEACTIVATED_COMPANY	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	\N	2026-09-07 16:36:40.558052+05:30
e7d2c7f5-288a-47dc-95e9-63b8839ddcd3	DELETED_COMPANY	company	90419a2c-82b8-4830-8ac2-cf398e2a9735	Toshak Solutions LLP	\N	\N	\N	\N	2026-09-07 16:41:37.649056+05:30
18931671-4a24-4512-8dde-2ed03756a2fd	DEACTIVATED_COMPANY	company	90901e29-96f8-4953-9bd5-197f6dfada53	Sharma Traders	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	::1	2026-09-08 10:36:31.686133+05:30
3c5f3251-7f2c-495c-999f-07448fc82cfb	ACTIVATED_COMPANY	company	90901e29-96f8-4953-9bd5-197f6dfada53	Sharma Traders	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	::1	2026-09-08 10:36:57.159462+05:30
abc1aa2d-1ec6-4f02-b382-d7f70ba59845	DELETED_COMPANY	company	90901e29-96f8-4953-9bd5-197f6dfada53	Sharma Traders	\N	\N	\N	\N	2026-09-08 10:37:11.78157+05:30
416915a7-3f51-4cd3-9b0e-fc1c65f78e47	CREATED_COMPANY	company	aae0818e-f895-4992-abd4-a887e33cd02e	Sharma Traders	{"slug": "sharma-traders", "adminEmail": "toshak1292@gmail.com"}	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	\N	2026-09-08 10:54:53.516168+05:30
453dbd4d-ed58-4e9f-beee-bf219b425290	DEACTIVATED_COMPANY	company	aae0818e-f895-4992-abd4-a887e33cd02e	Sharma Traders	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	::1	2026-09-08 10:55:17.170116+05:30
02e8a630-36a2-4e98-8349-8b1011f34eaf	ACTIVATED_COMPANY	company	aae0818e-f895-4992-abd4-a887e33cd02e	Sharma Traders	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	::1	2026-09-08 10:55:28.927082+05:30
\.


--
-- Data for Name: background_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.background_jobs (id, queue, job_name, payload, status, attempts, max_attempts, error, result, scheduled_at, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, slug, admin_name, admin_email, db_name, phone, address, is_active, activated_at, expires_at, created_by, created_at, updated_at, plan, trial_ends_at, subscription_start_at, subscription_ends_at, subscription_plan, subscription_amount, payment_reference, payment_notes, payment_verified_at, payment_verified_by) FROM stdin;
aae0818e-f895-4992-abd4-a887e33cd02e	Sharma Traders	sharma-traders	Ramesh Sharma	toshak1292@gmail.com	crm_client_sharma_traders	8619544939	\N	t	2026-09-08 10:55:28.919829+05:30	\N	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	2026-09-08 10:54:48.502088+05:30	2026-09-08 10:55:28.919829+05:30	trial	2026-09-15 10:54:48.5+05:30	\N	\N	1year	\N	\N	\N	\N	\N
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_templates (key, name, subject, body, description, variables, type, is_active, updated_at) FROM stdin;
welcome_trial	Welcome / Trial Start	Welcome to CRM System - Your 7-Day Trial Has Started!	Hello {{admin_name}},\n\nYour 7-day free trial for {{company_name}} has started!\n\nLogin URL: {{login_url}}\n\nTeam CRM System	Sent when a new company is created	{"{{admin_name}}","{{company_name}}","{{trial_ends_at}}","{{login_url}}","{{temp_password}}"}	email	t	2026-09-05 16:08:10.676014+05:30
subscription_activated	Subscription Activated	Subscription Activated - {{company_name}}	Hello {{admin_name}},\n\nYour CRM subscription for {{company_name}} is now active.\n\nPlan: {{plan_label}}\nValid Until: {{subscription_ends_at}}\nAmount Paid: Rs. {{amount}}\n\nThank you for your payment.\n\nTeam CRM System	Sent when payment is verified	{"{{admin_name}}","{{company_name}}","{{plan_label}}","{{subscription_ends_at}}","{{amount}}"}	email	t	2026-09-05 16:08:10.676014+05:30
trial_ending_soon	Trial Ending Soon	Your CRM Trial Expires in {{days}} Days	Hello {{admin_name}},\n\nYour CRM trial for {{company_name}} expires in {{days}} day(s) on {{trial_ends_at}}.\n\nPlease make your payment to continue.\n\nTeam CRM System	Sent 1 and 2 days before trial ends	{"{{admin_name}}","{{company_name}}","{{days}}","{{trial_ends_at}}","{{payment_url}}"}	email	t	2026-09-05 16:08:10.676014+05:30
trial_expired	Trial Expired	Your CRM Trial Has Expired - {{company_name}}	Hello {{admin_name}},\n\nYour CRM trial for {{company_name}} has expired.\n\nPlease contact us to activate your subscription.\n\nTeam CRM System	Sent when trial expires	{"{{admin_name}}","{{company_name}}","{{payment_url}}"}	email	t	2026-09-05 16:08:10.676014+05:30
subscription_expiring	Subscription Expiring Soon	Your CRM Subscription Expires in {{days}} Days	Hello {{admin_name}},\n\nYour CRM subscription for {{company_name}} expires in {{days}} day(s) on {{subscription_ends_at}}.\n\nPlease renew to avoid interruption.\n\nTeam CRM System	Sent 30/15/7/3/1 days before expiry	{"{{admin_name}}","{{company_name}}","{{days}}","{{subscription_ends_at}}","{{payment_url}}"}	email	t	2026-09-05 16:08:10.676014+05:30
subscription_expired	Subscription Expired	Your CRM Subscription Has Expired - {{company_name}}	Hello {{admin_name}},\n\nYour CRM subscription for {{company_name}} has expired.\n\nPlease contact us immediately to restore access.\n\nTeam CRM System	Sent when subscription expires	{"{{admin_name}}","{{company_name}}","{{payment_url}}"}	email	t	2026-09-05 16:08:10.676014+05:30
invoice	Invoice Email	Invoice {{invoice_number}} - Payment Confirmed	Hello {{admin_name}},\n\nPlease find attached your invoice {{invoice_number}} for {{company_name}}.\n\nPlan: {{plan_label}}\nAmount: Rs. {{total_amount}}\nPeriod: {{subscription_from}} to {{subscription_to}}\n\nTeam CRM System	Sent with PDF after payment verification	{"{{admin_name}}","{{company_name}}","{{invoice_number}}","{{plan_label}}","{{total_amount}}"}	email	t	2026-09-05 16:08:10.676014+05:30
password_reset	Password Reset by Admin	Password Reset - {{company_name}} CRM	Hello {{name}},\n\nYour password for {{company_name}} CRM has been reset by the administrator.\n\nNew Temporary Password: {{temp_password}}\n\nPlease login and change your password immediately.\n\nTeam CRM System	Sent when Super Admin force resets password	{"{{name}}","{{company_name}}","{{temp_password}}"}	email	t	2026-09-05 16:08:10.676014+05:30
\.


--
-- Data for Name: failed_login_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failed_login_attempts (id, identifier, ip_address, reason, created_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, company_id, company_name, admin_name, admin_email, plan, plan_label, amount, gst_amount, total_amount, currency, payment_mode, reference_no, subscription_from, subscription_to, pdf_path, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_history (id, super_admin_id, ip_address, user_agent, device, status, failure_reason, created_at) FROM stdin;
f2772cac-7801-412e-b1b8-ffb30368608c	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	\N	\N	Unknown	success	\N	2026-09-08 14:03:01.673947+05:30
\.


--
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_history (id, company_id, company_name, admin_email, amount, plan, payment_mode, reference_no, status, notes, rejection_reason, verified_by, verified_at, created_at) FROM stdin;
\.


--
-- Data for Name: payment_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_requests (id, company_id, plan, amount, payment_mode, reference_no, screenshot_url, notes, status, verified_by, verified_at, rejection_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: super_admin_otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admin_otps (id, email, otp, expires_at, is_used, created_at) FROM stdin;
\.


--
-- Data for Name: super_admin_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admin_tokens (id, super_admin_id, token_hash, ip_address, user_agent, expires_at, created_at) FROM stdin;
81cbd15d-cedb-4c7e-832c-b7e4c86998e1	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	2c1ee382cb461b6d7449974925b33b785e64738290e238b4d2dc1dccfb0840b8	\N	\N	2026-10-04 04:21:44.66366+05:30	2026-09-04 04:21:44.66366+05:30
c3d3fb1e-d030-4cf7-bfd8-bce279531f41	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	66bce5036889a1c9dd674c505dd9a39043392c3c584529d00032132626e6c593	\N	\N	2026-10-04 05:22:19.673424+05:30	2026-09-04 05:22:19.673424+05:30
ac268be4-b400-429d-b4b3-e7d7b5c4609d	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	ba8f1de40128eafe93132f55458a0c5ef9ddd240d8d8eb9f85b36927cc87b1dd	\N	\N	2026-10-04 14:51:00.498117+05:30	2026-09-04 14:51:00.498117+05:30
e3d2b577-3c3f-4e26-9345-7436d18e2a7e	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	f8c419d6f428a7614676d4f477301531bd611c73dc1c09e57296cd8cc0d96739	\N	\N	2026-10-04 15:03:15.522163+05:30	2026-09-04 15:03:15.522163+05:30
1fb88eed-96ac-43ca-ab06-6a29d3df1912	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	937f0dac08fa7f52a8452a629f7e7e5f982f98c7052e06051516dede4597dd14	\N	\N	2026-10-04 15:41:24.315371+05:30	2026-09-04 15:41:24.315371+05:30
8d37bc82-94cc-4785-b972-55ac106af5e6	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	0b539aec3ec7d76a7ac98f3ef42bb3c87079ce57fc5c46a40b130ba0a74c1afb	\N	\N	2026-10-04 15:43:05.508746+05:30	2026-09-04 15:43:05.508746+05:30
6f8a1097-60e7-4daa-ad63-a8da5c6368ed	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	499667d2019f391975370c6c394dbf6c48ec7c97a9a36c5a82f99cb11d7349b8	\N	\N	2026-10-04 16:00:57.929667+05:30	2026-09-04 16:00:57.929667+05:30
c37e917b-c534-46ed-93fd-a3dec23646c5	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	f84d37ca103805d3031fd2c16960c54eef1c703279362bcebbf41222e87c514b	\N	\N	2026-10-04 16:23:35.417279+05:30	2026-09-04 16:23:35.417279+05:30
1e40f89a-875c-4923-9704-30b7f49a0ab0	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	6b149d55fdbcd9ec7a3efa22b9d9c2d62f7be986a393d2bafa677fca40875288	\N	\N	2026-10-04 16:35:34.513992+05:30	2026-09-04 16:35:34.513992+05:30
b779508c-5bc5-4735-9bac-1ac91ad0b349	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	21a22662ef36fab56132e92a5ab1471ccd875ed7057b2238e69a8d796a3f52e3	\N	\N	2026-10-04 17:15:03.424996+05:30	2026-09-04 17:15:03.424996+05:30
cd84e8e2-d52b-470f-9a55-672217e43317	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	cfcba075967c7085aba1cdbdd7dc8c7154d9e9aad0e3f96729c7aa33bbb70b51	\N	\N	2026-10-04 17:36:44.818541+05:30	2026-09-04 17:36:44.818541+05:30
ecb22563-3e87-4478-b3a7-130eefa7f252	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	4cfcf040dc439b15a0cf941c81fe8fa5b03688ef70265ad378a0b3f1d91e97d7	\N	\N	2026-10-04 18:19:57.338682+05:30	2026-09-04 18:19:57.338682+05:30
2094edae-a923-45d2-ac18-cd9a7182c7d8	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	2d627348cab5716c541d92185954b08a0e94eb681464f81d8488282a336bcd49	\N	\N	2026-10-05 11:06:22.416294+05:30	2026-09-05 11:06:22.416294+05:30
24180b94-3fac-472a-9e30-fff0bc4f2cd4	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	d843c82ba55f4617d92c73eb97231aafceb039d2f3ba65a5009dbcca62fc8cc2	\N	\N	2026-10-05 15:41:45.083744+05:30	2026-09-05 15:41:45.083744+05:30
bad48124-cce9-4779-9345-7b91539a2a3a	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	fc90f16d24d2fb6016f3b05591c06b0a628a2e4c7ea658d3a85ac90b9a8f1b97	\N	\N	2026-10-05 16:39:48.274102+05:30	2026-09-05 16:39:48.274102+05:30
a073e7ac-9add-4e9c-9212-6b34c9cbaf46	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	c354fd1cc999c6353a87e529bdde69a65c4c925c1d284bed32b16377069163b2	\N	\N	2026-10-07 11:52:58.533118+05:30	2026-09-07 11:52:58.533118+05:30
05eafdcd-a71a-4c16-b835-8751b6653ad3	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	61907920da01ec05f5f63faa65f441c4fbec0af80673f4e654aebb2c8bc930a9	\N	\N	2026-10-07 12:34:35.49931+05:30	2026-09-07 12:34:35.49931+05:30
549bde4b-91e9-41d8-ac08-aaa138e80bcf	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	2effe990994dfd7c23ebd311ebc844b1569f6509ab15218b429ad9cc5342543e	\N	\N	2026-10-07 13:53:08.676115+05:30	2026-09-07 13:53:08.676115+05:30
d04fee2f-6a00-4e2a-9e6a-45a7f6896ff8	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	b073ed65ee87ebd81e0773a82f309b05848c7392f2f60633d94d64995fb485fe	\N	\N	2026-10-07 15:45:02.842916+05:30	2026-09-07 15:45:02.842916+05:30
17d79ff3-08a1-4e0c-87aa-2c8cd347d6cc	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	f2a4420f767e49abcbf1311b456d11dda60d43908b2ee5b19d28deae1e31ea37	\N	\N	2026-10-07 16:25:39.05371+05:30	2026-09-07 16:25:39.05371+05:30
7657e18c-3f33-49d3-a4b3-bdf7f1d15ec4	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	1d9b6932a106055f755cc9212c7f93fc6b3444a47b91c532fa72a42dd6036871	\N	\N	2026-10-08 10:36:19.003642+05:30	2026-09-08 10:36:19.003642+05:30
dfaac2c5-4127-4fff-850a-9f9b45b9fce9	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	ec487012ffe1540a0f6a1f84453ea015f85a19b53ffb57d292386fae26ad200a	\N	\N	2026-10-08 11:08:54.279942+05:30	2026-09-08 11:08:54.279942+05:30
0472a544-48ee-48af-8122-ecf1af4c6e6a	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	2bbe0425e56eb22ababaffcec0223a4ce62e11c18d1e1f8538bccb79e0270848	\N	\N	2026-10-08 11:51:01.426478+05:30	2026-09-08 11:51:01.426478+05:30
2512f07a-9eb8-439a-8c8e-c97730d88d04	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	22ae3a92033dea039a955d0bdfb7fca3476222dc92a03e264fb27c3a34665d70	\N	\N	2026-10-08 12:39:19.093722+05:30	2026-09-08 12:39:19.093722+05:30
6b19435d-1fbe-4310-a092-57f629412ddf	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	b23effbd32b137fbf0a4a97290029e47f20f2e169f66574729838153b76a4d9d	\N	\N	2026-10-08 13:22:34.436725+05:30	2026-09-08 13:22:34.436725+05:30
6237ae68-9a76-4890-9541-4c932f8b47a8	5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	bfec5fbfde1d543ea7ed2df8b162f41dadb36e3d621f1686bb6f29795d5a5db7	\N	\N	2026-10-08 14:03:01.667682+05:30	2026-09-08 14:03:01.667682+05:30
\.


--
-- Data for Name: super_admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.super_admins (id, name, email, password_hash, is_active, created_at, updated_at, username, phone) FROM stdin;
5eb59e8b-15f9-4e17-b7ed-e78c63d8d7d2	Super Admin	superadmin@crm.com	$2b$12$RRbQWZyTQBCeepgi1vnmce2JQIUkkZKR.H910gr.GDjTat/eBMAWi	t	2026-09-04 04:14:41.795111+05:30	2026-09-04 04:14:41.795111+05:30	\N	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, label, description, type, updated_at) FROM stdin;
trial_days	7	Trial Duration	Default trial period in days	number	2026-09-08 12:07:40.971669+05:30
default_currency	INR	Default Currency	Currency for invoices	text	2026-09-08 12:07:40.971669+05:30
default_timezone	Asia/Kolkata	Default Timezone	Platform timezone	text	2026-09-08 12:07:40.971669+05:30
invoice_prefix	INV	Invoice Prefix	Prefix for invoice numbers	text	2026-09-08 12:07:40.971669+05:30
maintenance_mode	false	Maintenance Mode	Block all client logins	boolean	2026-09-08 12:07:40.971669+05:30
allow_new_companies	true	Allow New Companies	Allow new company registration	boolean	2026-09-08 12:07:40.971669+05:30
support_email	support@crm.com	Support Email	Shown to clients	text	2026-09-08 12:07:40.971669+05:30
support_phone		Support Phone	Shown to clients	text	2026-09-08 12:07:40.971669+05:30
\.


--
-- Data for Name: whatsapp_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.whatsapp_templates (key, name, body, description, variables, is_active, updated_at) FROM stdin;
wa_welcome	Welcome / Trial Start	Hello {{admin_name}},\n\nWelcome to CRM System!\n\nYour account for {{company_name}} has been created successfully.\n\nLogin Details:\n- URL: {{login_url}}\n- Email: {{admin_email}}\n- Password: {{temp_password}}\n\nYour 7-day free trial starts now and ends on {{trial_ends_at}}.\n\nFor any help, contact us anytime.\n\nTeam CRM System	Sent on company creation	{"{{admin_name}}","{{company_name}}","{{admin_email}}","{{temp_password}}","{{login_url}}","{{trial_ends_at}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_trial_ending	Trial Ending Reminder	Hello {{admin_name}},\n\nYour CRM System free trial for {{company_name}} is expiring in {{days}} day(s) on {{trial_ends_at}}.\n\nTo continue without interruption, please make your payment.\n\nContact us to upgrade your plan and keep your data safe.\n\nTeam CRM System	Sent before trial ends	{"{{admin_name}}","{{company_name}}","{{days}}","{{trial_ends_at}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_trial_expired	Trial Expired	Hello {{admin_name}},\n\nYour CRM System free trial for {{company_name}} has expired.\n\nYour account has been temporarily suspended.\n\nTo restore access, please contact us and make your subscription payment immediately.\n\nTeam CRM System	Sent after trial expires	{"{{admin_name}}","{{company_name}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_subscription_activated	Subscription Activated	Hello {{admin_name}},\n\nYour CRM System subscription for {{company_name}} is now active.\n\nSubscription Details:\n- Plan: {{plan_label}}\n- Valid Until: {{subscription_ends_at}}\n- Amount Paid: Rs. {{amount}}\n\nThank you for your payment. Your invoice has been sent to your email.\n\nTeam CRM System	Sent after payment verified	{"{{admin_name}}","{{company_name}}","{{plan_label}}","{{subscription_ends_at}}","{{amount}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_subscription_expiring	Subscription Expiring	Hello {{admin_name}},\n\nYour CRM System subscription for {{company_name}} is expiring in {{days}} day(s) on {{subscription_ends_at}}.\n\nPlease renew your subscription to avoid interruption in service.\n\nContact us to renew your plan.\n\nTeam CRM System	Sent before subscription ends	{"{{admin_name}}","{{company_name}}","{{days}}","{{subscription_ends_at}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_subscription_expired	Subscription Expired	Hello {{admin_name}},\n\nYour CRM System subscription for {{company_name}} has expired.\n\nYour account has been temporarily suspended.\n\nPlease contact us immediately to renew your subscription and restore access.\n\nTeam CRM System	Sent after subscription expires	{"{{admin_name}}","{{company_name}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_payment_received	Payment Received	Hello {{admin_name}},\n\nWe have received your payment for {{company_name}}.\n\nDetails:\n- Amount: Rs. {{amount}}\n- Plan: {{plan_label}}\n- Date: {{payment_date}}\n\nYour subscription is being activated shortly. Invoice will be sent to your email.\n\nTeam CRM System	After payment verified	{"{{admin_name}}","{{company_name}}","{{amount}}","{{plan_label}}","{{payment_date}}"}	t	2026-09-05 16:08:37.325045+05:30
wa_password_reset	Password Reset	Hello {{name}},\n\nYour password for {{company_name}} CRM has been reset by the administrator.\n\nNew Temporary Password: {{temp_password}}\n\nPlease login and change your password immediately.\n\nTeam CRM System	After admin force resets password	{"{{name}}","{{company_name}}","{{temp_password}}"}	t	2026-09-05 16:08:37.325045+05:30
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: background_jobs background_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.background_jobs
    ADD CONSTRAINT background_jobs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_admin_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_admin_email_key UNIQUE (admin_email);


--
-- Name: companies companies_db_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_db_name_key UNIQUE (db_name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (key);


--
-- Name: failed_login_attempts failed_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_login_attempts
    ADD CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: super_admin_otps super_admin_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_otps
    ADD CONSTRAINT super_admin_otps_pkey PRIMARY KEY (id);


--
-- Name: super_admin_tokens super_admin_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_tokens
    ADD CONSTRAINT super_admin_tokens_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_email_key UNIQUE (email);


--
-- Name: super_admins super_admins_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_phone_key UNIQUE (phone);


--
-- Name: super_admins super_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admins_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admins_username_key UNIQUE (username);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: whatsapp_templates whatsapp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_templates
    ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (key);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_companies_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_is_active ON public.companies USING btree (is_active);


--
-- Name: idx_companies_plan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_plan ON public.companies USING btree (plan);


--
-- Name: idx_companies_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_slug ON public.companies USING btree (slug);


--
-- Name: idx_companies_sub_ends; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_sub_ends ON public.companies USING btree (subscription_ends_at);


--
-- Name: idx_companies_trial_ends; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_companies_trial_ends ON public.companies USING btree (trial_ends_at);


--
-- Name: idx_failed_login_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_failed_login_created ON public.failed_login_attempts USING btree (created_at DESC);


--
-- Name: idx_invoices_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_company ON public.invoices USING btree (company_id);


--
-- Name: idx_invoices_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_number ON public.invoices USING btree (invoice_number);


--
-- Name: idx_jobs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_created ON public.background_jobs USING btree (created_at DESC);


--
-- Name: idx_jobs_queue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_queue ON public.background_jobs USING btree (queue);


--
-- Name: idx_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_status ON public.background_jobs USING btree (status);


--
-- Name: idx_login_history_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_admin ON public.login_history USING btree (super_admin_id);


--
-- Name: idx_login_history_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_created ON public.login_history USING btree (created_at DESC);


--
-- Name: idx_payment_history_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_history_company ON public.payment_history USING btree (company_id);


--
-- Name: idx_payment_requests_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_company ON public.payment_requests USING btree (company_id);


--
-- Name: idx_payment_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_requests_status ON public.payment_requests USING btree (status);


--
-- Name: idx_super_admin_tokens_super_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admin_tokens_super_admin_id ON public.super_admin_tokens USING btree (super_admin_id);


--
-- Name: idx_super_admins_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_phone ON public.super_admins USING btree (phone);


--
-- Name: idx_super_admins_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_super_admins_username ON public.super_admins USING btree (username);


--
-- Name: audit_logs audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.super_admins(id);


--
-- Name: companies companies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.super_admins(id);


--
-- Name: invoices invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.super_admins(id);


--
-- Name: login_history login_history_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON DELETE CASCADE;


--
-- Name: payment_history payment_history_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: payment_history payment_history_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.super_admins(id);


--
-- Name: payment_requests payment_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.super_admins(id);


--
-- Name: super_admin_tokens super_admin_tokens_super_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admin_tokens
    ADD CONSTRAINT super_admin_tokens_super_admin_id_fkey FOREIGN KEY (super_admin_id) REFERENCES public.super_admins(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QDch5XP07Fqaxx8brGSAzvO2cLCSBjShR6X6ymBoWasFo7q3k9DsKJfDDZVRWym

