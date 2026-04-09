# Create routing rule

Creates a new CEL-based routing rule for intelligent request routing. Provider and model can be left empty to use the incoming request values.

## HTTP Request

`POST /api/governance/routing-rules`

### Request Body

```yaml
Object
  - `name` (string) - Name of the routing rule
  - `description` (string) - Optional description
  - `enabled` (boolean) - Whether the rule is enabled
  - `cel_expression` (string) - CEL expression for matching
  - `targets` (array) - Weighted routing targets; weights must sum to 1; target is selected probabilistically at request time
  - `fallbacks` (array) - Fallback providers in format "provider/model"
  - `scope` (string) - Scope level for the rule
  - `scope_id` (string) - ID for the scope (required if scope is not global)
  - `priority` (integer) - Priority for rule evaluation (lower number = higher priority)
  - `query` (object) - Visual rule tree structure
```

### Responses

#### 200
Routing rule created successfully

#### 400
Bad request

#### 500
Internal server error

