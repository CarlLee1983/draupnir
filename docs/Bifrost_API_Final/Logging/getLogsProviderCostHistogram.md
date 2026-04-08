# Get cost histogram by provider

Returns time-bucketed cost data with provider breakdown.

## HTTP Request

`GET /api/logs/histogram/cost/by-provider`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| providers | query | string | Comma-separated list of providers to filter by |
| models | query | string | Comma-separated list of models to filter by |
| status | query | string | Comma-separated list of statuses to filter by |
| objects | query | string | Comma-separated list of object types to filter by |
| selected_key_ids | query | string | Comma-separated list of selected key IDs to filter by |
| virtual_key_ids | query | string | Comma-separated list of virtual key IDs to filter by |
| routing_rule_ids | query | string | Comma-separated list of routing rule IDs to filter by |
| routing_engine_used | query | string | Comma-separated list of routing engines to filter by |
| start_time | query | string | Start time filter (RFC3339 format) |
| end_time | query | string | End time filter (RFC3339 format) |
| min_latency | query | number | Minimum latency filter |
| max_latency | query | number | Maximum latency filter |
| min_tokens | query | integer | Minimum tokens filter |
| max_tokens | query | integer | Maximum tokens filter |
| min_cost | query | number | Minimum cost filter |
| max_cost | query | number | Maximum cost filter |
| missing_cost_only | query | boolean | Only show logs with missing cost |
| content_search | query | string | Search in request/response content |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

