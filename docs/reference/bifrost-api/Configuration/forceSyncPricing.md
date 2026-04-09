# Force pricing sync

Triggers an immediate pricing sync and resets the pricing sync timer.

## HTTP Request

`POST /api/pricing/force-sync`

### Responses

#### 200
Pricing sync triggered successfully

#### 500
Internal server error

#### 503
Config store not available

