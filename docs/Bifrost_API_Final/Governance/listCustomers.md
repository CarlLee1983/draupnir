# List customers

Returns a list of all customers.

## HTTP Request

`GET /api/governance/customers`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| from_memory | query | boolean | If true, returns customers from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 500
Internal server error

