# Create prompt session

Creates a new playground session for a prompt.

## HTTP Request

`POST /api/prompt-repo/prompts/{id}/sessions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | Prompt ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `version_id` (integer) - Fork from this version
  - `messages` (array)
  - `model_params` (object)
  - `provider` (string)
  - `model` (string)
```

### Responses

#### 200
Session created

#### 400
Bad request

#### 500
Internal server error

