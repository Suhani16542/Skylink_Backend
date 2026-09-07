import * as brevo from '@getbrevo/brevo';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Parse and validate email recipient(s) safely
 * Supports single email string, comma/semicolon separated list, or array of strings/objects
 *
 * @param {string|string[]|Object[]} toInput
 * @returns {Array<{ email: string, name?: string }>}
 */
export const normalizeRecipients = (toInput) => {
  if (!toInput) return [];

  const rawList = [];
  if (Array.isArray(toInput)) {
    for (const item of toInput) {
      if (typeof item === 'string') {
        rawList.push(...item.split(/[,;]+/));
      } else if (item && typeof item === 'object' && item.email) {
        rawList.push(item.email);
      }
    }
  } else if (typeof toInput === 'string') {
    rawList.push(...toInput.split(/[,;]+/));
  }

  const validRecipients = [];
  const seen = new Set();

  for (const raw of rawList) {
    if (typeof raw !== 'string') continue;
    const cleanEmail = raw.trim().toLowerCase();
    if (cleanEmail && EMAIL_REGEX.test(cleanEmail) && !seen.has(cleanEmail)) {
      seen.add(cleanEmail);
      validRecipients.push({ email: cleanEmail });
    }
  }

  return validRecipients;
};

/**
 * Get configured Brevo TransactionalEmailsApi instance
 */
const getBrevoApiInstance = () => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return null;
  }

  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
  return apiInstance;
};

/**
 * Reusable email sending service using Brevo API
 *
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email, comma-separated string, or array of emails
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content of the email
 * @param {string} [options.text] - Plain text content fallback
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'Skylink';

  if (!apiKey || !senderEmail || !EMAIL_REGEX.test(senderEmail)) {
    console.warn('⚠️  Brevo email service not fully configured. Missing or invalid BREVO_API_KEY / BREVO_SENDER_EMAIL.');
    return {
      success: false,
      error: 'Brevo API credentials or sender email is not configured in environment variables.',
    };
  }

  // Validate and normalize recipient(s)
  const recipients = normalizeRecipients(to);
  if (recipients.length === 0) {
    console.warn('⚠️  Brevo Email Warning: No valid recipient email address provided.');
    return {
      success: false,
      error: 'No valid recipient email address provided.',
    };
  }

  try {
    const apiInstance = getBrevoApiInstance();
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    if (text) {
      sendSmtpEmail.textContent = text;
    }

    sendSmtpEmail.sender = {
      name: senderName,
      email: senderEmail,
    };

    sendSmtpEmail.to = recipients;

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return {
      success: true,
      messageId: response?.body?.messageId || response?.messageId,
    };
  } catch (error) {
    const errorMessage = error?.response?.body?.message || error.message || 'Failed to send email via Brevo';
    console.error(`❌ Brevo Email Error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export default {
  sendEmail,
  normalizeRecipients,
};
