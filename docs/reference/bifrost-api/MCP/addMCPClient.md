# Add MCP client

Adds a new MCP client with the specified configuration.
Note: tool_pricing is not available when creating a new client as tools are fetched after client creation.


## HTTP Request

`POST /api/mcp/client`

### Request Body

```yaml
any
```

### Responses

#### 200
MCP client added successfully

#### 400
Bad request

#### 500
Internal server error

