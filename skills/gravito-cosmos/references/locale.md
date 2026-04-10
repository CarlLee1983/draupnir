# Locale

Pick one canonical locale source for the request or session.

Typical inputs:

- request headers
- user profile preference
- cookie or session state
- explicit route prefix

Keep locale resolution deterministic so the same request yields the same language.
