# Delete file (Anthropic format)

Deletes an uploaded file.


## HTTP Request

`DELETE /anthropic/v1/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | File ID to delete |
| x-model-provider | header | string | Provider for the file |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

