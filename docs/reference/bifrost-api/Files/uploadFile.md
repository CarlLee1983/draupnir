# Upload a file

Uploads a file to be used with batch operations or other features.


## HTTP Request

`POST /v1/files`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Provider to upload file to (can also use x-model-provider header) |

### Request Body

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

