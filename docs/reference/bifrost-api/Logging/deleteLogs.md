# Delete logs

Deletes logs by their IDs.

## HTTP Request

`DELETE /api/logs`

### Request Body

```yaml
Object
  - `ids` (array)
```

### Responses

#### 200
Logs deleted successfully

#### 400
Bad request

#### 500
Internal server error

