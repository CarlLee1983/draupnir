# Rerank documents

Reorders input documents by relevance to a query.


## HTTP Request

`POST /v1/rerank`

### Request Body

```yaml
Object
  - `model` (string) - Model in provider/model format
  - `query` (string) - Query used to score and reorder documents
  - `documents` (array) - Documents to rerank
  - `fallbacks` (array) - Fallback models in provider/model format
  - `top_n` (integer) - Maximum number of ranked results to return
  - `max_tokens_per_doc` (integer) - Maximum tokens to consider per document (provider-dependent)
  - `priority` (integer) - Request priority hint (provider-dependent)
  - `return_documents` (boolean) - Whether to include document content in each result
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

