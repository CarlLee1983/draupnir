# Health check

Returns the health status of the Bifrost server. Checks connectivity to config store,
log store, and vector store if configured.


## HTTP Request

`GET /health`

### Responses

#### 200
Server is healthy

#### 503
Service unavailable

