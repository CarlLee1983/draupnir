# Delete prompt session

Deletes a specific session.

## HTTP Request

`DELETE /api/prompt-repo/sessions/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Session ID |

### Responses

#### 200
Session deleted

#### 404
Session not found

#### 500
Internal server error

