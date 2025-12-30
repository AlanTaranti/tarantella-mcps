import { WebClient } from '@slack/web-api';

export class SlackClient {
  // @ts-expect-error -- Field used in future tasks
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in future tasks
  private readonly client: WebClient;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack bot token is required');
    }
    this.client = new WebClient(token);
  }
}
