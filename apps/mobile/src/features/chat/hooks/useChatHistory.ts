import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getSupabase } from '~/shared/api/client';
import { useAuth } from '~/app/providers/AuthProvider';

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  retrieved_context_ids: string[] | null;
  attachments: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatSessionRow {
  id: string;
  user_id: string;
  created_at: string;
  last_message_at: string | null;
}

const PAGE_SIZE = 20;

async function fetchMessages(
  sessionId: string,
  cursor?: string,
): Promise<{ messages: ChatMessageRow[]; nextCursor: string | undefined }> {
  const supabase = getSupabase();

  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const messages = ((data ?? []) as ChatMessageRow[]).reverse();
  const nextCursor =
    (data ?? []).length === PAGE_SIZE
      ? ((data as ChatMessageRow[])[PAGE_SIZE - 1]?.created_at ?? undefined)
      : undefined;

  return { messages, nextCursor };
}

export function useChatHistory(sessionId: string | null) {
  return useInfiniteQuery({
    queryKey: ['chat_messages', sessionId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchMessages(sessionId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

async function fetchLatestSession(userId: string): Promise<ChatSessionRow | null> {
  const supabase = getSupabase();
  const result = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  if (result.error) return null;
  return result.data as ChatSessionRow;
}

export function useLatestSession() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['chat_sessions', 'latest', user?.id],
    queryFn: async () => {
      const session = await fetchLatestSession(user!.id);
      return { session };
    },
    getNextPageParam: () => undefined,
    initialPageParam: undefined,
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}

export function useInvalidateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await queryClient.invalidateQueries({ queryKey: ['chat_messages', sessionId] });
    },
  });
}
