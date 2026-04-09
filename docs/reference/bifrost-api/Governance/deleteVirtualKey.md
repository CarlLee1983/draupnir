# Delete virtual key

Deletes a virtual key.

## HTTP Request

`DELETE /api/governance/virtual-keys/{vk_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| vk_id | path | string | Virtual key ID |

### Responses

#### 200
Virtual key deleted successfully

#### 404
Virtual key not found

#### 500
Internal server error

