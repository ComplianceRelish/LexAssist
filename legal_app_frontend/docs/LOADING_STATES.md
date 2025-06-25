# Loading States in LexAssist

This document outlines the different ways to implement loading states using the new loading components.

## Available Components

### 1. `LoadingSpinner`

A simple spinner component that shows a loading animation.

```tsx
import { LoadingSpinner } from '../components';

// Basic usage
<LoadingSpinner />

// With custom size and aria-label
<LoadingSpinner size={60} ariaLabel="Loading documents..." />
```

### 2. `LoadingOverlay`

A full-page or container overlay that shows a loading spinner with an optional message.

```tsx
import { LoadingOverlay } from '../components';

// Full page loading overlay
<LoadingOverlay 
  isLoading={isLoading} 
  message="Processing your request..."
  fullPage
>
  {/* Content that will be dimmed when loading */}
  <YourComponent />
</LoadingOverlay>

// Container loading overlay
<LoadingOverlay 
  isLoading={isLoading} 
  message="Saving changes..."
  fullPage={false}
>
  <div>This content will be dimmed when loading</div>
</LoadingOverlay>
```

### 3. `LoadingWrapper` (Inline Usage)

A simple wrapper that shows a loading spinner when `isLoading` is true.

```tsx
import { LoadingWrapper } from '../components';

<LoadingWrapper isLoading={isLoading}>
  <YourComponent />
</LoadingWrapper>
```

### 4. `useLoading` Hook

A custom hook to manage loading states in your components.

```tsx
import { useLoading } from '../hooks/useLoading';

const MyComponent = () => {
  const { isLoading, withLoading } = useLoading();

  const fetchData = async () => {
    // This will automatically handle the loading state
    const data = await withLoading(fetchDataFromAPI());
    // ... handle data
  };

  return (
    <div>
      <button onClick={fetchData} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Fetch Data'}
      </button>
      <LoadingOverlay isLoading={isLoading} message="Fetching data..." />
    </div>
  );
};
```

## Best Practices

1. **Always provide an `aria-label`** for accessibility.
2. **Use `LoadingOverlay` for full-page loads** or when you want to prevent user interaction.
3. **Use `LoadingWrapper` for inline loading states** within a component.
4. **Leverage the `useLoading` hook** for complex loading state management.
5. **Keep loading messages clear and concise** to inform users about the current operation.

## Example: API Call with Loading State

```tsx
import { useState } from 'react';
import { useLoading, LoadingOverlay } from '../components';

const DataFetcher = () => {
  const [data, setData] = useState(null);
  const { isLoading, withLoading } = useLoading();

  const fetchData = async () => {
    try {
      const result = await withLoading(
        fetch('/api/data').then(res => res.json())
      );
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  return (
    <div>
      <button onClick={fetchData} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load Data'}
      </button>
      
      <LoadingOverlay 
        isLoading={isLoading} 
        message="Fetching your data..." 
        fullPage={false}
      >
        {data && <div>{/* Render your data */}</div>}
      </LoadingOverlay>
    </div>
  );
};
```

## Customization

You can customize the appearance of the loading spinner by:

1. Modifying the `LoadingSpinner` component's styles.
2. Using the `className` prop to apply custom styles.
3. Adjusting the size and other props as needed.

---

For any questions or issues, please refer to the component documentation or contact the frontend team.
