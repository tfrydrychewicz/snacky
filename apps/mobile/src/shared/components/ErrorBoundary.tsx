import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@gluestack-ui/themed';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorFallback = ({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) => {
  const { t } = useTranslation('common');

  return (
    <View className="flex-1 items-center justify-center bg-surface-background px-lg">
      <Text className="text-4xl">⚠️</Text>
      <Text className="mt-md text-headline-md text-text-primary">
        {t('common.error.generic')}
      </Text>
      {error?.message && (
        <Text className="mt-sm text-center text-body-md text-text-secondary">
          {error.message}
        </Text>
      )}
      <Pressable
        onPress={onRetry}
        className="mt-lg rounded-md bg-primary px-xl py-sm active:opacity-80"
      >
        <Text className="text-label-lg text-text-inverse">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
};

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

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
