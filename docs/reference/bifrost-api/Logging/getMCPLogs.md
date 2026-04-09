# Get MCP tool logs

Retrieves MCP tool execution logs with filtering, search, and pagination via query parameters.


## HTTP Request

`GET /api/mcp-logs`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| tool_names | query | string | Comma-separated list of tool names to filter by |
| server_labels | query | string | Comma-separated list of server labels to filter by |
| status | query | string | Comma-separated list of statuses to filter by (processing, success, error) |
| virtual_key_ids | query | string | Comma-separated list of virtual key IDs to filter by |
| llm_request_ids | query | string | Comma-separated list of LLM request IDs to filter by |
| start_time | query | string | Start time filter (RFC3339 format) |
| end_time | query | string | End time filter (RFC3339 format) |
| min_latency | query | number | Minimum latency filter (milliseconds) |
| max_latency | query | number | Maximum latency filter (milliseconds) |
| content_search | query | string | Search in tool arguments and results |
| limit | query | integer | Number of logs to return (default 50, max 1000) |
| offset | query | integer | Number of logs to skip |
| sort_by | query | string | Field to sort by |
| order | query | string | Sort order |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

