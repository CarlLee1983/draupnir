# MCP protocol message

Receives a JSON-RPC 2.0 message for the MCP protocol server.
Returns a JSON-RPC 2.0 response, or null for notifications.


## HTTP Request

`POST /mcp`

### Request Body

```yaml
Object
  - `jsonrpc` (string)
  - `method` (string)
  - `params` (object)
  - `id` (any)
```

### Responses

#### 200
JSON-RPC 2.0 response

