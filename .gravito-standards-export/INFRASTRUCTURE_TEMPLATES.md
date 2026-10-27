# 基礎設施配置模板

以下是 Gravito 核心組件的標準配置參考。

## 1. Atlas (Database)
路徑參考: `config/atlas.ts`

```typescript
export default {
  default: process.env.DB_CONNECTION || 'mysql',
  connections: {
    mysql: {
      driver: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_DATABASE,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    }
  }
};
```

## 2. Plasma (Redis & Cache)
路徑參考: `config/plasma.ts`

```typescript
export default {
  default: process.env.CACHE_DRIVER || 'redis',
  stores: {
    redis: {
      driver: 'redis',
      url: process.env.REDIS_URL,
    }
  }
};
```

## 3. Sentinel (Auth)
路徑參考: `config/sentinel.ts`

```typescript
export default {
  guard: 'jwt',
  providers: {
    users: {
      driver: 'atlas',
      model: 'User',
    }
  },
  guards: {
    jwt: {
      driver: 'jwt',
      secret: process.env.JWT_SECRET,
      expires_in: '24h',
    }
  }
};
```
