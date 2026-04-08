# Upload file (Gemini format)

Uploads a file using Google Gemini API format.

This is a multipart upload with two parts:
- "metadata": JSON object containing file metadata
- "file": Binary file content

Note: Direct file content download is not supported by Gemini Files API.
Use the file.uri field from the response to access uploaded files.


## HTTP Request

`POST /genai/upload/v1beta/files`

### Request Body

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

