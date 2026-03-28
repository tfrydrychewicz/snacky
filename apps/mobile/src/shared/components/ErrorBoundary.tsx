import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, radii } from '~/shared/theme/tokens';

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
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
      }}
    >
      <Text style={{ fontSize: 40 }}>⚠️</Text>
      <Text style={{ ...typography.titleLg, color: colors.onSurface, marginTop: spacing.md }}>
        {t('common.error.generic')}
      </Text>
      {error?.message && (
        <Text
          style={{
            ...typography.bodyMd,
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: spacing.sm,
          }}
        >
          {error.message}
        </Text>
      )}
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radii.full,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ ...typography.labelLg, color: colors.onPrimary }}>{t('common.retry')}</Text>
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
