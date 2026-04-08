# Get prompt version

Returns a specific version by ID.

## HTTP Request

`GET /api/prompt-repo/versions/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Version ID |

### Responses

#### 200
Successful response

#### 404
Version not found

#### 500
Internal server error

