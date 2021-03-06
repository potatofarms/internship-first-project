import * as express from 'express';
import { Sequelize } from 'sequelize';
import { models } from '../../models/index'
import { isNumber } from 'util';
import { AuthMiddleware } from '../../middleware';

const { User, Incident, IncidentHistory } = models;
const auth = new AuthMiddleware();

export default (app: express.Express): void => {
    const BASE = '/api/incidenthistory';

    // GET /incidenthistory
    app.get(BASE, auth.verifyToken, (req: express.Request, res: express.Response) => {
        IncidentHistory.findAll().then(items => {
            return res.status(200).json(items);
        })
    });

    app.get(BASE + '/:id', auth.verifyToken, (req: express.Request, res: express.Response) => {
        IncidentHistory.findAll({
            where: {
                incidentId: req.params.id
            }
        })
            .then(items => {
                return res.status(200).json(items);
            });
    });
}