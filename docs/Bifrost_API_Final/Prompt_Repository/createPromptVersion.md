# Create prompt version

Creates a new version for a prompt.

## HTTP Request

`POST /api/prompt-repo/prompts/{id}/versions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | Prompt ID |

### Request Body

```yaml
Object
  - `commit_message` (string)
  - `messages` (array) - Array of message objects
  - `model_params` (object)
  - `provider` (string)
  - `model` (string)
```

### Responses

#### 200
Version created

#### 400
Bad request

#### 500
Internal server error

