# List video generation jobs

Lists video generation jobs for a specific provider. Results are paginated
and can be filtered using query parameters.


## HTTP Request

`GET /v1/videos`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| provider | query | string | Provider name (e.g., "openai", "gemini") |
| after | query | string | Cursor for pagination - ID of the last item from the previous page |
| limit | query | integer | Maximum number of results to return |
| order | query | string | Sort order by creation time |

### Responses

#### 200
Successful response. Returns a paginated list of video generation jobs.

#### 400
Bad request

#### 500
Internal server error

