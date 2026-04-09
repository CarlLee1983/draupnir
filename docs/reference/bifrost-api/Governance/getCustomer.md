# Get customer

Returns a specific customer by ID.

## HTTP Request

`GET /api/governance/customers/{customer_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| customer_id | path | string | Customer ID |
| from_memory | query | boolean | If true, returns customer from in-memory cache instead of database |

### Responses

#### 200
Successful response

#### 404
Customer not found

#### 500
Internal server error

