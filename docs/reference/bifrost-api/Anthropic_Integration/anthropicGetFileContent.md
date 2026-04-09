# Get file content (Anthropic format)

Retrieves file content. Returns raw binary file data when Accept header is set to application/octet-stream,
or file metadata as JSON when Accept header is set to application/json.


## HTTP Request

`GET /anthropic/v1/files/{file_id}/content`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | File ID |
| x-model-provider | header | string | Provider for the file |
| Accept | header | string | Response content type - use application/octet-stream for binary download |

### Responses

#### 200
Successful response. Returns file metadata as JSON or raw binary file content.
When returning binary content, the Content-Type header indicates the file's MIME type
and Content-Disposition header may include the filename.


#### 400
Bad request

#### 500
Internal server error

