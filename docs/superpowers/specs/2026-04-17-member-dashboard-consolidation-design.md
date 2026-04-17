# Design Spec: Member Dashboard Consolidation

**Date**: 2026-04-17
**Topic**: Consolidate Member Overview (總覽) into API Keys Page

## 1. Context & Purpose
Currently, members have a "Overview" (總覽) page that contains redundant analytics overlapping with the "Usage" (用量) page. This creates a cluttered sidebar and a fragmented user experience for a role that primarily needs to view their assigned API keys and balance.

The purpose of this consolidation is to simplify the member interface by removing the dedicated "Overview" page and making the "API Keys" page the primary landing point.

## 2. Proposed Changes

### 2.1 Navigation & Routing
- **Sidebar**: Remove the "總覽" (Overview) item from `MemberLayout.tsx`.
- **Landing Page**: Update the default dashboard path for the 'member' role to `/member/api-keys` in `src/Website/Auth/dashboardPathForWebRole.ts`.
- **Legacy Redirect**: Update `MemberDashboardPage.ts` (backend) to redirect all GET requests to `/member/api-keys`.

### 2.2 Backend Logic Updates (`MemberApiKeysPage.ts`)
The API Keys page must now handle information previously shown on the Overview page:
- **Balance**: Inject `GetBalanceService` and include `balance` in the Inertia props.
- **Onboarding**: Inject `GetPendingInvitationsService` to detect invitations for users without an organization.
- **Organization State**: Ensure `hasOrganization` and `pendingInvitations` are passed to the frontend.

### 2.3 UI Consolidation (`Member/ApiKeys/Index.tsx`)
- **Balance Card**: Display a compact balance card at the top of the API keys list.
- **Onboarding View**: If the user has no organization and no keys, show an empty state card with a "Create Organization" call-to-action (mirroring the current Dashboard logic).
- **Member Role Guard**: Ensure the "Create API Key" button is hidden/removed since members cannot create their own keys.
- **Invitation Handling**: Display the `InvitationCard` component if there are pending invitations.

## 3. Architecture & Data Flow
1. User logs in → Redirected to `/member/api-keys`.
2. `MemberApiKeysPage` (Backend) fetches:
   - Membership/Organization status.
   - Balance (if org exists).
   - Pending invitations (if no org exists).
   - List of assigned API keys.
3. `Member/ApiKeys/Index` (Frontend) renders:
   - Top section: Balance and Quick Info.
   - Middle section: Onboarding (if applicable) or Key list.
   - Bottom section: API Keys data table.

## 4. Testing Strategy
- **Unit Tests**:
  - Verify `dashboardPathForWebRole` returns the correct path for members.
  - Verify `MemberApiKeysPage` returns correct balance/onboarding data in props.
- **E2E Tests**:
  - Test login as member → Lands on API Keys.
  - Test access `/member/dashboard` → Redirects to API Keys.
  - Test member view with no organization → Sees "Create Organization" CTA.
  - Test member view with assigned keys → Sees keys and balance.

## 5. Success Criteria
- Navigation is simplified (no Overview tab for members).
- Members land on their most useful tool (API Keys).
- No loss of functionality (Balance, Onboarding, and Invitations are preserved).
- Redirects ensure no broken bookmarks.
