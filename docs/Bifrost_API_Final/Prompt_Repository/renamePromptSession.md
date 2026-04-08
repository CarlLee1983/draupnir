# Rename prompt session

Renames a session.

## HTTP Request

`PUT /api/prompt-repo/sessions/{id}/rename`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Session ID |

### Request Body

```yaml
Object
  - `name` (string)
```

### Responses

#### 200
Session renamed

#### 400
Bad request

#### 500
Internal server error

