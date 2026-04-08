# Create folder

Creates a new prompt folder.

## HTTP Request

`POST /api/prompt-repo/folders`

### Request Body

```yaml
Object
  - `name` (string)
  - `description` (string)
```

### Responses

#### 200
Folder created

#### 400
Bad request

#### 500
Internal server error

