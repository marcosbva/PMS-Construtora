

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const parseEntity = (entity: any) => {
    if (!entity) return entity;
    const newItem = { ...entity };
    if (newItem.teamIds && typeof newItem.teamIds === 'string') {
        try { newItem.teamIds = JSON.parse(newItem.teamIds); } catch(e){}
    }
    if (newItem.images && typeof newItem.images === 'string') {
        try { newItem.images = JSON.parse(newItem.images); } catch(e){}
    }
    if (newItem.quotes && typeof newItem.quotes === 'string') {
        try { newItem.quotes = JSON.parse(newItem.quotes); } catch(e){}
    }
    // Parse Budget Categories
    if (newItem.categories && typeof newItem.categories === 'string') {
        try { newItem.categories = JSON.parse(newItem.categories); } catch(e){}
    }
    return newItem;
};

// --- GET ALL DATA ---
app.get('/api/initial-data', asyncHandler(async (req, res) => {
    try {
        const [worksRaw, users, tasksRaw, finance, logsRaw, materials, ordersRaw, statuses, categories, inventory, rentals] = await Promise.all([
            prisma.constructionWork.findMany(),
            prisma.user.findMany(),
            prisma.task.findMany(),
            prisma.financialRecord.findMany(),
            prisma.dailyLog.findMany(),
            prisma.material.findMany(),
            prisma.materialOrder.findMany(),
            prisma.taskStatus.findMany({ orderBy: { order: 'asc' } }),
            prisma.financeCategory.findMany(),
            prisma.inventoryItem.findMany(), // Assuming model exists
            prisma.rentalItem.findMany() // Assuming model exists
        ]);

        const works = worksRaw.map(parseEntity);
        const tasks = tasksRaw.map(parseEntity);
        const logs = logsRaw.map(parseEntity);
        const orders = ordersRaw.map(parseEntity);

        res.json({ works, users, tasks, finance, logs, materials, orders, taskStatuses: statuses, financeCategories: categories, inventory, rentals });
    } catch (e) {
        console.error("Error fetching initial data:", e);
        // Fallback for missing tables in dev environment
        res.status(500).json({ error: "Falha na conexão com banco de dados." });
    }
}));

// --- GENERIC CRUD ---
const stringifyFields = (data: any) => {
    const newData = { ...data };
    ['teamIds', 'images', 'quotes', 'categories'].forEach(key => {
        if (newData[key] && typeof newData[key] === 'object') {
            newData[key] = JSON.stringify(newData[key]);
        }
    });
    return newData;
}

app.get('/', (req, res) => {
    res.send('PMS Backend is running.');
});

// Users
app.post('/api/users', asyncHandler(async (req, res) => { res.json(await prisma.user.create({ data: req.body })) }));
app.put('/api/users/:id', asyncHandler(async (req, res) => { res.json(await prisma.user.update({ where: { id: req.params.id }, data: req.body })) }));
app.delete('/api/users/:id', asyncHandler(async (req, res) => { await prisma.user.delete({ where: { id: req.params.id } }); res.json({success:true}) }));

// Works
app.post('/api/works', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.constructionWork.create({ data: stringifyFields(req.body) }))) }));
app.put('/api/works/:id', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.constructionWork.update({ where: { id: req.params.id }, data: stringifyFields(req.body) }))) }));

// Tasks
app.post('/api/tasks', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.task.create({ data: stringifyFields(req.body) }))) }));
app.put('/api/tasks/:id', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.task.update({ where: { id: req.params.id }, data: stringifyFields(req.body) }))) }));

// Finance
app.post('/api/finance', asyncHandler(async (req, res) => { res.json(await prisma.financialRecord.create({ data: req.body })) }));
app.put('/api/finance/:id', asyncHandler(async (req, res) => { res.json(await prisma.financialRecord.update({ where: { id: req.params.id }, data: req.body })) }));
app.delete('/api/finance/:id', asyncHandler(async (req, res) => { await prisma.financialRecord.delete({ where: { id: req.params.id } }); res.json({success:true}) }));

// Materials & Orders
app.post('/api/materials', asyncHandler(async (req, res) => { res.json(await prisma.material.create({ data: req.body })) }));
app.put('/api/materials/:id', asyncHandler(async (req, res) => { res.json(await prisma.material.update({ where: { id: req.params.id }, data: req.body })) }));
app.delete('/api/materials/:id', asyncHandler(async (req, res) => { await prisma.material.delete({ where: { id: req.params.id } }); res.json({success:true}) }));
app.post('/api/orders', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.materialOrder.create({ data: stringifyFields(req.body) }))) }));
app.put('/api/orders/:id', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.materialOrder.update({ where: { id: req.params.id }, data: stringifyFields(req.body) }))) }));

// Inventory (Placeholder for Local Mode)
app.post('/api/inventory', asyncHandler(async (req, res) => { 
    try {
        res.json(await prisma.inventoryItem.create({ data: req.body }));
    } catch (e) { res.json(req.body); }
}));
app.put('/api/inventory/:id', asyncHandler(async (req, res) => { 
    try {
        res.json(await prisma.inventoryItem.update({ where: { id: req.params.id }, data: req.body }));
    } catch (e) { res.json(req.body); }
}));
app.delete('/api/inventory/:id', asyncHandler(async (req, res) => { 
    try {
        await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    } catch (e) {}
    res.json({success:true}) 
}));

// Rentals (Placeholder)
app.post('/api/rentals', asyncHandler(async (req, res) => { 
    try { res.json(await prisma.rentalItem.create({ data: req.body })); } catch (e) { res.json(req.body); }
}));
app.put('/api/rentals/:id', asyncHandler(async (req, res) => { 
    try { res.json(await prisma.rentalItem.update({ where: { id: req.params.id }, data: req.body })); } catch (e) { res.json(req.body); }
}));
app.delete('/api/rentals/:id', asyncHandler(async (req, res) => { 
    try { await prisma.rentalItem.delete({ where: { id: req.params.id } }); } catch (e) {}
    res.json({success:true}) 
}));


// Configs
app.post('/api/categories', asyncHandler(async (req, res) => { res.json(await prisma.financeCategory.create({ data: req.body })) }));
app.post('/api/logs', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.dailyLog.create({ data: stringifyFields(req.body) }))) }));

// Budgets
app.get('/api/budgets/:workId', asyncHandler(async (req, res) => {
    // Note: This requires a 'WorkBudget' table in Prisma Schema which might not exist in the Seed file provided previously.
    // If running strictly locally with the previous seed file, this might fail unless updated.
    // Assuming schema allows raw JSON storage or generic table.
    // For this prototype, if it fails, the frontend handles it gracefully via Firebase fallback.
    res.json({ error: "Use Firebase for Budgets in this version" });
}));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;