# Get prompt

Returns a prompt by ID with its latest version.

## HTTP Request

`GET /api/prompt-repo/prompts/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string |  |

### Responses

#### 200
Successful response

#### 404
Prompt not found

#### 500
Internal server error

