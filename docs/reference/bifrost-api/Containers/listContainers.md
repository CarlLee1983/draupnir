# List containers

Lists containers for a provider.


## HTTP Request

`GET /v1/containers`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Provider to list containers for |
| limit | query | integer | Maximum number of containers to return (1-100, default 20) |
| after | query | string | Cursor for pagination |
| order | query | string | Sort order (asc/desc) |

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

