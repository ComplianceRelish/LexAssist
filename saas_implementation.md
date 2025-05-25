# Subscription and Role Management for Lex Assist

This document outlines the implementation of subscription tiers, role-based access control, and admin functionality for the Lex Assist SaaS application.

## 1. Subscription Tiers

Lex Assist will offer three subscription tiers:

### Free Tier
- Basic case brief analysis
- Limited law section and case history results (up to 5 each)
- Basic document generation (PDF only)
- No case file drafting
- Limited searches per day (10)

### Pro Tier (₹499/month)
- Advanced case brief analysis with detailed insights
- Comprehensive law section and case history results (up to 20 each)
- Document generation in all formats (PDF, DOCX, TXT)
- Basic case file drafting (petitions and replies only)
- Email and WhatsApp sharing
- Increased searches per day (50)
- Priority processing

### Enterprise Tier (₹4999/month)
- All Pro tier features
- Unlimited law section and case history results
- Advanced case file drafting (all document types)
- Custom document templates
- API access for integration with other systems
- Unlimited searches
- Dedicated support
- Team collaboration features

## 2. User Roles and Permissions

Lex Assist will implement a hierarchical role system:

### Super Admin
- Full access to all features and settings
- User management (create, update, delete all users)
- Role assignment and permission configuration
- Subscription management
- System configuration and customization
- Analytics and reporting
- API key management
- Currency configuration

### Admin
- Access based on permissions set by Super Admin
- User management (limited to regular users)
- Basic analytics and reporting
- Content management

### Regular User
- Access based on subscription tier
- Personal profile management
- Brief submission and analysis
- Document generation and sharing (based on tier)
- Case file drafting (based on tier)

## 3. Database Schema Updates

The following tables will be added to the Supabase database:

### Subscriptions Table
```sql
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  payment_method JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Roles Table
```sql
CREATE TABLE public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('super_admin', 'admin', 'user')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### User Roles Table
```sql
CREATE TABLE public.user_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  role_id UUID REFERENCES public.roles NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role_id)
);
```

### Permissions Table
```sql
CREATE TABLE public.permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Role Permissions Table
```sql
CREATE TABLE public.role_permissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id UUID REFERENCES public.roles NOT NULL,
  permission_id UUID REFERENCES public.permissions NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(role_id, permission_id)
);
```

### Usage Limits Table
```sql
CREATE TABLE public.usage_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'pro', 'enterprise')),
  max_searches_per_day INTEGER NOT NULL,
  max_law_sections INTEGER NOT NULL,
  max_case_histories INTEGER NOT NULL,
  document_formats JSONB NOT NULL,
  case_file_types JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Usage Tracking Table
```sql
CREATE TABLE public.usage_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

## 4. Backend API Endpoints

The following API endpoints will be added to support subscription and role management:

### Subscription Endpoints
- `GET /api/subscriptions/plans` - Get available subscription plans
- `GET /api/subscriptions/current` - Get current user's subscription
- `POST /api/subscriptions/subscribe` - Subscribe to a plan
- `PUT /api/subscriptions/cancel` - Cancel subscription
- `PUT /api/subscriptions/change` - Change subscription plan

### Admin Endpoints
- `GET /api/admin/users` - Get all users (with pagination)
- `GET /api/admin/users/:id` - Get specific user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/roles` - Get all roles
- `POST /api/admin/roles` - Create role
- `PUT /api/admin/roles/:id` - Update role
- `DELETE /api/admin/roles/:id` - Delete role
- `GET /api/admin/permissions` - Get all permissions
- `POST /api/admin/user-roles` - Assign role to user
- `DELETE /api/admin/user-roles` - Remove role from user
- `GET /api/admin/analytics/usage` - Get usage analytics
- `GET /api/admin/analytics/subscriptions` - Get subscription analytics

### System Configuration Endpoints
- `GET /api/admin/config` - Get system configuration
- `PUT /api/admin/config` - Update system configuration
- `GET /api/admin/currencies` - Get available currencies
- `POST /api/admin/currencies` - Add new currency
- `PUT /api/admin/currencies/:id` - Update currency
- `DELETE /api/admin/currencies/:id` - Delete currency

## 5. Frontend Components

### Admin Dashboard
- User management interface
- Role and permission management
- Subscription management
- Analytics and reporting
- System configuration

### User Dashboard
- Subscription management
- Usage statistics
- Account settings

### Subscription Pages
- Plan comparison
- Checkout process
- Payment management

## 6. Implementation Strategy

### Phase 1: Database and Backend
1. Update database schema with new tables
2. Implement role-based access control middleware
3. Develop subscription management logic
4. Create admin API endpoints
5. Implement usage tracking and limits

### Phase 2: Frontend
1. Design and implement admin dashboard
2. Create subscription management interfaces
3. Update existing pages with tier-based feature restrictions
4. Implement payment processing integration

### Phase 3: Testing and Deployment
1. Test all subscription flows
2. Verify role-based access controls
3. Test admin functionality
4. Deploy updated application

## 7. Security Considerations

- Implement proper authorization checks for all admin endpoints
- Secure payment processing
- Audit logging for sensitive operations
- Regular security reviews

## 8. Future Enhancements

- Multi-currency support
- Team/organization accounts
- Custom branding for enterprise customers
- Advanced analytics
- Integration with additional payment gateways
