/**
 * Every external integration is optional. The platform runs end to end without
 * a single third-party key; each `has*` flag simply switches a real provider on.
 */
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const env = {
  appUrl: opt("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  appName: "FundRadar",
  nodeEnv: process.env.NODE_ENV ?? "development",

  anthropicApiKey: opt("ANTHROPIC_API_KEY"),
  anthropicModel: opt("ANTHROPIC_MODEL") ?? "claude-sonnet-5",

  resendApiKey: opt("RESEND_API_KEY"),
  emailFrom: opt("EMAIL_FROM") ?? "FundRadar <onboarding@resend.dev>",

  whatsappToken: opt("WHATSAPP_TOKEN"),
  whatsappPhoneId: opt("WHATSAPP_PHONE_NUMBER_ID"),

  googleClientId: opt("GOOGLE_CLIENT_ID"),
  googleClientSecret: opt("GOOGLE_CLIENT_SECRET"),

  cronSecret: opt("CRON_SECRET"),
  crawlerUserAgent:
    opt("CRAWLER_USER_AGENT") ??
    "FundRadarBot/1.0 (+https://fundradar.example/bot; startup funding directory)",
} as const;

export const has = {
  ai: () => Boolean(env.anthropicApiKey),
  email: () => Boolean(env.resendApiKey),
  whatsapp: () => Boolean(env.whatsappToken && env.whatsappPhoneId),
  google: () => Boolean(env.googleClientId && env.googleClientSecret),
};
