import type { Request, Response, NextFunction } from "express"
import { qualityEvaluationService } from "../services/qualityEvaluation.service"

async function show(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await qualityEvaluationService.getContext(Number(req.params.id)) }) }
    catch (error) { next(error) }
}

async function store(req: Request, res: Response, next: NextFunction) {
    try {
        const data = await qualityEvaluationService.evaluate(Number(req.params.id), req.body, req.user!.sub)
        res.status(201).json({ message: "Evaluación de calidad guardada correctamente", data })
    } catch (error) { next(error) }
}

async function showEdit(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await qualityEvaluationService.getEditContext(Number(req.params.id), req.user!.permissions) }) }
    catch (error) { next(error) }
}

async function update(req: Request, res: Response, next: NextFunction) {
    try {
        const data = await qualityEvaluationService.edit(Number(req.params.id), req.body, req.user!.sub, req.user!.permissions)
        res.json({ message: "Evaluación de calidad corregida correctamente", data })
    } catch (error) { next(error) }
}

export const qualityEvaluationController = { show, store, showEdit, update }
