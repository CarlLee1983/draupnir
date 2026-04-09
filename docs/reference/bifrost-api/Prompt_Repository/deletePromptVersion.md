# Delete prompt version

Deletes a specific version.

## HTTP Request

`DELETE /api/prompt-repo/versions/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Version ID |

### Responses

#### 200
Version deleted

#### 404
Version not found

#### 500
Internal server error

