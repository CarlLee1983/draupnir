# Download file content

Downloads the content of a file.


## HTTP Request

`GET /v1/files/{file_id}/content`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | The ID of the file |
| provider | query | string | The provider of the file |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

