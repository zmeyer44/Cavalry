export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    // Dev adapter — logs to stdout. M5 replaces with Resend/SES.
    console.log('[email]', JSON.stringify(message));
  }
}

let adapter: EmailAdapter = new ConsoleEmailAdapter();

export function setEmailAdapter(next: EmailAdapter): void {
  adapter = next;
}

export function getEmailAdapter(): EmailAdapter {
  return adapter;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await adapter.send(message);
}
