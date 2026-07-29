# Product Submission Feature

This feature allows users to submit their products with automatic domain information fetching from Firecrawl and Ahrefs.

## Features

1. **Automatic Website Information Fetching**: Uses Firecrawl API to extract website metadata (name, title, description, logo)
2. **Domain Metrics**: Fetches Domain Rating (DR) and Ahrefs Rank using RapidAPI's Ahrefs Domain Research API
3. **Editable Form**: Users can review and edit all fetched information before submission
4. **Smart Data Architecture**: Separates domain-level metrics from product-specific information

## Database Schema

### `domain` table (Domain-level shared data)
- `id`: Primary key
- `url`: Unique domain URL (normalized)
- `domainRating`: Ahrefs DR value (shared metric)
- `ahRank`: Ahrefs rank (shared metric)
- `createdAt`, `updatedAt`: Timestamps

**Purpose**: Stores domain-level metrics that can be shared across multiple products. This allows efficient data reuse when multiple products share the same domain.

### `product` table (Product-specific data)
- `id`: Primary key
- `userId`: Foreign key to user table (owner of the product)
- `domainId`: Foreign key to domain table
- `name`: Product name
- `title`: Product title
- `description`: Product description
- `logo`: Product logo URL
- `createdAt`, `updatedAt`: Timestamps

**Purpose**: Stores product-specific information. Each user maintains their own product records with their own data, avoiding conflicts when multiple users submit products from the same domain.

## Data Relationships

- **User → Product**: One-to-Many (one user can submit multiple products)
- **Domain → Product**: One-to-Many (one domain can have multiple products)
- **User isolation**: Each user's product data is independent, preventing conflicts

## Environment Variables

Add these to your `.env` file:

```env
# Firecrawl API for website information
FIRECRAWL_API_KEY="your_firecrawl_api_key"

# RapidAPI for Ahrefs Domain Research
RAPIDAPI_AHREFS_KEY="your_rapidapi_ahrefs_key"
```

## API Endpoints

### Server Actions
- `fetchWebsiteInfoAction`: Fetches website metadata using Firecrawl
- `submitProductAction`: Saves product and domain information to database

### API Routes
- `GET /api/domain/metrics?url={domain}`: Fetches domain metrics from Ahrefs

## Usage Flow

1. User enters a domain URL (e.g., `example.com` or `https://example.com`)
2. Click "Fetch Info" button
3. System fetches:
   - Website metadata from Firecrawl (server action)
   - Domain metrics from Ahrefs (Tanstack Query + API route)
4. Form displays fetched information with editable fields
5. User reviews and can edit any field
6. User clicks "Submit" to save to database
7. System:
   - Creates/updates domain record with metrics (shared data)
   - Creates new product record with user-specific data
   - Links product to domain and user

## Components

- `SubmitProductForm`: Main form component with state management
- Located at: `/products/submit`

## Hooks

- `useFetchWebsiteInfo()`: Mutation hook for fetching website info
- `useFetchDomainMetrics(url, enabled)`: Query hook for fetching domain metrics
- `useSubmitProduct()`: Mutation hook for submitting product

## Design Benefits

1. **Data Isolation**: Each user's product information is independent
2. **Metric Sharing**: Domain-level metrics (DR, rank) are shared to reduce API calls
3. **Flexibility**: Users can edit their product information without affecting others
4. **Scalability**: Easy to extend with more domain-level or product-level fields

## Libraries Used

- **Firecrawl**: Website scraping and metadata extraction
- **RapidAPI Ahrefs**: Domain authority metrics
- **Tanstack Query**: Data fetching and caching
- **React Hook Form**: Form state management
- **Zod**: Schema validation

## Migration

Run the following commands to apply the database migration:

```bash
# Generate migration file
pnpm db:generate

# Apply migration to database
pnpm db:migrate
```

This will create the `domain` and `product` tables with proper relationships.

