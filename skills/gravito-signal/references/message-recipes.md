# Message Recipes

Common `Mailable` patterns.

## Welcome email

```typescript
class WelcomeEmail extends Mailable {
  build(): this {
    return this
      .to(this.user.email, this.user.displayName)
      .subject('Welcome')
      .template('emails.welcome', { name: this.user.displayName })
  }
}
```

## Invitation email

```typescript
class InvitationEmail extends Mailable {
  build(): this {
    return this
      .to(this.inviteeEmail)
      .subject('You are invited')
      .html('<p>You have been invited to join the organization.</p>')
  }
}
```

## Password reset email

```typescript
class PasswordResetEmail extends Mailable {
  build(): this {
    return this
      .to(this.user.email)
      .subject('Reset your password')
      .template('emails.password-reset', { token: this.token })
  }
}
```

## Rules

- choose the simplest renderer that fits the message
- keep template data serializable
- keep localization outside the message text when a catalog exists
