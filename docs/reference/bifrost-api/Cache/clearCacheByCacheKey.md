# Clear cache by cache key

Clears a cache entry by its direct cache key.

## HTTP Request

`DELETE /api/cache/clear-by-key/{cacheKey}`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| cacheKey | path | string | Cache key to clear |

### Responses

#### 200
Cache cleared successfully

#### 400
Bad request

#### 500
Internal server error

