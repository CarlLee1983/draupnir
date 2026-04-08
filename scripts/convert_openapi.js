const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../docs/Bifrost_API/openapi.json');
const OUTPUT_DIR = path.join(__dirname, '../docs/Bifrost_API_Final');

// 讀取 OpenAPI JSON
const openapi = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// 解析 Schema 引用
function resolveSchema(schema) {
  if (!schema) return 'None';
  if (schema.$ref) {
    const refPath = schema.$ref.replace('#/components/schemas/', '');
    const resolved = openapi.components.schemas[refPath];
    if (resolved) {
      return resolveSchema(resolved);
    }
    return `Ref: ${refPath}`;
  }
  
  if (schema.type === 'array' && schema.items) {
    return `Array<${resolveSchema(schema.items)}>`;
  }
  
  if (schema.type === 'object' && schema.properties) {
    let props = [];
    for (const [key, value] of Object.entries(schema.properties)) {
      const type = value.type || (value.$ref ? 'Object' : 'any');
      const desc = value.description ? ` - ${value.description.split('\n')[0]}` : '';
      props.push(`  - \`${key}\` (${type})${desc}`);
    }
    return `Object\n${props.join('\n')}`;
  }

  return schema.type || 'any';
}

function generateMarkdown(pathName, method, data) {
  let md = `# ${data.summary || 'API Endpoint'}\n\n`;
  
  if (data.description) {
    md += `${data.description}\n\n`;
  }

  md += `## HTTP Request\n\n`;
  md += `\`${method.toUpperCase()} ${pathName}\`\n\n`;

  // Parameters
  if (data.parameters && data.parameters.length > 0) {
    md += `### Parameters\n\n`;
    md += `| Name | In | Type | Description |\n`;
    md += `| --- | --- | --- | --- |\n`;
    for (const param of data.parameters) {
      const type = param.schema ? (param.schema.type || 'string') : 'string';
      const desc = param.description ? param.description.replace(/\n/g, ' ') : '';
      md += `| ${param.name} | ${param.in} | ${type} | ${desc} |\n`;
    }
    md += `\n`;
  }

  // Request Body
  if (data.requestBody) {
    md += `### Request Body\n\n`;
    const content = data.requestBody.content['application/json'];
    if (content && content.schema) {
      md += `\`\`\`yaml\n${resolveSchema(content.schema)}\n\`\`\`\n\n`;
    }
  }

  // Responses
  md += `### Responses\n\n`;
  for (const [code, resp] of Object.entries(data.responses)) {
    md += `#### ${code}\n${resp.description}\n\n`;
  }

  return md;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const [pathName, methods] of Object.entries(openapi.paths)) {
    for (const [method, data] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        const tag = (data.tags && data.tags[0]) || 'General';
        const tagDir = path.join(OUTPUT_DIR, tag.replace(/\s+/g, '_'));
        
        if (!fs.existsSync(tagDir)) {
          fs.mkdirSync(tagDir, { recursive: true });
        }

        const fileName = (data.operationId || pathName.split('/').pop() || 'index').replace(/[^a-zA-Z0-9-]/g, '_') + '.md';
        const filePath = path.join(tagDir, fileName);
        
        const markdown = generateMarkdown(pathName, method, data);
        fs.writeFileSync(filePath, markdown);
      }
    }
  }

  console.log(`轉換完成！檔案已儲存至: ${OUTPUT_DIR}`);
}

main();
