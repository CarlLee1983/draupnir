# Create Variation

Creates variations of an image. Request must be sent as multipart/form-data with `model` and `image` (or `image[]`).
Does not support streaming.


## HTTP Request

`POST /v1/images/variations`

### Request Body

### Responses

#### 200
Successful response. Returns JSON with generated image variation(s).

#### 400
Bad request

#### 500
Internal server error

