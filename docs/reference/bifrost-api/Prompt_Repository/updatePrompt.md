# Update prompt

Updates a prompt's name or folder.

## HTTP Request

`PUT /api/prompt-repo/prompts/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string |  |

### Request Body

```yaml
Object
  - `name` (string)
  - `folder_id` (string)
```

### Responses

#### 200
Prompt updated

#### 400
Bad request

#### 500
Internal server error

