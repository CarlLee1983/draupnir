# Login

Authenticates a user and returns a session token.
Sets a cookie with the session token for subsequent requests.


## HTTP Request

`POST /api/session/login`

### Request Body

```yaml
Object
  - `username` (string)
  - `password` (string)
```

### Responses

#### 200
Login successful

#### 400
Bad request

#### 401
Invalid credentials

#### 403
Authentication is not enabled

#### 500
Internal server error

