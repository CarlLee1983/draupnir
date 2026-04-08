# Delete prompt

Deletes a prompt and all its versions and sessions.

## HTTP Request

`DELETE /api/prompt-repo/prompts/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string |  |

### Responses

#### 200
Prompt deleted

#### 404
Prompt not found

#### 500
Internal server error

