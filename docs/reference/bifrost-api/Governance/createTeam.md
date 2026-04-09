# Create team

Creates a new team.

## HTTP Request

`POST /api/governance/teams`

### Request Body

```yaml
Object
  - `name` (string)
  - `customer_id` (string)
  - `budget` (object) - Create budget request
```

### Responses

#### 200
Team created successfully

#### 400
Bad request

#### 500
Internal server error

