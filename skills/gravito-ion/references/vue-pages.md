# Vue Pages

If a Gravito project uses Vue pages, keep the same server-driven page contract.

## Rules

- read props from the Inertia page payload
- keep state local to the component unless it must survive navigation
- use declarative links for navigation

## Example

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { usePage, Link } from '@inertiajs/vue3'

const page = usePage<{ locale: string }>()
const title = computed(() => page.props.locale === 'zh-TW' ? '儀表板' : 'Dashboard')
</script>

<template>
  <main>
    <h1>{{ title }}</h1>
    <Link href="/admin/users">Users</Link>
  </main>
</template>
```
