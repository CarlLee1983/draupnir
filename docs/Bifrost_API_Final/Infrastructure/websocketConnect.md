# WebSocket connection

Upgrades to a WebSocket connection for real-time updates.
Server pushes log events, MCP log events, and store update notifications.
Heartbeat pings are sent every 30 seconds.


## HTTP Request

`GET /ws`

### Responses

#### 101
WebSocket upgrade successful

