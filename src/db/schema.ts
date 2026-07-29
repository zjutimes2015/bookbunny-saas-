import { boolean, integer, pgTable, text, timestamp, index, unique, jsonb, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	normalizedEmail: text('normalized_email').unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	role: text('role'),
	banned: boolean('banned'),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
	customerId: text('customer_id'),
	twitter: text('twitter'),
}, (table) => ({
	userIdIdx: index("user_id_idx").on(table.id),
	userCustomerIdIdx: index("user_customer_id_idx").on(table.customerId),
	userRoleIdx: index("user_role_idx").on(table.role),
}));

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	impersonatedBy: text('impersonated_by')
}, (table) => ({
	sessionTokenIdx: index("session_token_idx").on(table.token),
	sessionUserIdIdx: index("session_user_id_idx").on(table.userId),
}));

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
}, (table) => ({
	accountUserIdIdx: index("account_user_id_idx").on(table.userId),
	accountAccountIdIdx: index("account_account_id_idx").on(table.accountId),
	accountProviderIdIdx: index("account_provider_id_idx").on(table.providerId),
}));

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const payment = pgTable("payment", {
	id: text("id").primaryKey(),
	priceId: text('price_id').notNull(),
	type: text('type').notNull(),
	scene: text('scene'), // payment scene: 'lifetime', 'credit', 'subscription'
	interval: text('interval'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	customerId: text('customer_id').notNull(),
	subscriptionId: text('subscription_id'),
	sessionId: text('session_id'),
	invoiceId: text('invoice_id').unique(), // unique constraint for avoiding duplicate processing
	status: text('status').notNull(),
	paid: boolean('paid').notNull().default(false), // indicates whether payment is completed (set in invoice.paid event)
	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),
	cancelAtPeriodEnd: boolean('cancel_at_period_end'),
	trialStart: timestamp('trial_start'),
	trialEnd: timestamp('trial_end'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
	paymentTypeIdx: index("payment_type_idx").on(table.type),
	paymentSceneIdx: index("payment_scene_idx").on(table.scene),
	paymentPriceIdIdx: index("payment_price_id_idx").on(table.priceId),
	paymentUserIdIdx: index("payment_user_id_idx").on(table.userId),
	paymentCustomerIdIdx: index("payment_customer_id_idx").on(table.customerId),
	paymentStatusIdx: index("payment_status_idx").on(table.status),
	paymentPaidIdx: index("payment_paid_idx").on(table.paid),
	paymentSubscriptionIdIdx: index("payment_subscription_id_idx").on(table.subscriptionId),
	paymentSessionIdIdx: index("payment_session_id_idx").on(table.sessionId),
	paymentInvoiceIdIdx: index("payment_invoice_id_idx").on(table.invoiceId),
}));

export const userCredit = pgTable("user_credit", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	currentCredits: integer("current_credits").notNull().default(0),
	lastRefreshAt: timestamp("last_refresh_at"), // deprecated
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	userCreditUserIdIdx: index("user_credit_user_id_idx").on(table.userId),
}));

export const creditTransaction = pgTable("credit_transaction", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	type: text("type").notNull(),
	description: text("description"),
	amount: integer("amount").notNull(),
	remainingAmount: integer("remaining_amount"),
	paymentId: text("payment_id"), // field name is paymentId, but actually it's invoiceId
	expirationDate: timestamp("expiration_date"),
	expirationDateProcessedAt: timestamp("expiration_date_processed_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	creditTransactionUserIdIdx: index("credit_transaction_user_id_idx").on(table.userId),
	creditTransactionTypeIdx: index("credit_transaction_type_idx").on(table.type),
}));

export const domain = pgTable("domain", {
	id: text("id").primaryKey(),
	url: text("url").notNull().unique(),
	domainRating: integer("domain_rating"),
	ahRank: integer("ah_rank"),
	traffic: integer("traffic"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	domainUrlIdx: index("domain_url_idx").on(table.url),
}));

// Domain DR history for DR and AhRank from Ahrefs API
export const domainDrHistory = pgTable("domain_dr_history", {
	id: text("id").primaryKey(),
	domainId: text("domain_id").notNull().references(() => domain.id, { onDelete: 'cascade' }),
	domain: text("domain").notNull(), // Domain URL for direct query optimization
	domainRating: integer("domain_rating"),
	ahRank: integer("ah_rank"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	domainDrHistoryDomainIdIdx: index("domain_dr_history_domain_id_idx").on(table.domainId),
	domainDrHistoryDomainIdx: index("domain_dr_history_domain_idx").on(table.domain),
	domainDrHistoryCreatedAtIdx: index("domain_dr_history_created_at_idx").on(table.createdAt),
}));

// Domain traffic history for traffic and other data from Similarweb API
export const domainTrafficHistory = pgTable("domain_traffic_history", {
	id: text("id").primaryKey(),
	domainId: text("domain_id").notNull().references(() => domain.id, { onDelete: 'cascade' }),
	domain: text("domain").notNull(), // Domain URL for direct query optimization
	data: jsonb("data").notNull(), // Complete Similarweb API response data
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	domainTrafficHistoryDomainIdIdx: index("domain_traffic_history_domain_id_idx").on(table.domainId),
	domainTrafficHistoryDomainIdx: index("domain_traffic_history_domain_idx").on(table.domain),
	domainTrafficHistoryCreatedAtIdx: index("domain_traffic_history_created_at_idx").on(table.createdAt),
}));

export const productCategory = pgTable("product_category", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	emoji: text("emoji").notNull(),
	slug: text("slug").notNull().unique(),
	order: integer("order").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	productCategorySlugIdx: index("product_category_slug_idx").on(table.slug),
	productCategoryOrderIdx: index("product_category_order_idx").on(table.order),
}));

export const product = pgTable("product", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	domainId: text("domain_id").notNull().references(() => domain.id, { onDelete: 'cascade' }),
	categoryId: text("category_id").notNull().references(() => productCategory.id, { onDelete: 'restrict' }),
	url: text("url").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	logo: text("logo"),
	ogImage: text("og_image"),
	markdown: text("markdown"), // Markdown content from Firecrawl
	private: boolean("private").notNull().default(false), // private product won't appear in leaderboard
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	productUserIdIdx: index("product_user_id_idx").on(table.userId),
	productDomainIdIdx: index("product_domain_id_idx").on(table.domainId),
	productCategoryIdIdx: index("product_category_id_idx").on(table.categoryId),
	productPrivateIdx: index("product_private_idx").on(table.private),
}));

export const directory = pgTable("directory", {
	id: text("id").primaryKey(),
	domainId: text("domain_id").notNull().references(() => domain.id, { onDelete: 'cascade' }),
	url: text("url").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	logo: text("logo"),
	ogImage: text("og_image"),
	source: text("source").notNull(), // 'system' | 'user'
	productId: text("product_id").references(() => product.id, { onDelete: 'set null' }),
	status: text("status").notNull(), // 'active' | 'pending' | 'rejected'
	rejectedReason: text("rejected_reason"),
	pricing: text("pricing"), // 'free' | 'paid' | 'mixed'
	category: text("category"), // 'AI Tools' | 'Anything' | 'Dev Tools' | 'Boilerplates' | 'Open Source' | 'Directories'
	dofollow: boolean("dofollow").notNull(),
	account: boolean("account").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	directoryDomainIdIdx: index("directory_domain_id_idx").on(table.domainId),
	directoryProductIdIdx: index("directory_product_id_idx").on(table.productId),
  directoryUrlIdx: index("directory_url_idx").on(table.url),
	directorySourceIdx: index("directory_source_idx").on(table.source),
	directoryStatusIdx: index("directory_status_idx").on(table.status),
	directoryCategoryIdx: index("directory_category_idx").on(table.category),
	directoryPricingIdx: index("directory_pricing_idx").on(table.pricing),
	directoryDofollowIdx: index("directory_dofollow_idx").on(table.dofollow),
	directoryAccountIdx: index("directory_account_idx").on(table.account),
}));

export const productDirectory = pgTable("product_directory", {
	id: text("id").primaryKey(),
	productId: text("product_id").notNull().references(() => product.id, { onDelete: 'cascade' }),
	directoryId: text("directory_id").notNull().references(() => directory.id, { onDelete: 'cascade' }),
	status: text("status").notNull(), // 'unknown' | 'submitted' | 'approved' | 'rejected'
	notes: text("notes"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	productDirectoryProductIdIdx: index("product_directory_product_id_idx").on(table.productId),
	productDirectoryDirectoryIdIdx: index("product_directory_directory_id_idx").on(table.directoryId),
	productDirectoryStatusIdx: index("product_directory_status_idx").on(table.status),
	productDirectoryUnique: unique("product_directory_unique").on(table.productId, table.directoryId),
}));

// Deal event definition table (e.g., Black Friday 2025, Cyber Monday 2025)
export const dealEvent = pgTable("deal_event", {
	id: text("id").primaryKey(),
	name: text("name").notNull(), // e.g., 'Black Friday 2025', 'Cyber Monday 2025'
	type: text("type").notNull().unique(), // e.g., 'BF2025', 'CM2025' - unique identifier
	description: text("description"), // optional description of the event
	status: text("status").notNull().default('active'), // 'active' | 'inactive'
	startDate: timestamp("start_date"), // optional: when the deal starts
	endDate: timestamp("end_date"), // optional: when the deal ends
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	dealEventTypeIdx: index("deal_event_type_idx").on(table.type),
	dealEventStatusIdx: index("deal_event_status_idx").on(table.status),
	dealEventCreatedAtIdx: index("deal_event_created_at_idx").on(table.createdAt),
}));

// Product deal participation table
export const productDeal = pgTable("product_deal", {
	id: text("id").primaryKey(),
	productId: text("product_id").notNull().references(() => product.id, { onDelete: 'cascade' }),
	dealEventId: text("deal_event_id").notNull().references(() => dealEvent.id, { onDelete: 'cascade' }),
	price: integer("price").notNull(), // required: deal price in cents (e.g., 1000 for $10)
	originalPrice: integer("original_price"), // optional: original price in cents (e.g., 1500 for $15)
	discount: text("discount"), // optional: discount text (e.g., "30% OFF" or "$50 OFF")
	couponCode: text("coupon_code"), // optional: coupon code (e.g., "BF2025")
	featured: boolean("featured").notNull().default(false), // editor's choice, featured deals shown first
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	productDealProductIdIdx: index("product_deal_product_id_idx").on(table.productId),
	productDealDealEventIdIdx: index("product_deal_deal_event_id_idx").on(table.dealEventId),
	productDealFeaturedIdx: index("product_deal_featured_idx").on(table.featured),
	// Composite index for optimized queries: filter by dealEventId, sort by featured and createdAt
	productDealEventFeaturedCreatedIdx: index("product_deal_event_featured_created_idx").on(
		table.dealEventId,
		table.featured,
		table.createdAt
	),
	productDealUnique: unique("product_deal_unique").on(table.productId, table.dealEventId),
}));

// ============================================================================
// BookBunny tables
// ============================================================================

/**
 * BookBunny characters table
 *
 * Stores user-created characters with a reference image and style preset.
 */
export const bookCharacter = pgTable("book_character", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	name: text("name").notNull(),
	imageUrl: text("image_url"),
	style: text("style").notNull().default('watercolor'),
	refSeed: integer("ref_seed"),
	promptTemplate: text("prompt_template"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
	bookCharacterUserIdIdx: index("book_character_user_id_idx").on(table.userId),
	bookCharacterCreatedAtIdx: index("book_character_created_at_idx").on(table.createdAt),
}));

/**
 * BookBunny stories table
 *
 * Stores AI-generated story content (array of page texts).
 */
export const bookStory = pgTable("book_story", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	title: text("title").notNull(),
	content: text("content").array().notNull(),
	ageGroup: text("age_group").notNull(),
	theme: text("theme").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
	bookStoryUserIdIdx: index("book_story_user_id_idx").on(table.userId),
	bookStoryCreatedAtIdx: index("book_story_created_at_idx").on(table.createdAt),
}));

/**
 * BookBunny books table
 *
 * A "book" is the final artifact: a story + character + generated page images.
 * Status flow: draft -> generating -> ready -> exported
 */
export const book = pgTable("book", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	title: text("title").notNull(),
	characterId: uuid("character_id").references(() => bookCharacter.id, { onDelete: 'set null' }),
	storyId: uuid("story_id").references(() => bookStory.id, { onDelete: 'set null' }),
	pageImageUrls: text("page_image_urls").array(),
	status: text("status").notNull().default('draft'), // draft | generating | ready | exported
	format: text("format"), // e.g. '8.5x8.5'
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	bookUserIdIdx: index("book_user_id_idx").on(table.userId),
	bookCharacterIdIdx: index("book_character_id_idx").on(table.characterId),
	bookStoryIdIdx: index("book_story_id_idx").on(table.storyId),
	bookStatusIdx: index("book_status_idx").on(table.status),
	bookCreatedAtIdx: index("book_created_at_idx").on(table.createdAt),
}));
