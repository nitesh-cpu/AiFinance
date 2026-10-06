import { Transaction } from '../models/Transaction.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { getMonthRange } from '../utils/dateUtils.js';
import { sendControllerError } from '../utils/controllerError.js';
import axios from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';

const MAX_PAGE_SIZE = 100;
const MAX_IMPORT_ROWS = 5000;
const MAX_REPORTED_ROW_ERRORS = 100;
const CATEGORIES = [
  'Food & Dining','Shopping','Transport','Entertainment','Healthcare',
  'Education','Bills & Utilities','Travel','Investments','Salary',
  'Freelance','Other Income','Transfer','Other','Uncategorized',
];

function autoCategory(description = '') {
  const d = description.toLowerCase();
  if (/swiggy|zomato|restaurant|food|cafe|pizza|biryani/.test(d)) return 'Food & Dining';
  if (/amazon|flipkart|myntra|mall|shop|store/.test(d)) return 'Shopping';
  if (/uber|ola|rapido|metro|bus|petrol|fuel/.test(d)) return 'Transport';
  if (/netflix|spotify|hotstar|cinema|prime|game/.test(d)) return 'Entertainment';
  if (/hospital|pharmacy|doctor|clinic|medical/.test(d)) return 'Healthcare';
  if (/tuition|course|book|university|school/.test(d)) return 'Education';
  if (/electricity|water|internet|broadband|gas|rent|mobile/.test(d)) return 'Bills & Utilities';
  if (/salary|payroll|income|credited/.test(d)) return 'Salary';
  if (/freelance|client|invoice/.test(d)) return 'Freelance';
  if (/flight|hotel|booking|trip|travel/.test(d)) return 'Travel';
  if (/sip|mutual fund|stock|investment|fd/.test(d)) return 'Investments';
  return 'Uncategorized';
}

const normalizeDescription = (description) =>
  description.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

const dayStart = (date) => {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

const transactionKey = (transaction) =>
  `${dayStart(transaction.date).toISOString()}|${transaction.type}|${transaction.amount}|${normalizeDescription(transaction.description)}`;

function parseTransactionType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (['credit', 'income', 'inflow', 'incoming'].includes(type)) return 'credit';
  if (['debit', 'expense', 'outflow', 'outgoing'].includes(type)) return 'debit';
  return null;
}

function parseDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/)?.[1];
  if (!dateOnly || !/^\d{4}-\d{2}-\d{2}$/.test(raw) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(raw)) return null;
  const parsedDate = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateOnly) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return parsedDate;
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const date = new Date(hasTimezone ? raw : `${raw}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapMLCategory(category, description, type) {
  const predicted = String(category || '').trim().toLowerCase();
  const text = description.toLowerCase();
  const knownCategories = new Map(CATEGORIES.map((item) => [item.toLowerCase(), item]));

  if (predicted === 'food') return 'Food & Dining';
  if (predicted === 'transportation') return 'Transport';
  if (predicted === 'bills') return 'Bills & Utilities';
  if (predicted === 'income') {
    if (type !== 'credit') return 'Other';
    return /freelance|client|invoice/.test(text) ? 'Freelance' : 'Salary';
  }
  return knownCategories.get(predicted) || null;
}

async function predictCategory(description, amount, type) {
  const serviceUrl = (process.env.ML_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');
  try {
    const response = await axios.post(
      `${serviceUrl}/ml/categorize`,
      { merchant: description, description, amount },
      {
        timeout: 2500,
        headers: process.env.ML_API_KEY ? { 'X-ML-Service-Key': process.env.ML_API_KEY } : {},
      }
    );
    const category = mapMLCategory(response.data?.category, description, type);
    return category
      ? { category, predicted: true }
      : { category: autoCategory(description), predicted: false };
  } catch (err) {
    console.warn(JSON.stringify({
      level: 'warn',
      event: 'ml_categorization_unavailable',
      errorName: err.name || 'Error',
    }));
    return { category: autoCategory(description), predicted: false };
  }
}

const csvHeaders = {
  date: 'date',
  transactiondate: 'date',
  createdat: 'date',
  description: 'description',
  merchant: 'description',
  name: 'description',
  amount: 'amount',
  type: 'type',
  transactiontype: 'type',
  category: 'category',
  notes: 'notes',
  tags: 'tags',
};

async function parseCSV(buffer) {
  const rows = [];
  let headers = [];
  let rowLimitExceeded = false;

  await new Promise((resolve, reject) => {
    Readable.from([buffer])
      .pipe(csv({
        strict: true,
        mapHeaders: ({ header }) => {
          const normalized = header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, '');
          return csvHeaders[normalized] || normalized;
        },
      }))
      .on('headers', (parsedHeaders) => {
        headers = parsedHeaders;
      })
      .on('data', (row) => {
        if (rows.length >= MAX_IMPORT_ROWS) {
          rowLimitExceeded = true;
          return;
        }
        rows.push(row);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  if (!headers.length) {
    return { rows, errors: [{ row: 1, message: 'The CSV file is empty or has no header row.' }] };
  }

  const errors = [];
  if (new Set(headers).size !== headers.length) {
    errors.push({ row: 1, message: 'The CSV contains duplicate or conflicting column names.' });
  }
  const allowedHeaders = new Set(['date', 'description', 'amount', 'type', 'category', 'notes', 'tags']);
  const unexpectedHeaders = headers.filter((header) => !allowedHeaders.has(header));
  if (unexpectedHeaders.length) {
    errors.push({ row: 1, message: `Unsupported column${unexpectedHeaders.length > 1 ? 's' : ''}: ${unexpectedHeaders.join(', ')}.` });
  }
  for (const required of ['date', 'description', 'amount', 'type']) {
    if (!headers.includes(required)) {
      errors.push({ row: 1, message: `Missing required column: ${required}.` });
    }
  }
  if (rowLimitExceeded) {
    errors.push({ row: MAX_IMPORT_ROWS + 2, message: `CSV files may contain at most ${MAX_IMPORT_ROWS} data rows.` });
  }
  return { rows, errors };
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

// GET /api/transactions
export const getTransactions = async (req, res) => {
  try {
    const {
      page: rawPage = '1',
      limit: rawLimit = '50',
      category,
      type: rawType,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;
    const page = Number(rawPage);
    const limit = Number(rawLimit);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return sendError(res, 400, `Page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}`);
    }

    const filter = { userId: req.user._id };

    if (category !== undefined && typeof category !== 'string') {
      return sendError(res, 400, 'Category must be a string');
    }
    if (category && category !== 'all') filter.category = category;
    if (rawType && rawType !== 'all') {
      const normalizedType = parseTransactionType(rawType);
      if (!normalizedType) return sendError(res, 400, 'Type must be income, expense, credit, or debit');
      filter.type = normalizedType;
    }
    if (startDate || endDate) {
      filter.date = {};
      let endDateIsInclusiveDay = false;
      if (startDate) {
        const parsedStart = parseDate(startDate);
        if (!parsedStart) return sendError(res, 400, 'startDate must be a valid ISO date');
        filter.date.$gte = parsedStart;
      }
      if (endDate) {
        const parsedEnd = parseDate(endDate);
        if (!parsedEnd) return sendError(res, 400, 'endDate must be a valid ISO date');
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          endDateIsInclusiveDay = true;
          parsedEnd.setUTCDate(parsedEnd.getUTCDate() + 1);
          filter.date.$lt = parsedEnd;
        } else {
          filter.date.$lte = parsedEnd;
        }
      }
      if (filter.date.$gte && (filter.date.$lt || filter.date.$lte)) {
        const upper = filter.date.$lt || filter.date.$lte;
        if (endDateIsInclusiveDay ? filter.date.$gte >= upper : filter.date.$gte > upper) {
          return sendError(res, 400, 'startDate must be before or equal to endDate');
        }
      }
    }
    if (search) {
      const normalizedSearch = String(search).trim().slice(0, 100);
      if (normalizedSearch) {
        filter.description = { $regex: normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }
    }

    const sortFields = { date: 'date', amount: 'amount', description: 'description', createdAt: 'createdAt' };
    if (!Object.hasOwn(sortFields, sortBy) || !['asc', 'desc'].includes(sortOrder)) {
      return sendError(res, 400, 'sortBy or sortOrder is invalid');
    }
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortFields[sortBy]]: sortDirection, _id: sortDirection };

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, 200, 'Transactions fetched', {
      transactions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendControllerError(res, error, 'get_transactions', 'Failed to fetch transactions');
  }
};

// POST /api/transactions
export const createTransaction = async (req, res) => {
  try {
    const { description, amount, type: rawType, category, date, notes, tags } = req.body || {};
    const normalizedDescription = String(description || '').trim();
    const normalizedType = parseTransactionType(rawType);
    const parsedAmount = Number(amount);
    const parsedDate = date ? parseDate(date) : new Date();
    if (typeof description !== 'string' || !normalizedDescription || !Number.isFinite(parsedAmount) || parsedAmount <= 0 ||
      !normalizedType || !parsedDate || (category !== undefined && category !== null && typeof category !== 'string')) {
      return sendError(res, 400, 'Provide a description, positive amount, valid transaction type, and valid date');
    }
    const selectedCategory = String(category || '').trim();
    if (selectedCategory.length > 100) {
      return sendError(res, 400, 'Category must be 100 characters or fewer');
    }
    const categoryResult = selectedCategory
      ? { category: selectedCategory, predicted: false }
      : await predictCategory(normalizedDescription, parsedAmount, normalizedType);

    const transaction = await Transaction.create({
      userId: req.user._id,
      description: normalizedDescription,
      amount: parsedAmount,
      type: normalizedType,
      category: categoryResult.category,
      date: parsedDate,
      notes,
      tags,
    });
    return sendSuccess(res, 201, 'Transaction created', { transaction });
  } catch (error) {
    return sendControllerError(res, error, 'create_transaction', 'Failed to create transaction');
  }
};

// PUT /api/transactions/:id
export const updateTransaction = async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    for (const field of ['date', 'description', 'amount', 'type', 'category', 'notes', 'tags']) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'Provide at least one transaction field to update');
    }

    if (updates.description !== undefined) {
      if (typeof updates.description !== 'string' || !updates.description.trim()) {
        return sendError(res, 400, 'Description is required');
      }
      updates.description = updates.description.trim();
    }
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
      if (!Number.isFinite(updates.amount) || updates.amount <= 0) {
        return sendError(res, 400, 'Amount must be a positive number');
      }
    }
    if (updates.type !== undefined) {
      updates.type = parseTransactionType(updates.type);
      if (!updates.type) return sendError(res, 400, 'Type must be income, expense, credit, or debit');
    }
    if (updates.date !== undefined) {
      updates.date = parseDate(updates.date);
      if (!updates.date) return sendError(res, 400, 'Date must be a valid ISO date');
    }
    if (updates.category !== undefined) {
      if (typeof updates.category !== 'string') return sendError(res, 400, 'Category must be a string');
      updates.category = updates.category.trim();
      if (updates.category.length > 100) return sendError(res, 400, 'Category must be 100 characters or fewer');
    }

    if (updates.category === '') {
      const current = await Transaction.findOne({
        _id: req.params.id,
        userId: req.user._id,
      }).select('description amount type');
      if (!current) return sendError(res, 404, 'Transaction not found');

      const description = updates.description ?? current.description;
      const amount = updates.amount ?? current.amount;
      const type = updates.type ?? current.type;
      updates.category = (await predictCategory(description, amount, type)).category;
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!transaction) return sendError(res, 404, 'Transaction not found');
    return sendSuccess(res, 200, 'Transaction updated', { transaction });
  } catch (error) {
    return sendControllerError(res, error, 'update_transaction', 'Failed to update transaction');
  }
};

// DELETE /api/transactions/:id
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!transaction) return sendError(res, 404, 'Transaction not found');
    return sendSuccess(res, 200, 'Transaction deleted');
  } catch (error) {
    return sendControllerError(res, error, 'delete_transaction', 'Failed to delete transaction');
  }
};

// POST /api/transactions/import-csv
export const importCSV = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, 'No CSV file uploaded');

    const { rows, errors: headerErrors } = await parseCSV(req.file.buffer);
    if (headerErrors.length) {
      return sendError(res, 400, 'CSV header or structure is invalid', null, { errors: headerErrors });
    }

    const invalidRows = [];
    const validRows = [];
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const description = String(row.description || '').trim();
      const amountText = String(row.amount || '').trim();
      const amountValid = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(amountText);
      const amount = amountValid ? Number(amountText.replace(/,/g, '')) : Number.NaN;
      const type = parseTransactionType(row.type);
      const date = parseDate(row.date);
      const category = String(row.category || '').trim();

      const issues = [];
      if (!description) issues.push('Description is required');
      if (!amountValid || !Number.isFinite(amount) || amount <= 0) issues.push('Amount must be a positive number');
      if (!type) issues.push('Type must be income, expense, credit, or debit');
      if (!date) issues.push('Date must be a valid ISO date');
      if (category.length > 100) issues.push('Category must be 100 characters or fewer');

      if (issues.length) {
        if (invalidRows.length < MAX_REPORTED_ROW_ERRORS) {
          invalidRows.push({ row: rowNumber, message: issues.join('; ') });
        }
        return;
      }

      validRows.push({
        row: rowNumber,
        description,
        amount,
        type,
        category,
        date,
        notes: String(row.notes || '').trim(),
        tags: String(row.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      });
    });

    const invalidRowCount = rows.length - validRows.length;
    if (invalidRowCount > invalidRows.length) {
      invalidRows.push({ message: `${invalidRowCount - invalidRows.length} additional invalid rows were omitted.` });
    }

    const dateRange = validRows.map((item) => dayStart(item.date));
    const minDate = dateRange.length ? new Date(Math.min(...dateRange)) : null;
    const maxDate = dateRange.length ? new Date(Math.max(...dateRange)) : null;
    if (maxDate) maxDate.setUTCDate(maxDate.getUTCDate() + 1);

    const possibleDuplicates = validRows.length
      ? await Transaction.find({
          userId: req.user._id,
          date: { $gte: minDate, $lt: maxDate },
          amount: { $in: [...new Set(validRows.map((item) => item.amount))] },
          type: { $in: [...new Set(validRows.map((item) => item.type))] },
        }).select('description amount type date')
      : [];
    const existingKeys = new Set(possibleDuplicates.map(transactionKey));
    const seenKeys = new Set();
    const candidates = [];
    let duplicatesSkipped = 0;
    for (const item of validRows) {
      const key = transactionKey(item);
      if (existingKeys.has(key) || seenKeys.has(key)) {
        duplicatesSkipped += 1;
        continue;
      }
      seenKeys.add(key);
      candidates.push(item);
    }

    const prepared = await mapConcurrent(candidates, 8, async (item) => {
      if (item.category) return { ...item, category: item.category, categorized: true, predicted: false };
      const result = await predictCategory(item.description, item.amount, item.type);
      return { ...item, category: result.category, categorized: result.predicted, predicted: result.predicted };
    });

    const inserted = prepared.length
      ? await Transaction.insertMany(prepared.map(({ description, amount, type, category, date, notes, tags }) => ({
          userId: req.user._id,
          description,
          amount,
          type,
          category: category || 'Uncategorized',
          date,
          source: 'csv',
          notes,
          tags,
        })))
      : [];

    const importedCategorizedRows = prepared.reduce((count, item) => count + (item.categorized ? 1 : 0), 0);
    const mlCategorizedRows = prepared.reduce((count, item) => count + (item.predicted ? 1 : 0), 0);
    return sendSuccess(res, 201, `${inserted.length} transactions imported`, {
      totalRows: rows.length,
      imported: inserted.length,
      count: inserted.length,
      duplicatesSkipped,
      invalidRows: invalidRowCount,
      categorizedRows: importedCategorizedRows,
      mlCategorizedRows,
      errors: invalidRows,
      errorsTruncated: invalidRowCount > MAX_REPORTED_ROW_ERRORS,
    });
  } catch (err) {
    if (err.message?.includes('Row length does not match headers')) {
      return sendError(res, 400, 'CSV row structure is invalid', null, {
        errors: [{ message: 'One or more rows contain a different number of columns than the header.' }],
      });
    }
    return sendControllerError(res, err, 'import_csv', 'CSV import failed');
  }
};

// GET /api/transactions/categories
export const getCategories = async (req, res) => {
  return sendSuccess(res, 200, 'Categories fetched', { categories: CATEGORIES });
};
