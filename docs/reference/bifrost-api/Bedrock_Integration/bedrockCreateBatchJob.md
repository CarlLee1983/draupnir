# Create batch inference job (Bedrock format)

Creates a batch inference job using AWS Bedrock format.


## HTTP Request

`POST /bedrock/model-invocation-jobs`

### Request Body

```yaml
Object
  - `modelId` (string) - Model ID for the batch job (optional, can be specified in request)
  - `jobName` (string) - Name for the batch job
  - `roleArn` (string) - IAM role ARN for the job
  - `inputDataConfig` (object)
  - `outputDataConfig` (object)
  - `timeoutDurationInHours` (integer) - Timeout in hours
  - `tags` (array)
```

### Responses

#### 200
Successful response

#### 400
Bad request

#### 500
Internal server error

