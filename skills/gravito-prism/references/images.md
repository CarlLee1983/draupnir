# Image Optimization

Prism includes a powerful image service designed for high performance and perfect Core Web Vitals.

## 1. The `{{image}}` Helper

Automatically generates optimized `<img>` tags with responsive `srcset` and format negotiation.

```handlebars
{{image 
  src="/hero.jpg" 
  alt="Hero Background" 
  width=1200 
  height=630
  placeholder="blur"
  formatNegotiation=true
  loading="eager"
  fetchPriority="high"
}}
```

## 2. Key Features

| Feature | Description |
|---|---|
| **Format Negotiation** | Serves AVIF or WebP to browsers that support it. |
| **Responsive Srcset** | Automatically generates multiple sizes based on the source image. |
| **CLS Prevention** | Requires `width` and `height` to reserve space and prevent layout shifts. |
| **LQIP (Placeholders)** | Supports `blur` (base64 blurred image) or `color` placeholders. |

## 3. CDN Loaders

Prism can integrate with image CDNs for on-the-fly transformations.

```typescript
import { OrbitPrism, createCloudinaryLoader } from '@gravito/prism'

await core.orbit(new OrbitPrism({
  loader: createCloudinaryLoader({ cloudName: 'my-cloud' })
}))
```

## 4. Art Direction

Using the `<picture>` element for different images at different breakpoints.

```handlebars
{{image 
  src="/desktop.jpg" 
  alt="Banner"
  usePicture=true
  artDirection=[
    { media: "(max-width: 768px)", src: "/mobile.jpg", width: 400 }
  ]
}}
```
