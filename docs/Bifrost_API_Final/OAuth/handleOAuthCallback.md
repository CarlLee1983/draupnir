# OAuth callback endpoint

Handles the OAuth provider callback after user authorization.
This endpoint processes the authorization code and exchanges it for an access token.
On success, displays an HTML page that closes the authorization window.


## HTTP Request

`GET /api/oauth/callback`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| state | query | string | State parameter for OAuth security (CSRF protection) |
| code | query | string | Authorization code from the OAuth provider |
| error | query | string | Error code if authorization failed |
| error_description | query | string | Error description if authorization failed |

### Responses

#### 200
OAuth authorization successful. Returns HTML page that closes the authorization window.

#### 400
OAuth authorization failed or missing required parameters

