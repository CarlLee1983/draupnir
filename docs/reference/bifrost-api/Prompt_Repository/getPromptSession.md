# Get prompt session

Returns a specific session by ID.

## HTTP Request

`GET /api/prompt-repo/sessions/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Session ID |

### Responses

#### 200
Successful response

#### 404
Session not found

#### 500
Internal server error

