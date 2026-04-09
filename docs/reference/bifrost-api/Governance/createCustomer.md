# Create customer

Creates a new customer.

## HTTP Request

`POST /api/governance/customers`

### Request Body

```yaml
Object
  - `name` (string)
  - `budget` (object) - Create budget request
```

### Responses

#### 200
Customer created successfully

#### 400
Bad request

#### 500
Internal server error

