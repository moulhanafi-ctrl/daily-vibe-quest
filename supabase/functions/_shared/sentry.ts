// Sentry integration for Supabase Edge Functions
// Uses Sentry Deno SDK for error tracking in serverless functions

interface SentryEvent {
  message?: string;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: {
        frames: Array<{
          filename: string;
          function: string;
          lineno: number;
        }>;
      };
    }>;
  };
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  environment: string;
  release: string;
  timestamp: number;
}

const SENTRY_DSN = Deno.env.get('SENTRY_DSN');
const ENVIRONMENT = Deno.env.get('ENVIRONMENT') || 'production';
const RELEASE = Deno.env.get('RELEASE') || 'unknown';

export async function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
): Promise<void> {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error not sent:', error);
    return;
  }

  const event: SentryEvent = {
    exception: {
      values: [
        {
          type: error.name,
          value: error.message,
          stacktrace: error.stack
            ? {
                frames: parseStackTrace(error.stack),
              }
            : undefined,
        },
      ],
    },
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
    environment: ENVIRONMENT,
    release: `vibe-check-functions@${RELEASE}`,
    timestamp: Date.now() / 1000,
  };

  await sendToSentry(event);
}

export async function captureMessage(
  message: string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
): Promise<void> {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, message not sent:', message);
    return;
  }

  const event: SentryEvent = {
    message,
    level: context?.level || 'info',
    tags: context?.tags,
    extra: context?.extra,
    environment: ENVIRONMENT,
    release: `vibe-check-functions@${RELEASE}`,
    timestamp: Date.now() / 1000,
  };

  await sendToSentry(event);
}

async function sendToSentry(event: SentryEvent): Promise<void> {
  if (!SENTRY_DSN) return;

  try {
    const url = new URL(SENTRY_DSN);
    const projectId = url.pathname.substring(1);
    const sentryUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;

    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${url.username}, sentry_client=edge-functions/1.0.0`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.error('Failed to send event to Sentry:', await response.text());
    }
  } catch (err) {
    console.error('Error sending to Sentry:', err);
  }
}

function parseStackTrace(stack: string): Array<{
  filename: string;
  function: string;
  lineno: number;
}> {
  const lines = stack.split('\n').slice(1); // Skip first line (error message)
  return lines.map((line) => {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    if (match) {
      return {
        function: match[1],
        filename: match[2],
        lineno: parseInt(match[3], 10),
      };
    }
    return {
      function: 'unknown',
      filename: line.trim(),
      lineno: 0,
    };
  });
}
