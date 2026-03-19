const express = require('express');
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ─── Helpers ────────────────────────────────────────────

function isMember(group, userId) {
  return group.members.some((m) => String(m._id || m) === String(userId));
}

/** Compute net balances for a group from expenses + settlements. */
async function computeBalances(groupId) {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).lean(),
    Settlement.find({ group: groupId }).lean(),
  ]);

  // net[A][B] > 0 means A owes B that amount
  const net = {};
  const ensure = (a, b) => {
    if (!net[a]) net[a] = {};
    if (!net[a][b]) net[a][b] = 0;
  };

  for (const exp of expenses) {
    const payer = String(exp.paidBy);
    for (const s of exp.splits) {
      const debtor = String(s.user);
      if (debtor === payer) continue;
      ensure(debtor, payer);
      ensure(payer, debtor);
      net[debtor][payer] += s.amount;
      net[payer][debtor] -= s.amount;
    }
  }

  for (const stl of settlements) {
    const from = String(stl.from);
    const to = String(stl.to);
    ensure(from, to);
    ensure(to, from);
    net[from][to] -= stl.amount;
    net[to][from] += stl.amount;
  }

  // Flatten to list of { from, to, amount } where amount > 0
  const balances = [];
  const seen = new Set();
  for (const a of Object.keys(net)) {
    for (const b of Object.keys(net[a])) {
      const key = [a, b].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      const amt = net[a][b];
      if (Math.abs(amt) < 0.01) continue;
      if (amt > 0) {
        balances.push({ from: a, to: b, amount: Math.round(amt * 100) / 100 });
      } else {
        balances.push({ from: b, to: a, amount: Math.round(-amt * 100) / 100 });
      }
    }
  }
  return balances;
}

/** Debt simplification — minimize number of transactions. */
function simplifyDebts(balances) {
  // Compute net position per user
  const netPos = {};
  for (const b of balances) {
    netPos[b.from] = (netPos[b.from] || 0) - b.amount;
    netPos[b.to] = (netPos[b.to] || 0) + b.amount;
  }

  const debtors = []; // negative net = owes money
  const creditors = []; // positive net = owed money
  for (const [user, amt] of Object.entries(netPos)) {
    if (amt < -0.01) debtors.push({ user, amount: -amt });
    else if (amt > 0.01) creditors.push({ user, amount: amt });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplified = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      simplified.push({
        from: debtors[i].user,
        to: creditors[j].user,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return simplified;
}

// ─── Group CRUD ─────────────────────────────────────────

// POST /api/groups — create group
router.post(
  '/',
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('memberEmails').optional().isArray(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0]?.msg });

      const members = [req.user._id];
      if (req.body.memberEmails && Array.isArray(req.body.memberEmails)) {
        for (const email of req.body.memberEmails) {
          const u = await User.findOne({ email: email.trim().toLowerCase() });
          if (u && !members.some((m) => String(m) === String(u._id))) {
            members.push(u._id);
          }
        }
      }

      const group = await Group.create({
        name: req.body.name.trim(),
        createdBy: req.user._id,
        members,
        currency: req.body.currency || 'INR',
      });
      await group.populate('members', 'name email location');
      res.status(201).json(group);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/groups — list user's groups
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name email location')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:id — single group
router.get('/:id', param('id').isMongoId(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email location')
      .lean();
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/groups/:id — update name, add/remove members
router.patch(
  '/:id',
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  body('addEmails').optional().isArray(),
  body('removeUserIds').optional().isArray(),
  async (req, res) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

      if (req.body.name) group.name = req.body.name.trim();

      if (req.body.addEmails) {
        for (const email of req.body.addEmails) {
          const u = await User.findOne({ email: email.trim().toLowerCase() });
          if (u && !group.members.some((m) => String(m) === String(u._id))) {
            group.members.push(u._id);
          }
        }
      }

      if (req.body.removeUserIds) {
        group.members = group.members.filter(
          (m) => !req.body.removeUserIds.includes(String(m))
        );
        // Ensure creator stays
        if (!group.members.some((m) => String(m) === String(group.createdBy))) {
          group.members.push(group.createdBy);
        }
      }

      await group.save();
      await group.populate('members', 'name email location');
      res.json(group);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/groups/:id — creator only
router.delete('/:id', param('id').isMongoId(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (String(group.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the creator can delete this group' });
    }
    await Expense.deleteMany({ group: group._id });
    await Settlement.deleteMany({ group: group._id });
    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Expenses ───────────────────────────────────────────

// POST /api/groups/:id/expenses
router.post(
  '/:id/expenses',
  param('id').isMongoId(),
  body('description').trim().notEmpty(),
  body('amount').isFloat({ gt: 0 }),
  body('category').optional().isIn(['Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other']),
  body('paidBy').optional().isMongoId(),
  body('splitType').optional().isIn(['equal', 'custom']),
  body('splits').optional().isArray(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0]?.msg });

      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

      const paidBy = req.body.paidBy || req.user._id;
      if (!isMember(group, paidBy)) return res.status(400).json({ error: 'Payer must be a group member' });

      const amount = parseFloat(req.body.amount);
      let splits;

      if (req.body.splitType === 'custom' && Array.isArray(req.body.splits)) {
        // Validate custom splits
        splits = req.body.splits.map((s) => ({
          user: s.user,
          amount: parseFloat(s.amount),
        }));
        // Verify all split users are members
        for (const s of splits) {
          if (!isMember(group, s.user)) {
            return res.status(400).json({ error: 'All split users must be group members' });
          }
        }
        const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(splitTotal - amount) > 0.01) {
          return res.status(400).json({ error: `Split total (${splitTotal}) doesn't match expense amount (${amount})` });
        }
      } else {
        // Equal split among all members
        const perPerson = Math.round((amount / group.members.length) * 100) / 100;
        splits = group.members.map((m) => ({ user: m, amount: perPerson }));
        // Adjust rounding on first split
        const total = splits.reduce((s, x) => s + x.amount, 0);
        if (Math.abs(total - amount) > 0.001) {
          splits[0].amount += Math.round((amount - total) * 100) / 100;
        }
      }

      const expense = await Expense.create({
        group: group._id,
        description: req.body.description.trim(),
        amount,
        currency: group.currency,
        category: req.body.category || 'Other',
        paidBy,
        splits,
        createdBy: req.user._id,
      });
      await expense.populate('paidBy', 'name email');
      await expense.populate('splits.user', 'name email');
      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/groups/:id/expenses
router.get('/:id/expenses', param('id').isMongoId(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

    const expenses = await Expense.find({ group: group._id })
      .populate('paidBy', 'name email')
      .populate('splits.user', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id/expenses/:expId
router.delete('/:id/expenses/:expId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

    const expense = await Expense.findOne({ _id: req.params.expId, group: group._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // Only creator of expense or group creator can delete
    if (String(expense.createdBy) !== String(req.user._id) && String(group.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Balances ───────────────────────────────────────────

// GET /api/groups/:id/balances
router.get('/:id/balances', param('id').isMongoId(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

    const balances = await computeBalances(group._id);

    // Resolve user names
    const memberMap = {};
    for (const m of group.members) {
      memberMap[String(m._id)] = m.name;
    }

    const detailed = balances.map((b) => ({
      from: b.from,
      fromName: memberMap[b.from] || 'Unknown',
      to: b.to,
      toName: memberMap[b.to] || 'Unknown',
      amount: b.amount,
    }));

    const simplified = simplifyDebts(balances).map((b) => ({
      from: b.from,
      fromName: memberMap[b.from] || 'Unknown',
      to: b.to,
      toName: memberMap[b.to] || 'Unknown',
      amount: b.amount,
    }));

    res.json({ balances: detailed, simplified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Settlements ────────────────────────────────────────

// POST /api/groups/:id/settlements
router.post(
  '/:id/settlements',
  param('id').isMongoId(),
  body('to').isMongoId(),
  body('amount').isFloat({ gt: 0 }),
  body('note').optional().trim(),
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0]?.msg });

      const group = await Group.findById(req.params.id);
      if (!group) return res.status(404).json({ error: 'Group not found' });
      if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });
      if (!isMember(group, req.body.to)) return res.status(400).json({ error: 'Recipient must be a group member' });

      const settlement = await Settlement.create({
        group: group._id,
        from: req.user._id,
        to: req.body.to,
        amount: parseFloat(req.body.amount),
        currency: group.currency,
        note: req.body.note || '',
      });
      await settlement.populate('from', 'name email');
      await settlement.populate('to', 'name email');
      res.status(201).json(settlement);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/groups/:id/settlements
router.get('/:id/settlements', param('id').isMongoId(), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ error: 'Not a member' });

    const settlements = await Settlement.find({ group: group._id })
      .populate('from', 'name email')
      .populate('to', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
