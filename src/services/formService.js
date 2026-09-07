import FormSubmission from '../models/FormSubmission.js';
import { sendEmail, normalizeRecipients } from './emailService.js';

/**
 * Resolve configured notification recipient(s) safely from environment variables
 * Priority: NOTIFICATION_EMAIL -> ADMIN_EMAIL -> BREVO_SENDER_EMAIL
 *
 * @returns {string[]}
 */
const getNotificationRecipients = () => {
  const envSources = [
    process.env.NOTIFICATION_EMAIL,
    process.env.ADMIN_EMAIL,
    process.env.BREVO_SENDER_EMAIL,
  ];

  const validEmails = [];
  for (const source of envSources) {
    if (!source || typeof source !== 'string') continue;
    const normalized = normalizeRecipients(source).map((r) => r.email);
    for (const email of normalized) {
      if (!validEmails.includes(email)) {
        validEmails.push(email);
      }
    }
  }

  return validEmails;
};

/**
 * Generate formatted HTML email template for form submissions
 */
const buildNotificationEmailHtml = (submission) => {
  const {
    formType,
    name,
    email,
    phone,
    company,
    subject,
    message,
    service,
    // Consultation fields
    fullName,
    companyName,
    officialWorkEmail,
    contactPhoneWhatsApp,
    countryHeadOfficeLocation,
    businessType,
    tradeDirection,
    productCommodityDescription,
    originPortCity,
    destinationPortCity,
    cargoCategory,
    preferredShipmentMode,
    expectedShipmentDateTimeline,
    detailedTradeRequirements,
    data,
    submittedAt,
  } = submission;

  const formattedDate = new Date(submittedAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const row = (label, val, isLink = false) => {
    if (!val) return '';
    const content = isLink ? `<a href="mailto:${val}" style="color: #2563eb;">${val}</a>` : val;
    return `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; width: 200px; color: #475569; font-size: 13px;">${label}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${content}</td>
      </tr>
    `;
  };

  let title = `New ${formType.toUpperCase()} Submission`;
  let fieldsHtml = '';

  fieldsHtml += row('Form Type', formType.toUpperCase());
  fieldsHtml += row('Submitted At', formattedDate);

  if (formType === 'consultation') {
    title = 'New EXIM & Logistics Consultation Request';
    fieldsHtml += row('Full Name', fullName || name);
    fieldsHtml += row('Company Name', companyName || company);
    fieldsHtml += row('Official Work Email', officialWorkEmail || email, true);
    fieldsHtml += row('Contact Phone / WhatsApp', contactPhoneWhatsApp || phone);
    fieldsHtml += row('Country / Head Office Location', countryHeadOfficeLocation);
    fieldsHtml += row('Business Type', businessType);
    fieldsHtml += row('Trade Direction', tradeDirection);
    fieldsHtml += row('Product / Commodity Description', productCommodityDescription);
    fieldsHtml += row('Origin Port / City', originPortCity);
    fieldsHtml += row('Destination Port / City', destinationPortCity);
    fieldsHtml += row('Cargo Category', cargoCategory);
    fieldsHtml += row('Preferred Shipment Mode', preferredShipmentMode);
    fieldsHtml += row('Expected Shipment Date / Timeline', expectedShipmentDateTimeline);
    fieldsHtml += row('Detailed Trade Requirements & Pain Points', detailedTradeRequirements || message);
  } else {
    // Generic / Contact / Quote / Newsletter
    fieldsHtml += row('Name', name || fullName);
    fieldsHtml += row('Email', email || officialWorkEmail, true);
    fieldsHtml += row('Phone', phone || contactPhoneWhatsApp);
    fieldsHtml += row('Company', company || companyName);
    fieldsHtml += row('Service', service);
    fieldsHtml += row('Subject', subject);
    fieldsHtml += row('Message', message || detailedTradeRequirements);
  }

  // Append any extra dynamic custom fields from data
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    const excludedKeys = new Set([
      'formType', 'name', 'email', 'phone', 'company', 'subject', 'message', 'service',
      'fullName', 'companyName', 'officialWorkEmail', 'contactPhoneWhatsApp',
      'countryHeadOfficeLocation', 'businessType', 'tradeDirection',
      'productCommodityDescription', 'originPortCity', 'destinationPortCity',
      'cargoCategory', 'preferredShipmentMode', 'expectedShipmentDateTimeline',
      'detailedTradeRequirements', 'metadata', 'status', 'submittedAt',
    ]);

    for (const [key, val] of Object.entries(data)) {
      if (!excludedKeys.has(key) && val !== undefined && val !== null && val !== '') {
        const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        fieldsHtml += row(key, displayVal);
      }
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 20px 24px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">Skylink Lead Alert</h2>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 14px;">${title}</p>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            ${fieldsHtml}
          </table>
        </div>
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated lead notification from Skylink Backend System.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Handle public form submission: Save to DB and dispatch Brevo email
 */
export const submitForm = async (payload, metadata = {}) => {
  const {
    formType,
    name = '',
    email = '',
    phone = '',
    subject = '',
    message = '',
    company = '',
    service = '',
    // Consultation fields
    fullName = '',
    companyName = '',
    officialWorkEmail = '',
    contactPhoneWhatsApp = '',
    countryHeadOfficeLocation = '',
    businessType = '',
    tradeDirection = '',
    productCommodityDescription = '',
    originPortCity = '',
    destinationPortCity = '',
    cargoCategory = '',
    preferredShipmentMode = '',
    expectedShipmentDateTimeline = '',
    detailedTradeRequirements = '',
    ...restData
  } = payload;

  // Resolve aliases
  const resolvedName = (fullName || name).trim();
  const resolvedEmail = (officialWorkEmail || email).toLowerCase().trim();
  const resolvedPhone = (contactPhoneWhatsApp || phone).trim();
  const resolvedCompany = (companyName || company).trim();
  const resolvedMessage = (detailedTradeRequirements || message).trim();

  // Clean data object of empty top-level keys
  const extraData = {};
  for (const [key, val] of Object.entries(restData)) {
    if (key !== 'status' && key !== 'submittedAt' && key !== 'metadata' && val !== undefined && val !== '') {
      extraData[key] = val;
    }
  }

  // 1. Save submission to MongoDB
  const submission = new FormSubmission({
    formType: formType.toLowerCase().trim(),
    name: resolvedName,
    email: resolvedEmail,
    phone: resolvedPhone,
    company: resolvedCompany,
    subject: subject.trim(),
    message: resolvedMessage,
    service: service.trim(),

    // Consultation fields
    fullName: resolvedName,
    companyName: resolvedCompany,
    officialWorkEmail: resolvedEmail,
    contactPhoneWhatsApp: resolvedPhone,
    countryHeadOfficeLocation: countryHeadOfficeLocation.trim(),
    businessType: businessType.trim(),
    tradeDirection: tradeDirection.trim(),
    productCommodityDescription: productCommodityDescription.trim(),
    originPortCity: originPortCity.trim(),
    destinationPortCity: destinationPortCity.trim(),
    cargoCategory: cargoCategory.trim(),
    preferredShipmentMode: preferredShipmentMode.trim(),
    expectedShipmentDateTimeline: expectedShipmentDateTimeline.trim(),
    detailedTradeRequirements: resolvedMessage,

    data: {
      ...payload,
      ...extraData,
    },
    metadata: {
      ip: metadata.ip || '',
      userAgent: metadata.userAgent || '',
      referrer: metadata.referrer || '',
    },
    submittedAt: new Date(),
  });

  const saved = await submission.save();

  // 2. Send email notification via Brevo in background using validated recipient(s)
  const recipients = getNotificationRecipients();

  if (recipients.length > 0) {
    const html = buildNotificationEmailHtml(saved);
    const leadSubject =
      formType === 'consultation'
        ? `[Skylink Consultation Request] ${resolvedCompany || resolvedName} - ${productCommodityDescription || 'EXIM Consultation'}`
        : `[Skylink Lead] New ${formType.toUpperCase()} submission from ${resolvedName || resolvedEmail || 'Website Visitor'}`;

    sendEmail({
      to: recipients,
      subject: leadSubject,
      html,
      text: `New ${formType} submission received on ${saved.submittedAt}. From: ${resolvedName} (${resolvedEmail}, ${resolvedPhone}). Company: ${resolvedCompany}`,
    }).catch((emailErr) => {
      console.warn(`⚠️ Warning: Failed to send Brevo lead notification email: ${emailErr.message}`);
    });
  } else {
    console.warn('⚠️ Warning: No valid notification recipient email configured in environment variables.');
  }

  return saved;
};

/**
 * Query submissions for Admin panel with pagination, filtering, and search
 */
export const getSubmissions = async ({ page = 1, limit = 10, formType, search, status }) => {
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (numericPage - 1) * numericLimit;

  const query = {};

  if (formType) {
    query.formType = formType.toLowerCase().trim();
  }

  if (status) {
    query.status = status.toLowerCase().trim();
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { fullName: searchRegex },
      { email: searchRegex },
      { officialWorkEmail: searchRegex },
      { phone: searchRegex },
      { contactPhoneWhatsApp: searchRegex },
      { company: searchRegex },
      { companyName: searchRegex },
      { subject: searchRegex },
      { service: searchRegex },
      { message: searchRegex },
      { detailedTradeRequirements: searchRegex },
      { productCommodityDescription: searchRegex },
      { countryHeadOfficeLocation: searchRegex },
      { originPortCity: searchRegex },
      { destinationPortCity: searchRegex },
      { cargoCategory: searchRegex },
      { businessType: searchRegex },
      { tradeDirection: searchRegex },
    ];
  }

  const [submissions, total] = await Promise.all([
    FormSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    FormSubmission.countDocuments(query),
  ]);

  return {
    submissions,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      pages: Math.ceil(total / numericLimit) || 1,
    },
  };
};

/**
 * Get single submission by ID
 */
export const getSubmissionById = async (id) => {
  const submission = await FormSubmission.findById(id);
  if (!submission) {
    const error = new Error('Form submission not found');
    error.statusCode = 404;
    throw error;
  }
  return submission;
};

/**
 * Delete a submission by ID
 */
export const deleteSubmission = async (id) => {
  const submission = await FormSubmission.findByIdAndDelete(id);
  if (!submission) {
    const error = new Error('Form submission not found');
    error.statusCode = 404;
    throw error;
  }
  return submission;
};

/**
 * Update submission status
 */
export const updateSubmissionStatus = async (id, status) => {
  const validStatuses = ['new', 'read', 'contacted', 'archived'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const submission = await FormSubmission.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!submission) {
    const error = new Error('Form submission not found');
    error.statusCode = 404;
    throw error;
  }

  return submission;
};

export default {
  submitForm,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
  updateSubmissionStatus,
};
