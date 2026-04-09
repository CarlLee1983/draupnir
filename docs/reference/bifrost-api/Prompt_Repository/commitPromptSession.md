# Commit session as version

Commits the current session state as a new prompt version.

## HTTP Request

`POST /api/prompt-repo/sessions/{id}/commit`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | integer | Session ID |

### Request Body

```yaml
Object
  - `commit_message` (string)
```

### Responses

#### 200
Version created from session

#### 400
Bad request

#### 500
Internal server error

