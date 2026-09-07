import formService from '../services/formService.js';

/**
 * @route   POST /api/forms/submit
 * @desc    Public endpoint to submit any website form
 * @access  Public
 */
export const submit = async (req, res, next) => {
  try {
    const metadata = {
      ip:
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        '',
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
    };

    await formService.submitForm(req.body, metadata);

    return res.status(200).json({
      status: 'success',
      message: 'Form submitted successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/forms/submissions
 * @desc    Admin endpoint to view paginated form submissions
 * @access  Private (Admin JWT)
 */
export const getSubmissions = async (req, res, next) => {
  try {
    const { page, limit, formType, search, status } = req.query;

    const result = await formService.getSubmissions({
      page,
      limit,
      formType,
      search,
      status,
    });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/forms/submissions/:id
 * @desc    Admin endpoint to get single submission by ID
 * @access  Private (Admin JWT)
 */
export const getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await formService.getSubmissionById(id);

    return res.status(200).json({
      status: 'success',
      data: {
        submission,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   DELETE /api/forms/submissions/:id
 * @desc    Admin endpoint to delete a submission
 * @access  Private (Admin JWT)
 */
export const deleteSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    await formService.deleteSubmission(id);

    return res.status(200).json({
      status: 'success',
      message: 'Form submission deleted successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PATCH /api/forms/submissions/:id/status
 * @desc    Admin endpoint to update submission status
 * @access  Private (Admin JWT)
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Status field is required',
      });
    }

    const updated = await formService.updateSubmissionStatus(id, status);

    return res.status(200).json({
      status: 'success',
      message: 'Status updated successfully',
      data: {
        submission: updated,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'fail',
        message: error.message,
      });
    }
    next(error);
  }
};

export default {
  submit,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
  updateStatus,
};
