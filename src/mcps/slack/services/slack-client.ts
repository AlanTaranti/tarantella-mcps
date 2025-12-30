import { WebClient } from '@slack/web-api';

export class SlackClient {
  private readonly client: WebClient;

  constructor(token: string) {
    if (!token) {
      throw new Error('Slack bot token is required');
    }
    this.client = new WebClient(token);
  }
}
