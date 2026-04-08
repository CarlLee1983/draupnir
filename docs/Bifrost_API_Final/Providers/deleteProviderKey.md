# Delete a key from a provider

Deletes a key from the specified provider. Returns the deleted key.

## HTTP Request

`DELETE /api/providers/{provider}/keys/{key_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | path | string | Provider name |
| key_id | path | string | Key ID |

### Responses

#### 200
Key deleted successfully

#### 400
Bad request

#### 404
Provider or key not found

#### 500
Internal server error

