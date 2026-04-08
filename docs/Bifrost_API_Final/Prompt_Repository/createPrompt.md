# Create prompt

Creates a new prompt.

## HTTP Request

`POST /api/prompt-repo/prompts`

### Request Body

```yaml
Object
  - `name` (string)
  - `folder_id` (string)
```

### Responses

#### 200
Prompt created

#### 400
Bad request

#### 500
Internal server error

