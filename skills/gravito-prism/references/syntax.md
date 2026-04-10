# Template Syntax

Prism uses a Blade-inspired syntax for server-side templates.

## 1. Variables & Interpolation

```handlebars
{{-- Auto-escaped --}}
<p>Hello, {{ name }}</p>

{{-- Raw output (Dangerous!) --}}
<div>{!! rawHtml !!}</div>
```

## 2. Control Structures

### Conditionals
```handlebars
@if(user.role === 'admin')
  <p>Welcome Admin</p>
@elseif(user.role === 'manager')
  <p>Welcome Manager</p>
@else
  <p>Welcome User</p>
@endif
```

### Loops
```handlebars
<ul>
  @foreach(item in items)
    <li>{{ item.name }}</li>
  @endforeach
</ul>
```

## 3. Inheritance & Layouts

### Master Layout (`layouts/main.html`)
```handlebars
<html>
  <body>
    <header>My Site</header>
    @yield('content')
    @stack('scripts')
  </body>
</html>
```

### Page Template
```handlebars
@extends('layouts/main')

@section('content')
  <h1>Profile</h1>
@endsection

@push('scripts')
  <script src="/profile.js"></script>
@endpush
```

## 4. Components

Reusable UI blocks using `<x-component>` syntax.

### Component Definition (`components/alert.html`)
```handlebars
<div class="alert alert-{{ type }}">
  {{ $slot }}
</div>
```

### Usage
```handlebars
<x-alert type="error">
  Something went wrong!
</x-alert>
```
