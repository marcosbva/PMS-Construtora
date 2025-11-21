
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// Allow all origins for easier Firebase/Cloud Run deployment integration
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to parse JSON fields from SQLite/Postgres text fields
const parseEntity = (entity: any) => {
    if (!entity) return entity;
    const newItem = { ...entity };
    // Add fields that are stored as stringified JSON here
    if (newItem.permissions && typeof newItem.permissions === 'string') {
        try { newItem.permissions = JSON.parse(newItem.permissions); } catch(e){}
    }
    if (newItem.teamIds && typeof newItem.teamIds === 'string') {
        try { newItem.teamIds = JSON.parse(newItem.teamIds); } catch(e){}
    }
    if (newItem.images && typeof newItem.images === 'string') {
        try { newItem.images = JSON.parse(newItem.images); } catch(e){}
    }
    if (newItem.quotes && typeof newItem.quotes === 'string') {
        try { newItem.quotes = JSON.parse(newItem.quotes); } catch(e){}
    }
    return newItem;
};

// --- GET ALL DATA (Dashboard) ---
app.get('/api/initial-data', asyncHandler(async (req, res) => {
    try {
        const [worksRaw, users, profilesRaw, tasksRaw, finance, logsRaw, materials, ordersRaw, statuses, categories] = await Promise.all([
            prisma.constructionWork.findMany(),
            prisma.user.findMany(),
            prisma.userProfile.findMany(),
            prisma.task.findMany(),
            prisma.financialRecord.findMany(),
            prisma.dailyLog.findMany(),
            prisma.material.findMany(),
            prisma.materialOrder.findMany(),
            prisma.taskStatus.findMany({ orderBy: { order: 'asc' } }),
            prisma.financeCategory.findMany()
        ]);

        // Parse JSON fields for SQLite compatibility
        const works = worksRaw.map(parseEntity);
        const profiles = profilesRaw.map(parseEntity);
        const tasks = tasksRaw.map(parseEntity);
        const logs = logsRaw.map(parseEntity);
        const orders = ordersRaw.map(parseEntity);

        res.json({ works, users, profiles, tasks, finance, logs, materials, orders, taskStatuses: statuses, financeCategories: categories });
    } catch (e) {
        console.error("Error fetching initial data:", e);
        res.status(500).json({ error: "Falha na conexão com banco de dados." });
    }
}));

// --- GENERIC CRUD ---
// Note: When saving to SQLite with Prisma & JSON fields, we must stringify in the frontend 
// OR handle it here. To keep it simple, we assume Frontend sends proper objects and we stringify here if needed,
// but since Prisma Client handles types based on schema, and we defined String, we cast.

const stringifyFields = (data: any) => {
    const newData = { ...data };
    ['permissions', 'teamIds', 'images', 'quotes'].forEach(key => {
        if (newData[key] && typeof newData[key] === 'object') {
            newData[key] = JSON.stringify(newData[key]);
        }
    });
    return newData;
}

// Health Check for Cloud Run
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

// Configs
app.post('/api/profiles', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.userProfile.create({ data: stringifyFields(req.body) }))) }));
app.put('/api/profiles/:id', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.userProfile.update({ where: { id: req.params.id }, data: stringifyFields(req.body) }))) }));
app.delete('/api/profiles/:id', asyncHandler(async (req, res) => { await prisma.userProfile.delete({ where: { id: req.params.id } }); res.json({success:true}) }));
app.post('/api/categories', asyncHandler(async (req, res) => { res.json(await prisma.financeCategory.create({ data: req.body })) }));
app.post('/api/logs', asyncHandler(async (req, res) => { res.json(parseEntity(await prisma.dailyLog.create({ data: stringifyFields(req.body) }))) }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Export app for potential testing or serverless wrappers
export default app;
