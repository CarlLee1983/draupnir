# Recalculate log costs

Recomputes missing costs in batches. Processes logs with missing cost values
and updates them based on current pricing data.


## HTTP Request

`POST /api/logs/recalculate-cost`

### Request Body

```yaml
Object
  - `filters` (object) - Log search filters
  - `limit` (integer) - Maximum number of logs to process (default 200, max 1000)
```

### Responses

#### 200
Costs recalculated successfully

#### 400
Bad request

#### 500
Internal server error

