import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { ensureValidSession } from '~/shared/api/sessionRecovery';
import Config from 'react-native-config';
import type { ChatAttachments } from '@snacky/shared-types';

export interface StreamingState {
  isStreaming: boolean;
  streamedText: string;
  sessionId: string | null;
  intent: string | null;
  error: string | null;
}

export interface ChatResponse {
  session_id: string;
  intent: string;
  model: string;
  content: string;
  tokens_used: number;
  context_ids: string[];
  attachments: ChatAttachments | null;
}

interface UseChatStreamReturn {
  state: StreamingState;
  sendMessage: (message: string, sessionId?: string) => Promise<ChatResponse | null>;
  cancelStream: () => void;
}

export function useChatStream(): UseChatStreamReturn {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    streamedText: '',
    sessionId: null,
    intent: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const sendMessage = useCallback(
    async (message: string, sessionId?: string): Promise<ChatResponse | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isStreaming: true,
        streamedText: '',
        sessionId: sessionId ?? null,
        intent: null,
        error: null,
      });

      try {
        const accessToken = await ensureValidSession();

        if (!accessToken) {
          setState((prev) => ({ ...prev, isStreaming: false, error: 'Not authenticated' }));
          return null;
        }

        const baseUrl = Config.SUPABASE_URL ?? '';
        const anonKey = Config.SUPABASE_ANON_KEY ?? '';
        const url = `${baseUrl}/functions/v1/chat`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
            'x-user-token': accessToken,
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            stream: false,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          let errText: string;
          try {
            errText = await resp.text();
          } catch {
            errText = `HTTP ${resp.status}`;
          }

          Alert.alert(
            `Chat failed (${resp.status})`,
            `URL: ${url}\nToken: ${accessToken.slice(0, 30)}…\n\n${errText}`,
          );

          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: errText || `Request failed (${resp.status})`,
          }));
          return null;
        }

        const data = (await resp.json()) as ChatResponse;

        setState((prev) => ({
          ...prev,
          isStreaming: false,
          streamedText: data.content,
          sessionId: data.session_id,
          intent: data.intent,
        }));

        return data;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((prev) => ({ ...prev, isStreaming: false }));
          return null;
        }
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: (err as Error).message,
        }));
        return null;
      }
    },
    [],
  );

  return { state, sendMessage, cancelStream };
}
