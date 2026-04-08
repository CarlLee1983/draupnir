# Tokenize text (LangChain - Cohere format)

Tokenizes text using Cohere-compatible format via LangChain.


## HTTP Request

`POST /langchain/cohere/v1/tokenize`

### Request Body

```yaml
Object
  - `model` (string) - Model whose tokenizer should be used
  - `text` (string) - Text to tokenize (1-65536 characters)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

