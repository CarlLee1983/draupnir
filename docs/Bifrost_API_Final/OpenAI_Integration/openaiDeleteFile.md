# Delete file (OpenAI format)

Deletes an uploaded file.

**Note:** This endpoint also works without the `/v1` prefix (e.g., `/openai/files/{file_id}`).


## HTTP Request

`DELETE /openai/v1/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | File ID to delete |
| provider | query | string | Provider for the file |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

