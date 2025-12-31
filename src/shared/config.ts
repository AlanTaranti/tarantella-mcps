const DEFAULT_PORT = 3000;

export interface AppConfig {
  slackBotToken: string;
  port: number;
}

export const validateConfig = (): AppConfig => {
  const slackBotToken = process.env['SLACK_BOT_TOKEN']?.trim();

  if (!slackBotToken) {
    throw new Error('SLACK_BOT_TOKEN environment variable is required');
  }

  const portStr = process.env['PORT'];
  const port = portStr ? Number.parseInt(portStr, 10) : DEFAULT_PORT;

  return {
    slackBotToken,
    port,
  };
};
