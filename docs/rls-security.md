# Row Level Security

RLS is enabled on tenant-owned tables. The policy foundation uses:

- `is_tenant_member(tenant_id)` for active tenant access
- `can_manage_tenant(tenant_id)` for tenant management
- `is_platform_admin()` for a server-managed app-metadata claim
- explicit public-read rules for published public content
- user-owned insert/update policies for enrollments, progress, registrations, and AI conversations
- tenant-prefixed Storage object names

## Important limitation

These policies are a foundation, not a production security certification. They have not been exercised against a live Supabase project. Before launch:

1. Narrow member reads on paid resources using active `member_subscriptions`.
2. Add tests for cross-tenant IDs, expired memberships, suspended tenants, and all roles.
3. Test views, RPC functions, Storage uploads, and signed URLs.
4. Verify security-definer functions have fixed search paths and minimal grants.
5. Audit platform-admin claim issuance and revocation.
6. Verify billing and AI usage writes happen only in trusted server code.

No service-role credential is exposed by application client code.
