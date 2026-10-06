import { Router } from 'express';
import {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, importCSV, getCategories
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { sendError } from '../utils/response.js';

const router = Router();

router.use(protect);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/import-csv', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return sendError(res, 413, 'CSV file must be 5MB or smaller');
    return sendError(res, 400, err.message === 'Only CSV files are allowed' ? err.message : 'CSV upload is invalid');
  });
}, importCSV);
router.get('/categories', getCategories);

export default router;
