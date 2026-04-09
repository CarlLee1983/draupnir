# Get configuration

Retrieves the current Bifrost configuration including client config, framework config,
auth config, and connection status for various stores.


## HTTP Request

`GET /api/config`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| from_db | query | string | If true, fetch configuration directly from the database |

### Responses

#### 200
Successful response

#### 500
Internal server error

