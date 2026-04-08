# Delete MCP tool logs

Deletes MCP tool logs by their IDs.

## HTTP Request

`DELETE /api/mcp-logs`

### Request Body

```yaml
Object
  - `ids` (array) - Array of log IDs to delete
```

### Responses

#### 200
MCP tool logs deleted successfully

#### 400
Bad request

#### 500
Internal server error

