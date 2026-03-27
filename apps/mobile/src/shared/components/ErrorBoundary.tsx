import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 items-center justify-center bg-surface-background p-lg">
          <Text className="text-heading-3 text-red-600">Something went wrong</Text>
          <Text className="mt-sm text-body-md text-gray-500">
            {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
