# Delete folder

Deletes a folder and cascades to contained prompts.

## HTTP Request

`DELETE /api/prompt-repo/folders/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string |  |

### Responses

#### 200
Folder deleted

#### 404
Folder not found

#### 500
Internal server error

