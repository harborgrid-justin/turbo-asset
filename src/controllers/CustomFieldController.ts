import { Router } from 'express';

const router = Router();

// Placeholder routes for custom fields
router.get('/definitions', (req, res) => {
  res.json({ message: 'Get custom field definitions - implementation coming soon' });
});

router.post('/definitions', (req, res) => {
  res.json({ message: 'Create custom field definition - implementation coming soon' });
});

router.get('/values/:entityId', (req, res) => {
  res.json({ message: 'Get custom field values - implementation coming soon' });
});

router.post('/values', (req, res) => {
  res.json({ message: 'Set custom field values - implementation coming soon' });
});

export default router;