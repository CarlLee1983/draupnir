# Delete customer

Deletes a customer.

## HTTP Request

`DELETE /api/governance/customers/{customer_id}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| customer_id | path | string | Customer ID |

### Responses

#### 200
Customer deleted successfully

#### 404
Customer not found

#### 500
Internal server error

