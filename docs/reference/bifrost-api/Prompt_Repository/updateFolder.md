# Update folder

Updates a folder's name or description.

## HTTP Request

`PUT /api/prompt-repo/folders/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string |  |

### Request Body

```yaml
Object
  - `name` (string)
  - `description` (string)
```

### Responses

#### 200
Folder updated

#### 400
Bad request

#### 404
Folder not found

#### 500
Internal server error

