# Delete a file

Deletes a file.


## HTTP Request

`DELETE /v1/files/{file_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| file_id | path | string | The ID of the file to delete |
| provider | query | string | The provider of the file |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

