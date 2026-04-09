# Issue WebSocket ticket

Issues a short-lived ticket for authenticating WebSocket connections.
The ticket can be used as a query parameter when upgrading to WebSocket.


## HTTP Request

`POST /api/session/ws-ticket`

### Responses

#### 200
Ticket issued successfully

#### 403
Authentication is not enabled

#### 500
Internal server error

