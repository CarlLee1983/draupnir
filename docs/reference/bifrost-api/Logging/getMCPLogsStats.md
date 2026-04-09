# Get MCP tool log statistics

Returns statistics for MCP tool logs matching the specified filters.

## HTTP Request

`GET /api/mcp-logs/stats`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| tool_names | query | string | Comma-separated list of tool names to filter by |
| server_labels | query | string | Comma-separated list of server labels to filter by |
| status | query | string | Comma-separated list of statuses to filter by |
| virtual_key_ids | query | string | Comma-separated list of virtual key IDs to filter by |
| llm_request_ids | query | string | Comma-separated list of LLM request IDs to filter by |
| start_time | query | string | Start time filter (RFC3339 format) |
| end_time | query | string | End time filter (RFC3339 format) |
| min_latency | query | number | Minimum latency filter |
| max_latency | query | number | Maximum latency filter |
| content_search | query | string | Search in tool arguments and results |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

