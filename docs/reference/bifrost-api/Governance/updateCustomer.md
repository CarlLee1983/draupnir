# Update customer

Updates an existing customer.

## HTTP Request

`PUT /api/governance/customers/{customer_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| customer_id | path | string | Customer ID |

### Request Body

```yaml
Object
  - `name` (string)
  - `budget` (object) - Update budget request
```

### Responses

#### 200
Customer updated successfully

#### 400
Bad request

#### 404
Customer not found

#### 500
Internal server error

