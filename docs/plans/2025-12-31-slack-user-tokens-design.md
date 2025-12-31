# Slack User Token Authentication Design

**Date:** 2025-12-31
**Status:** Approved

## Overview

This design document describes the architecture for enabling the Slack MCP server to search user private messages (DMs) using Slack user tokens instead of bot tokens. The solution involves per-user authentication, Supabase integration for token storage, and a separate web UI for user onboarding.

## Goals

- Enable searching user private messages (DMs) in Slack
- Use Slack user tokens (`xoxp-`) instead of bot tokens (`xoxb-`)
- Implement per-user authentication (each MCP connection tied to a specific user)
- Store tokens securely in Supabase with encryption
- Automatic token refresh via background job
- Separate web UI application for user onboarding
- Maintain security with long-lived API keys for MCP access

## High-Level Architecture

### Applications

**1. Web UI Application (separate repo/deployment)**
- Technology: User's choice (Next.js, SvelteKit, vanilla Express, etc.)
- Responsibilities:
  - User signup/login via Supabase Auth
  - Slack OAuth flow (redirect, callback handling)
  - Token management (store, encrypt, refresh via background job)
  - Display connection status and MCP configuration instructions
  - API key generation and management
- Deployment: Anywhere that supports web apps (Vercel, Netlify, Railway, etc.)

**2. MCP Server Application (tarantella-mcps - current repo)**
- Technology: Express + TypeScript + MCP SDK (current stack)
- Responsibilities:
  - Verify API keys from Claude
  - Read user's Slack tokens from Supabase (read-only)
  - Execute MCP tools using Slack API with user tokens
  - Return results to Claude
- Deployment: Railway (as currently planned)

**3. Supabase Edge Function (lives in Web UI repo)**
- Technology: Deno/TypeScript
- Responsibilities:
  - Periodic token refresh (cron job every 6 hours)
  - Check for expiring Slack tokens (< 24 hours)
  - Call Slack API to refresh tokens
  - Update database with new tokens
- Deployment: Supabase (scheduled Edge Function)

### Shared Infrastructure

**Supabase Project**
- PostgreSQL database (users, slack_tokens, mcp_api_keys)
- Supabase Auth (user management, not used for MCP auth)
- Row Level Security (RLS) policies
- Edge Functions runtime
- Both applications connect using different service keys:
  - Web UI: Full access key (read/write)
  - MCP Server: Read-only key (enforced via RLS)

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│  Web UI Application Repo                │
│  ┌────────────────────────────────────┐ │
│  │ Web App (Vercel/Netlify)           │ │
│  │ - Supabase Auth UI                 │ │
│  │ - Slack OAuth flow                 │ │
│  │ - API key management               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Supabase Edge Function             │ │
│  │ - Token refresh job (cron)         │ │
│  │ (deployed to Supabase)             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Supabase Migrations                │ │
│  │ - Database schema                  │ │
│  │ - RLS policies                     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  MCP Server Repo (tarantella-mcps)      │
│  ┌────────────────────────────────────┐ │
│  │ Express + MCP SDK (Railway)        │ │
│  │ - Verify API keys                  │ │
│  │ - Read Slack tokens (read-only)    │ │
│  │ - Execute MCP tools                │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

         Both connect to
                ↓
┌─────────────────────────────────────────┐
│         Supabase (shared)               │
│  - PostgreSQL                           │
│  - Supabase Auth                        │
│  - Edge Functions runtime               │
└─────────────────────────────────────────┘
```

## Database Schema

### PostgreSQL Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- auth.users is created automatically by Supabase Auth

-- Slack tokens table
CREATE TABLE public.slack_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted token data
  access_token TEXT NOT NULL,  -- Encrypted xoxp- token
  refresh_token TEXT,           -- Encrypted refresh token

  -- Token metadata
  expires_at TIMESTAMPTZ,       -- When access token expires

  -- Slack user/workspace info
  slack_user_id TEXT NOT NULL,  -- e.g., U01234ABCD
  slack_team_id TEXT NOT NULL,  -- e.g., T01234ABCD
  slack_user_name TEXT,         -- e.g., "alice@company.com"

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One Slack connection per user
  UNIQUE(user_id)
);

-- MCP API Keys table
CREATE TABLE public.mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The API key itself
  api_key TEXT UNIQUE NOT NULL,  -- Bcrypt hash of "mcp_live_xxx"
  api_key_prefix TEXT NOT NULL,  -- First 12 chars for display: "mcp_live_xxx"

  -- Metadata
  name TEXT,                     -- User-friendly name: "My MacBook"
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,        -- Optional expiration (NULL = never)

  -- Audit
  revoked_at TIMESTAMPTZ         -- Soft delete
);

-- Indexes
CREATE INDEX idx_slack_tokens_user_id ON public.slack_tokens(user_id);
CREATE INDEX idx_mcp_api_keys_user_id ON public.mcp_api_keys(user_id);
CREATE INDEX idx_mcp_api_keys_api_key ON public.mcp_api_keys(api_key);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_tokens_updated_at
  BEFORE UPDATE ON public.slack_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE public.slack_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Slack tokens policies
CREATE POLICY "Service role can manage all tokens"
  ON public.slack_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own token"
  ON public.slack_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Service role can manage all API keys"
  ON public.mcp_api_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own API keys"
  ON public.mcp_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Key Design Decisions

- **Encryption:** `access_token` and `refresh_token` stored encrypted using AES-256-GCM
- **One token per user:** `UNIQUE(user_id)` constraint ensures each user has only one Slack connection
- **Cascade deletion:** When Supabase user is deleted, tokens and API keys are automatically removed
- **RLS policies:** Security enforced at database level
- **API key hashing:** API keys stored as bcrypt hashes for security

## Authentication Flow

### User Setup Flow

**Step 1: User signs up (Web UI)**
```
User → Web UI → Supabase Auth → Creates auth.users record
```

**Step 2: User connects Slack (Web UI)**
```
User → "Connect Slack" button → Slack OAuth → Callback
                                               ↓
                                    Store encrypted tokens in slack_tokens
```

**Step 3: User generates MCP API key (Web UI)**
```
User → "Generate API Key" button → Create mcp_api_keys record
                                    ↓
                           Display key once (never shown again)
```

**Step 4: User configures Claude**

Web UI displays configuration:
```json
{
  "mcpServers": {
    "slack": {
      "url": "https://your-mcp-server.railway.app/mcp/slack/sse",
      "headers": {
        "Authorization": "Bearer mcp_live_a1b2c3d4e5f6..."
      }
    }
  }
}
```

### MCP Request Flow

When Claude makes a search request:

```
┌─────────┐                    ┌─────────────┐                    ┌──────────┐
│ Claude  │                    │ MCP Server  │                    │ Supabase │
└────┬────┘                    └──────┬──────┘                    └─────┬────┘
     │                                │                                  │
     │ 1. SSE connection              │                                  │
     │    Authorization: Bearer key   │                                  │
     ├───────────────────────────────▶│                                  │
     │                                │ 2. Verify API key (bcrypt)       │
     │                                ├─────────────────────────────────▶│
     │                                │ 3. Return user_id                │
     │                                │◀─────────────────────────────────┤
     │                                │                                  │
     │ 4. search_messages request     │                                  │
     ├───────────────────────────────▶│                                  │
     │                                │ 5. Query slack_tokens by user_id │
     │                                ├─────────────────────────────────▶│
     │                                │ 6. Return encrypted token        │
     │                                │◀─────────────────────────────────┤
     │                                │                                  │
     │                                │ 7. Decrypt token                 │
     │                                │                                  │
     │                                │ 8. Call Slack API                │
     │                                ├──────────────────────────────────▶
     │                                │ 9. Slack results                 │
     │                                │◀──────────────────────────────────
     │ 10. Return to Claude           │                                  │
     │◀───────────────────────────────┤                                  │
```

### API Key Benefits

✅ **No token refresh needed** - API keys are long-lived (or never expire)
✅ **Simple Claude config** - User sets it once, works forever
✅ **Revocable** - Web UI can revoke keys anytime
✅ **Multiple devices** - User can generate separate keys per device
✅ **Audit trail** - Track when keys were last used
✅ **Secure** - Keys are hashed with bcrypt, can't be recovered if DB is compromised

## Slack OAuth Flow (Web UI)

### Slack App Setup

**Prerequisites:**
1. Create Slack app at https://api.slack.com/apps
2. Configure OAuth scopes:
   - `search:read` - Search messages
   - `users:read` - Get user info
3. Add redirect URL: `https://your-web-ui.com/auth/slack/callback`
4. Note Client ID and Client Secret

### OAuth Implementation

**Step 1: User initiates connection**

```typescript
// Web UI route
app.get('/connect-slack', (req, res) => {
  const user = req.user; // From Supabase Auth middleware
  const state = randomBytes(32).toString('hex');

  req.session.oauth_state = state;

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: 'search:read,users:read',
    redirect_uri: process.env.SLACK_REDIRECT_URI!,
    state: state,
    user_scope: '', // User token, not bot token
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
});
```

**Step 2: Slack redirects back**

```typescript
app.get('/auth/slack/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error === 'access_denied') {
    return res.redirect('/dashboard?error=slack_denied');
  }

  if (state !== req.session.oauth_state) {
    return res.status(400).send('Invalid state parameter');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code as string,
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
    }),
  });

  const tokens = await tokenResponse.json();

  const {
    authed_user: {
      access_token,
      refresh_token,
      expires_in,
      id: slack_user_id,
    },
    team: { id: slack_team_id },
  } = tokens;

  // Encrypt and store tokens
  await supabase.from('slack_tokens').upsert({
    user_id: req.user.id,
    access_token: encrypt(access_token),
    refresh_token: encrypt(refresh_token),
    expires_at: new Date(Date.now() + expires_in * 1000),
    slack_user_id,
    slack_team_id,
    slack_user_name: userInfo.user.profile.email,
  });

  res.redirect('/dashboard?success=slack_connected');
});
```

### Token Encryption

**AES-256-GCM symmetric encryption:**

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 64-char hex
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## Token Refresh (Supabase Edge Function)

### Background Job Strategy

**Approach:** Periodic Supabase Edge Function triggered by cron every 6 hours.

**Location:** Lives in Web UI repository at `supabase/functions/refresh-slack-tokens/`

### Implementation

```typescript
// supabase/functions/refresh-slack-tokens/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find tokens expiring in next 24 hours
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { data: expiringTokens } = await supabase
    .from('slack_tokens')
    .select('*')
    .not('refresh_token', 'is', null)
    .lt('expires_at', tomorrow.toISOString());

  if (!expiringTokens || expiringTokens.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No tokens to refresh'
    }));
  }

  let successCount = 0;
  let failCount = 0;

  for (const token of expiringTokens) {
    try {
      await refreshSingleToken(supabase, token);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`Failed for user ${token.user_id}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    successCount,
    failCount,
  }));
});

async function refreshSingleToken(supabase: any, token: any) {
  const refreshToken = await decrypt(token.refresh_token);

  // Call Slack token refresh API
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('SLACK_CLIENT_ID')!,
      client_secret: Deno.env.get('SLACK_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  const {
    authed_user: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in,
    },
  } = data;

  // Update database
  await supabase
    .from('slack_tokens')
    .update({
      access_token: await encrypt(newAccessToken),
      refresh_token: await encrypt(newRefreshToken),
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .eq('user_id', token.user_id);
}
```

### Deployment

```bash
# Deploy Edge Function
supabase functions deploy refresh-slack-tokens

# Schedule cron (via Supabase Dashboard or CLI)
# Schedule: 0 */6 * * * (every 6 hours)
# Header: Authorization: Bearer <CRON_SECRET>
```

### Benefits of Edge Functions

✅ **No separate deployment** - Lives in Supabase, not web UI
✅ **Built-in cron** - Native scheduling
✅ **Scales automatically** - Serverless
✅ **Isolated** - Web UI deployments don't affect job
✅ **Logs integrated** - View in Supabase Dashboard

## MCP Tool Implementation

### Updated Server Architecture

```typescript
// src/server.ts
import { createClient } from '@supabase/supabase-js';
import { verifyMCPApiKey } from './auth/verify-api-key.js';
import { decrypt } from './lib/encryption.js';

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

app.get('/mcp/slack/sse', async (req, res) => {
  // 1. Verify API key
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  const { userId } = await verifyMCPApiKey(supabase, apiKey);

  // 2. Fetch user's Slack token
  const { data: slackToken } = await supabase
    .from('slack_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!slackToken) {
    return res.status(403).json({
      error: 'No Slack account connected'
    });
  }

  // 3. Decrypt and use token
  const decryptedToken = decrypt(slackToken.access_token);
  const slackServer = createSlackMcpServer(decryptedToken);

  // 4. Connect MCP server
  slackServer.connect(res);
});
```

### API Key Verification

```typescript
// src/auth/verify-api-key.ts
import bcrypt from 'bcrypt';

export async function verifyMCPApiKey(
  supabase: SupabaseClient,
  apiKey: string
): Promise<{ userId: string }> {

  if (!apiKey.startsWith('mcp_live_')) {
    throw new Error('Invalid API key format');
  }

  const { data: keys } = await supabase
    .from('mcp_api_keys')
    .select('id, user_id, api_key')
    .is('revoked_at', null)
    .or('expires_at.is.null,expires_at.gt.now()');

  for (const key of keys ?? []) {
    const matches = await bcrypt.compare(apiKey, key.api_key);

    if (matches) {
      // Update last_used_at (async)
      supabase
        .from('mcp_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id)
        .then(() => {});

      return { userId: key.user_id };
    }
  }

  throw new Error('Invalid API key');
}
```

### Environment Variables

**MCP Server:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENCRYPTION_KEY=64_character_hex_string
PORT=3000
```

**Web UI:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=abc123def456
SLACK_REDIRECT_URI=https://your-web-ui.com/auth/slack/callback
ENCRYPTION_KEY=64_character_hex_string
```

**Edge Function (set in Supabase Dashboard):**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_CLIENT_ID=123456789.123456789
SLACK_CLIENT_SECRET=abc123def456
ENCRYPTION_KEY=64_character_hex_string
CRON_SECRET=random_secret_for_cron_auth
```

## Error Handling

### Error Categories

1. **Authentication Errors (401/403)**
   - Missing API key
   - Invalid API key
   - No Slack connection
   - Expired Slack token

2. **Slack API Errors (4xx/5xx)**
   - Token expired/revoked
   - Missing scope
   - Rate limited
   - Channel not found

3. **Database Errors (5xx)**
   - Connection failures
   - Query errors

4. **Network Errors**
   - Timeouts
   - Connection failures

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid or revoked API key. Generate a new key in the web UI.",
    "details": {
      "timestamp": "2025-12-31T10:30:00Z"
    }
  }
}
```

### User-Facing Error Messages

Errors provide clear, actionable guidance:

```typescript
const ERROR_MESSAGES = {
  NO_SLACK_CONNECTION: `
I couldn't find a connected Slack account.

To fix this:
1. Visit ${WEB_UI_URL}
2. Click "Connect Slack"
3. Authorize the application
4. Try again
  `,

  EXPIRED_TOKEN: `
Your Slack connection has expired.

To reconnect:
1. Go to ${WEB_UI_URL}/settings
2. Click "Reconnect Slack"
3. Try your search
  `,
};
```

## Testing Strategy

### Unit Tests (80% coverage target)

- API key generation and verification
- Token encryption/decryption
- Slack client methods
- Tool input validation (Zod schemas)
- Error handling logic

### Integration Tests

- Full authentication flow (API key → Supabase → Slack token)
- Slack OAuth callback handling
- Token refresh Edge Function
- MCP tool execution with real Slack API (test workspace)

### Manual Testing Checklist

**Web UI:**
- [ ] User signup with Supabase Auth
- [ ] Slack OAuth flow
- [ ] API key generation
- [ ] API key revocation
- [ ] Disconnect/reconnect Slack

**MCP Server:**
- [ ] Configure Claude with API key
- [ ] Search public channels
- [ ] Search private channels
- [ ] Search DMs
- [ ] Handle expired token

**Token Refresh:**
- [ ] Edge Function runs on schedule
- [ ] Tokens refreshed before expiration
- [ ] Failed refresh notifies user

## Security Considerations

1. **Token Encryption:** All Slack tokens encrypted at rest with AES-256-GCM
2. **API Key Hashing:** API keys stored as bcrypt hashes
3. **RLS Policies:** Database-level access control
4. **Read-Only MCP Server:** Cannot modify tokens, only read
5. **OAuth State Parameter:** CSRF protection for Slack OAuth
6. **Secrets Management:** All secrets in environment variables, never in code
7. **HTTPS Only:** All production endpoints use HTTPS
8. **Token Rotation:** Refresh tokens rotated on each refresh

## Deployment Workflow

### Web UI Repository

```bash
# Initialize Supabase
supabase init
supabase link --project-ref your-project-id

# Deploy database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy refresh-slack-tokens

# Deploy web app
vercel deploy  # or your preferred platform
```

### MCP Server Repository

```bash
# Deploy to Railway
railway up
# or
git push railway main
```

## Success Criteria

- ✅ Users can sign up and connect Slack via OAuth
- ✅ Users can generate long-lived API keys for MCP
- ✅ Claude can search user's DMs with their token
- ✅ Tokens automatically refresh before expiration
- ✅ Clear error messages guide users to fix issues
- ✅ All tokens encrypted at rest
- ✅ MCP server has read-only access to tokens
- ✅ Separate deployments for Web UI and MCP server

## Future Enhancements

- Email notifications for token refresh failures
- API key expiration policies
- Rate limiting per user/API key
- Metrics dashboard (active users, API calls, etc.)
- Support for multiple Slack workspaces per user
- Webhook for Slack app uninstall events
