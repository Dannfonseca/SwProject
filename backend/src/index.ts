import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { initData, data } from './data/provider';
import { syncSkills, syncMonsters } from './services/SwarfarmService';
import { syncDefenses } from './services/SwgtService';
import { generateDefenseSuggestions, extractMonstersFromImages, translateSkills } from './services/AiService';
import { extractMonstersFromImagesViaVision } from './services/VisionService';
import { normalizeMonsterName, normalizeMonsterNames, fuzzyMatchNames } from './utils/normalizeMonsterName';
import { expandCollabSearch } from './utils/collabSearch';
import { register, login, googleLogin } from './services/AuthService';
import { requireAuth, requireAdmin, extractUser } from './middleware/authMiddleware';

initData().catch((err) => {
    console.error('DB init failed:', err);
    process.exit(1);
});

const app = new Elysia()
    .use(cors())
    .get('/', () => {
        return { message: 'Hello Elysia' };
    })

    // ===== AUTH ROUTES (PUBLIC) =====

    .post('/api/auth/register', async ({ body, set }) => {
        try {
            const { email, password, name } = body as any;
            if (!email || !password || !name) {
                set.status = 400;
                return { error: 'Email, password e name são obrigatórios' };
            }
            const result = await register(email, password, name);
            return result;
        } catch (err: any) {
            set.status = 400;
            return { error: err.message };
        }
    })
    .post('/api/auth/login', async ({ body, set }) => {
        try {
            const { email, password } = body as any;
            if (!email || !password) {
                set.status = 400;
                return { error: 'Email e password são obrigatórios' };
            }
            const result = await login(email, password);
            return result;
        } catch (err: any) {
            set.status = 401;
            return { error: err.message };
        }
    })
    .post('/api/auth/google', async ({ body, set }) => {
        try {
            const { credential } = body as any;
            if (!credential) {
                set.status = 400;
                return { error: 'Google credential é obrigatório' };
            }
            const result = await googleLogin(credential);
            return result;
        } catch (err: any) {
            set.status = 401;
            return { error: err.message };
        }
    })
    .get('/api/auth/me', async ({ headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };
        return { user };
    })


    // ===== PUBLIC ROUTES =====

    .get('/api/defenses', async ({ query }) => {
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 100;
        const monsterQuery = (query.monster as string) || '';
        let normalizedMonster: string | undefined;
        let monsterList: string[] | undefined;

        if (monsterQuery && monsterQuery.trim().length > 0) {
            const collabMatch = expandCollabSearch(monsterQuery.trim());
            if (collabMatch) {
                monsterList = collabMatch.names;
            } else {
                normalizedMonster = normalizeMonsterName(monsterQuery.trim());
            }
        }

        const { items, total } = await data.getDefenses(page, limit, normalizedMonster, monsterList);

        return {
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    })
    .get('/api/defenses/by-monster', async ({ query }) => {
        const name = (query.name as string) || '';
        if (!name) {
            return { data: [] };
        }
        const limit = parseInt(query.limit as string) || 100;
        const dataList = await data.getDefensesByMonsterName(name, limit);
        return { data: dataList };
    })
    .get('/api/status', () => {
        return { message: 'parabéns, vc conectou' };
    })
    .get('/api/monsters', async ({ query }) => {
        const page = parseInt(query.page as string) || 1;
        const limit = parseInt(query.limit as string) || 1000;
        const letter = query.letter as string;
        const search = query.search as string;
        const groupedFamilies = await data.getMonstersGrouped(page, limit, letter, search);
        return groupedFamilies;
    })
    .get('/api/monsters/:id', async ({ params, set }) => {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            set.status = 400;
            return { error: 'Invalid ID' };
        }
        const monster = await data.getMonsterByCom2usId(id);
        if (!monster) {
            set.status = 404;
            return { error: 'Monster not found' };
        }
        return monster;
    })
    .post('/api/monsters/lookup', async ({ body }) => {
        const { names } = body as any;
        if (!names || !Array.isArray(names) || names.length === 0) {
            return { data: [] };
        }
        const unique = Array.from(new Set(names.filter((n: any) => typeof n === 'string' && n.trim().length > 0)));
        const dataList = await data.getMonstersByNames(unique);
        return { data: dataList };
    })

    // ===== AUTHENTICATED ROUTES (user or admin) =====

    .post('/api/defenses', async ({ body, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        const { monsters, leader_index, note, source, team_hash } = body as any;

        if (!monsters || !Array.isArray(monsters) || monsters.length === 0) {
            throw new Error('Monsters array is required');
        }

        const newDefense = await data.createDefense({
            monsters,
            leader_index,
            source,
            note,
            team_hash,
            submitted_by: user.id,
            submitted_by_name: user.name
        });

        return newDefense;
    })
    .post('/api/defenses/bulk', async ({ body, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        const { defenses } = body as any;
        if (!defenses || !Array.isArray(defenses) || defenses.length === 0) {
            throw new Error('Defenses array is required');
        }

        console.log(`[Bulk] Inserting ${defenses.length} defenses...`);

        const docs = defenses.map((d: any) => ({
            monsters: d.monsters,
            leader_index: 0,
            source: 'ai_import',
            note: d.note,
            team_hash: d.monsters.join('_'),
            win_rate: 0,
            pick_rate: 0,
            updated_at: new Date(),
            submitted_by: user.id,
            submitted_by_name: user.name
        }));

        const uniqueDocsMap = new Map();
        docs.forEach((doc: any) => {
            if (!uniqueDocsMap.has(doc.team_hash)) {
                uniqueDocsMap.set(doc.team_hash, doc);
            }
        });
        const uniqueDocs = Array.from(uniqueDocsMap.values());
        console.log(`[Bulk] Deduplicated ${docs.length} -> ${uniqueDocs.length} teams.`);

        const insertedCount = await data.bulkInsertDefenses(uniqueDocs);
        console.log(`[Bulk] Inserted ${insertedCount} teams.`);
        return { message: `Imported ${insertedCount} new teams. (${uniqueDocs.length - insertedCount} duplicates skipped)` };
    })
    .post('/api/defenses/generate', async ({ body, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        const { context, owned_monsters, api_key } = body as any;
        console.log(`[Route] /api/defenses/generate - Context length: ${context?.length}, Monsters: ${owned_monsters?.length}`);

        const suggestions = await generateDefenseSuggestions(context, owned_monsters, api_key);
        return suggestions;
    })
    .post('/api/analyze/images', async ({ body, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        const { images, image } = body as any;

        const rawInput = images ?? image;
        const files = Array.isArray(rawInput) ? rawInput : [rawInput];
        if (!files || files.length === 0 || !files[0]) {
            throw new Error('No images provided');
        }

        const processedImages = await Promise.all(files.map(async (f: Blob) => ({
            buffer: Buffer.from(await f.arrayBuffer()),
            mimeType: f.type
        })));

        let detectedMonsters: string[] | null = null;
        try {
            detectedMonsters = await extractMonstersFromImagesViaVision(processedImages);
        } catch (err) {
            console.warn('[Analyzer] Vision service failed, falling back to AI:', err);
        }

        const validNames = await data.getMonsterNames();
        const defenseNames = await data.getDefenseMonsterNames();
        const ambiguousElements = await data.getAmbiguousMonsterElements();

        const elementQualified = new Set<string>();
        ambiguousElements.forEach((elements, base) => {
            elements.forEach((el) => {
                elementQualified.add(`${el} ${base}`);
            });
        });

        const allowedNames = new Set([...validNames, ...defenseNames, ...elementQualified]);

        if (!detectedMonsters || detectedMonsters.length === 0) {
            detectedMonsters = await extractMonstersFromImages(processedImages, validNames);
        }

        let normalized = normalizeMonsterNames(detectedMonsters);
        normalized = fuzzyMatchNames(normalized, validNames, 0.25);

        const expandDetected = (names: string[]) => {
            const expanded = new Set<string>();
            const elementRegex = /^(Fire|Water|Wind|Light|Dark)\s+(.+)$/i;
            const seenElementBases = new Set<string>();

            for (const raw of names) {
                if (!raw || typeof raw !== 'string') continue;
                const name = raw.trim();
                if (!name) continue;
                expanded.add(name);

                const match = name.match(elementRegex);
                const base = (match && match[2]) ? match[2].trim() : name;
                if (match && base) {
                    expanded.add(base);
                    seenElementBases.add(base);
                }

                const elements = ambiguousElements.get(base);
                if (!match && elements && elements.length) {
                    elements.forEach((el) => {
                        expanded.add(`${el} ${base}`);
                    });
                }

                if (base === 'Light White Tiger Blade Master') {
                    expanded.add('L.W.T. Blade Master');
                }
                if (name === 'L.W.T. Blade Master') {
                    expanded.add('Light White Tiger Blade Master');
                }
            }

            return {
                expanded: Array.from(expanded),
                elementBases: seenElementBases
            };
        };

        const { expanded, elementBases } = expandDetected(normalized);
        let filtered = Array.from(new Set(expanded.filter((n) => allowedNames.has(n))));

        filtered = normalizeMonsterNames(filtered);
        filtered = fuzzyMatchNames(filtered, validNames, 0.25);

        detectedMonsters = Array.from(new Set(filtered.filter((n) => allowedNames.has(n))));

        const elementRegexDisplay = /^(Fire|Water|Wind|Light|Dark)\s+/i;
        const displayDetected = detectedMonsters.filter((name) => {
            if (elementRegexDisplay.test(name)) return true;
            return !elementBases.has(name);
        });
        console.log(`[Analyzer] Detected ${detectedMonsters.length} distinct monsters.`);

        if (detectedMonsters.length === 0) {
            return { detected: [], matches: [] };
        }

        const matches = await data.findDefensesByMonsters(detectedMonsters);
        console.log(`[Analyzer] Found ${matches.length} buildable defenses.`);

        return {
            detected: displayDetected,
            matches: matches
        };
    }, {
        body: t.Object({
            images: t.Files({ maxItems: 10 })
        })
    })
    .patch('/api/defenses/:id', async ({ params, body, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        // Check ownership: only owner or admin can edit
        const existing = await data.getDefenseById(params.id);
        if (!existing) {
            set.status = 404;
            return { error: 'Defense not found' };
        }
        if (user.role !== 'admin' && existing.submitted_by !== user.id) {
            set.status = 403;
            return { error: 'Sem permissão para editar esta defesa' };
        }

        const { monsters, note, leader_index } = body as any;
        const updated = await data.updateDefense(params.id, {
            monsters,
            note,
            leader_index
        });

        if (!updated) {
            set.status = 404;
            return { error: 'Defense not found' };
        }
        return updated;
    })
    .delete('/api/defenses/:id', async ({ params, headers, set }) => {
        const user = await requireAuth(headers as any, set);
        if (!user) return { error: 'Não autenticado' };

        // Check ownership: only owner or admin can delete
        const existing = await data.getDefenseById(params.id);
        if (!existing) {
            set.status = 404;
            return { error: 'Defense not found' };
        }
        if (user.role !== 'admin' && existing.submitted_by !== user.id) {
            set.status = 403;
            return { error: 'Sem permissão para deletar esta defesa' };
        }

        const deleted = await data.deleteDefenseById(params.id);
        if (!deleted) {
            set.status = 404;
            return { error: 'Defense not found' };
        }
        return { message: 'Defense deleted' };
    })

    // ===== ADMIN-ONLY ROUTES =====

    .delete('/api/defenses', async ({ headers, set }) => {
        const user = await requireAdmin(headers as any, set);
        if (!user) return { error: 'Acesso negado' };

        await data.deleteAllDefenses();
        return { message: 'All defenses cleared' };
    })
    .get('/api/users', async ({ headers, set }) => {
        const user = await requireAdmin(headers as any, set);
        if (!user) return { error: 'Acesso negado' };

        const users = await data.listUsers();
        return { data: users };
    })
    .post('/api/sync/skills', async ({ headers, set }) => {
        const user = await requireAdmin(headers as any, set);
        if (!user) return { error: 'Acesso negado' };

        syncSkills();
        return { message: 'Skills sync started' };
    })
    .post('/api/sync/monsters', async ({ headers, set }) => {
        const user = await requireAdmin(headers as any, set);
        if (!user) return { error: 'Acesso negado' };

        syncMonsters();
        return { message: 'Monsters sync started' };
    })
    .post('/api/sync/defenses', async ({ headers, set }) => {
        const user = await requireAdmin(headers as any, set);
        if (!user) return { error: 'Acesso negado' };

        syncDefenses();
        return { message: 'Defenses sync started' };
    });

app.post('/api/translate/skills', async ({ headers, set }) => {
    const user = await requireAdmin(headers as any, set);
    if (!user) return { error: 'Acesso negado' };

    const skillsToTranslate = await data.getSkillsToTranslate(20);

    if (skillsToTranslate.length === 0) {
        return { message: 'All skills are already translated!', count: 0 };
    }

    console.log(` Translating batch of ${skillsToTranslate.length} skills...`);

    const payload = skillsToTranslate.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description
    }));

    const translatedData = await translateSkills(payload);

    let successCount = 0;
    for (const item of (translatedData as any[])) {
        if (item.name_pt && item.description_pt) {
            await data.updateSkillTranslation(item.id, {
                name_pt: item.name_pt,
                description_pt: item.description_pt
            });
            successCount++;
        }
    }

    console.log(` Successfully translated ${successCount} skills.`);
    return { count: successCount, remaining: await data.countUntranslatedSkills() };
});


const port = process.env.PORT || 3001;
app.listen(port);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} (RESTARTED)`
);
