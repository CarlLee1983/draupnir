# Draupnir Patterns

Use Signal when a workflow needs transactional email, not for arbitrary notifications.

## Likely uses in Draupnir

- welcome email after registration
- invitation email for organization membership
- password reset email
- audit or security notification when a user action needs a durable trail

## Current project signals

- registration already creates a `UserProfile`
- profile locale can be used to choose the mail language
- shared auth state is already tracked in request context

## Rules

- keep mail orchestration in application services or event handlers
- keep the message payload deterministic
- keep user preference and locale available before rendering
- keep SMTP / SES details out of business code

## Do not

- send mail directly from domain entities
- branch transport selection in controllers
- encode retry policy inside a `Mailable`
