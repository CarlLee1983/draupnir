# List files (Gemini format)

Lists uploaded files in Google Gemini API format.


## HTTP Request

`GET /genai/v1beta/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| pageSize | query | integer | Maximum number of files to return |
| pageToken | query | string | Page token for pagination |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

