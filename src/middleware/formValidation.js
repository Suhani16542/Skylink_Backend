/**
 * Form Validation Middleware
 * Validates, normalizes, and sanitizes public form submissions.
 * Supports standard forms (Contact, Quote, Newsletter) and complete 14-field Consultation forms.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+]?[\d\s\-().]{6,25}$/;

/**
 * Sanitize string value by trimming and removing dangerous control characters
 */
const sanitizeString = (val) => {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/\0/g, '') // remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // strip inline scripts
};

/**
 * Recursively sanitize objects
 */
const sanitizePayload = (obj) => {
  if (!obj || typeof obj !== 'object') return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeString(key);
    if (!cleanKey) continue;

    if (typeof value === 'string') {
      sanitized[cleanKey] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[cleanKey] = value.map((v) => (typeof v === 'string' ? sanitizeString(v) : v));
    } else if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizePayload(value);
    } else {
      sanitized[cleanKey] = value;
    }
  }
  return sanitized;
};

export const validateFormSubmission = (req, res, next) => {
  // Check payload presence
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid or empty form submission payload',
    });
  }

  // Check payload size limits (50KB limit)
  const payloadString = JSON.stringify(req.body);
  if (payloadString.length > 50000) {
    return res.status(400).json({
      status: 'fail',
      message: 'Payload size exceeds the allowable limit (50KB)',
    });
  }

  // Sanitize body
  const sanitized = sanitizePayload(req.body);

  let rawFormType = (sanitized.formType || '').trim().toLowerCase();

  // 1. formType is strictly required
  if (!rawFormType) {
    return res.status(400).json({
      status: 'fail',
      message: 'formType is required',
    });
  }

  // Normalize consultation formType variations
  const consultationTypes = ['consultation', 'request-consultation', 'trade-consultation', 'exim-consultation'];
  if (consultationTypes.includes(rawFormType)) {
    rawFormType = 'consultation';
    sanitized.formType = 'consultation';
  }

  // Resolve bidirectional aliases between frontend field names and generic names
  const name = sanitized.fullName || sanitized.name || '';
  const email = (sanitized.officialWorkEmail || sanitized.email || '').toLowerCase();
  const phone = sanitized.contactPhoneWhatsApp || sanitized.phone || '';
  const company = sanitized.companyName || sanitized.company || '';
  const message = sanitized.detailedTradeRequirements || sanitized.message || '';

  // Synchronize aliases in payload for clean downstream handling
  if (name) {
    sanitized.name = name;
    sanitized.fullName = name;
  }
  if (email) {
    sanitized.email = email;
    sanitized.officialWorkEmail = email;
  }
  if (phone) {
    sanitized.phone = phone;
    sanitized.contactPhoneWhatsApp = phone;
  }
  if (company) {
    sanitized.company = company;
    sanitized.companyName = company;
  }
  if (message) {
    sanitized.message = message;
    sanitized.detailedTradeRequirements = message;
  }

  req.body = sanitized;

  // 2. Validate email format if provided
  if (email && !EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide a valid email address',
    });
  }

  // 3. Validate phone format if provided
  if (phone && !PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Please provide a valid phone number',
    });
  }

  // 4. Form type specific validations
  switch (rawFormType) {
    case 'consultation': {
      // Validate all 14 required consultation fields
      const requiredConsultationFields = [
        { key: 'fullName', label: 'Full name (fullName)' },
        { key: 'companyName', label: 'Company name (companyName)' },
        { key: 'officialWorkEmail', label: 'Official work email (officialWorkEmail)' },
        { key: 'contactPhoneWhatsApp', label: 'Contact phone / WhatsApp (contactPhoneWhatsApp)' },
        { key: 'countryHeadOfficeLocation', label: 'Country / head office location (countryHeadOfficeLocation)' },
        { key: 'businessType', label: 'Business type (businessType)' },
        { key: 'tradeDirection', label: 'Trade direction (tradeDirection)' },
        { key: 'productCommodityDescription', label: 'Product / commodity description (productCommodityDescription)' },
        { key: 'originPortCity', label: 'Origin port / city (originPortCity)' },
        { key: 'destinationPortCity', label: 'Destination port / city (destinationPortCity)' },
        { key: 'cargoCategory', label: 'Cargo category (cargoCategory)' },
        { key: 'preferredShipmentMode', label: 'Preferred shipment mode (preferredShipmentMode)' },
        { key: 'expectedShipmentDateTimeline', label: 'Expected shipment date / timeline (expectedShipmentDateTimeline)' },
        { key: 'detailedTradeRequirements', label: 'Detailed trade requirements (detailedTradeRequirements)' },
      ];

      for (const field of requiredConsultationFields) {
        const val = sanitized[field.key];
        if (!val || typeof val !== 'string' || !val.trim()) {
          return res.status(400).json({
            status: 'fail',
            message: `${field.label} is required for consultation submission`,
          });
        }
      }

      // Explicitly enforce valid email & phone for consultation
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide a valid official work email address',
        });
      }

      if (!PHONE_REGEX.test(phone)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide a valid contact phone or WhatsApp number',
        });
      }

      break;
    }

    case 'newsletter':
    case 'subscribe':
    case 'subscription':
      if (!email) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email address is required for newsletter subscription',
        });
      }
      break;

    case 'contact':
    case 'contact-us':
      if (!name) {
        return res.status(400).json({
          status: 'fail',
          message: 'Name is required for contact submission',
        });
      }
      if (!email && !phone) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide either an email address or phone number',
        });
      }
      if (!message) {
        return res.status(400).json({
          status: 'fail',
          message: 'Message is required for contact submission',
        });
      }
      break;

    case 'quote':
    case 'request-quote':
    case 'get-quote':
      if (!name) {
        return res.status(400).json({
          status: 'fail',
          message: 'Name is required for quote request',
        });
      }
      if (!email && !phone) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide either an email address or phone number for the quote',
        });
      }
      break;

    default:
      // Generic/custom forms: require at least one contact or data field
      if (!email && !phone && !name && Object.keys(sanitized).length <= 1) {
        return res.status(400).json({
          status: 'fail',
          message: 'Form payload must contain relevant information',
        });
      }
      break;
  }

  next();
};

export default validateFormSubmission;
