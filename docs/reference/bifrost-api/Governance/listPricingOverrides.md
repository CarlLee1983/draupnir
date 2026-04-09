# List pricing overrides

Returns all pricing overrides, optionally filtered by scope.

## HTTP Request

`GET /api/governance/pricing-overrides`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| scope_kind | query | string | Filter by scope kind |
| virtual_key_id | query | string | Filter by virtual key ID (for virtual_key* scopes) |
| provider_id | query | string | Filter by provider ID |
| provider_key_id | query | string | Filter by provider key ID |

### Responses

#### 200
Successful response

#### 500
Internal server error

