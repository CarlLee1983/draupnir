# Get virtual key

Returns a specific virtual key by ID.

## HTTP Request

`GET /api/governance/virtual-keys/{vk_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| vk_id | path | string | Virtual key ID |
| from_memory | query | boolean | If true, returns virtual key from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 404
Virtual key not found

#### 500
Internal server error

