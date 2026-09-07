import mongoose from 'mongoose';

const FormSubmissionSchema = new mongoose.Schema(
  {
    formType: {
      type: String,
      required: [true, 'Form type is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    // Generic normalized fields
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    service: {
      type: String,
      trim: true,
      default: '',
    },

    // Explicit Consultation Form Fields (all 14 fields)
    fullName: {
      type: String,
      trim: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    officialWorkEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    contactPhoneWhatsApp: {
      type: String,
      trim: true,
      default: '',
    },
    countryHeadOfficeLocation: {
      type: String,
      trim: true,
      default: '',
    },
    businessType: {
      type: String,
      trim: true,
      default: '',
    },
    tradeDirection: {
      type: String,
      trim: true,
      default: '',
    },
    productCommodityDescription: {
      type: String,
      trim: true,
      default: '',
    },
    originPortCity: {
      type: String,
      trim: true,
      default: '',
    },
    destinationPortCity: {
      type: String,
      trim: true,
      default: '',
    },
    cargoCategory: {
      type: String,
      trim: true,
      default: '',
    },
    preferredShipmentMode: {
      type: String,
      trim: true,
      default: '',
    },
    expectedShipmentDateTimeline: {
      type: String,
      trim: true,
      default: '',
    },
    detailedTradeRequirements: {
      type: String,
      trim: true,
      default: '',
    },

    // Extensible container for all custom/dynamic form fields
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
      referrer: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['new', 'read', 'contacted', 'archived'],
      default: 'new',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for search across common & consultation fields
FormSubmissionSchema.index({
  name: 'text',
  fullName: 'text',
  email: 'text',
  officialWorkEmail: 'text',
  company: 'text',
  companyName: 'text',
  subject: 'text',
  message: 'text',
  detailedTradeRequirements: 'text',
  productCommodityDescription: 'text',
  countryHeadOfficeLocation: 'text',
  originPortCity: 'text',
  destinationPortCity: 'text',
});

const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

export default FormSubmission;
