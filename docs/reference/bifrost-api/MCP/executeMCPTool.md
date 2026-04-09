# Execute MCP tool

Executes an MCP tool and returns the result.

## HTTP Request

`POST /v1/mcp/tool/execute`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| format | query | string | Format of the tool execution request/response.  |

### Request Body

```yaml
any
```

### Responses

#### 200
Tool executed successfully

#### 400
Bad request

#### 500
Internal server error

