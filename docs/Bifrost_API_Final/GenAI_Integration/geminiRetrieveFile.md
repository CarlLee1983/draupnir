# Retrieve file (Gemini format)

Retrieves file metadata in Google Gemini API format.

Note: This endpoint returns file metadata only. Direct file content
download is not supported by Gemini Files API. Use the file.uri
field from the response to access the file content.


## HTTP Request

`GET /genai/v1beta/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | File ID |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

