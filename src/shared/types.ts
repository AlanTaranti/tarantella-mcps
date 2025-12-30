export interface SlackMessage {
  text: string;
  author: string;
  channel: string;
  timestamp: string;
}

export interface SlackSearchResult {
  results: SlackMessage[];
  nextCursor?: string;
}

export interface SlackSearchParams {
  query: string;
  limit?: number;
  cursor?: string;
  fromDate?: string;
  toDate?: string;
  userId?: string;
  hasReactions?: boolean;
  hasThreads?: boolean;
}

export interface SlackChannelSearchParams extends SlackSearchParams {
  channelId: string;
}
