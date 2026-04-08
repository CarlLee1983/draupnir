# Create transcription (Azure OpenAI)

## HTTP Request

`POST /openai/openai/deployments/{deployment-id}/audio/transcriptions`

### Parameters

| Name | In | Type | Description |
| --- | --- | --- | --- |
| deployment-id | path | string | Azure deployment ID |
| api-version | query | string |  |

### Request Body

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

