# Get a single log entry

Retrieves a single log entry by its ID.

## HTTP Request

`GET /api/logs/{id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| id | path | string | Log entry ID |

### Responses

#### 200
Successful response

#### 404
Log not found

#### 500
Internal server error

