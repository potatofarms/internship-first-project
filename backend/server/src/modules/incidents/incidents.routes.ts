import * as express from 'express';
import { Sequelize } from 'sequelize';
import { models } from '../../models/index'
import { isNumber } from 'util';
import { AuthMiddleware } from '../../middleware';

const { User, Incident, IncidentHistory } = models;
const auth = new AuthMiddleware();

export default (app: express.Express): void => {
    const BASE = '/incidents';

    // GET /incidents
    app.get(BASE, auth.verifyToken, (req: express.Request, res: express.Response) => {
        Incident.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email', 'role']
            },
            {
                model: User,
                as: 'tracker',
                attributes: ['id', 'firstName', 'lastName', 'email', 'role']
            },
            {
                model: IncidentHistory,
                as: 'incidenthistory',
                attributes: {
                    exclude: ['incidentId',]
                }
            }],
            attributes: {
                exclude: ['userId', 'trackerId', 'lastHistoryId']
            }
        }).then(data => {
            res.status(200).json(data);
        });
    });

    // POST /incidents
    app.post(BASE, auth.verifyToken, (req: express.Request, res: express.Response) => {
        models.sequelize.transaction({
            isolationLevel: models.Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        }).then(function (t) {
            return IncidentHistory.create({
                name: req.body.name,
                incidentId: null,
                type: req.body.type,
                revision: 1,
                description: req.body.description,
                cost: req.body.cost,
                classification: req.body.classification,
                resolution: req.body.resolution,
                cafReference: req.body.cafReference
            }, { transaction: t })
                .then(function (history) {
                    return Incident.create({
                        userId: req.body.userId,
                        trackerId: req.body.trackerId,
                        lastHistoryId: history.id
                    }, { transaction: t })
                        .then(function (incident) {
                            history.incidentId = incident.id;
                            return history.save({ transaction: t }).then(_ => {
                                return t.commit()
                                    .then(() => {
                                        return res.status(200).json({
                                            status: 200,
                                            text: `Successfully created incident with id ${incident.id}.`
                                        });
                                    });
                            });
                        })
                        .catch(err => {
                            if (err) {
                                console.error('Encountered an error creating a new incident:', err);
                            }
                            return t.rollback()
                                .then(() => {
                                    return res.status(400).json({
                                        status: 400,
                                        auth: true,
                                        text: `Encountered an error creating a new incident. ${err}`
                                    })
                                });
                        });
                })
                .catch(err => {
                    if (err) {
                        console.error('Encountered an error creating a new incidenthistory:', err);
                    }
                    return t.rollback()
                        .then(() => {
                            return res.status(400).json({
                                status: 400,
                                auth: true,
                                text: `Encountered an error creating a new incident. ${err}`
                            })
                        });
                });
        })
            .catch(function (err) {
                if (err) {
                    console.error('Encountered an error commiting transaction:', err);
                    return res.status(500).json({
                        status: 500,
                        text: 'An error occurred creating a new incident. Please try again.'
                    });
                }
            });

    });

    // GET /incidents/:id
    app.get(BASE + '/:id', auth.verifyToken, (req: express.Request, res: express.Response) => {
        if (req.params.id && isNumber(+req.params.id)) {
            models.Incident.findOne({
                where: { id: req.params.id },
                include: [
                    {
                        as: 'user',
                        model: User,
                        attributes: {
                            exclude: ['password', 'createdAt', 'updatedAt']
                        }
                    }
                ],
                attributes: {
                    exclude: ['userId', 'trackerId', 'lastHistoryId']
                }
            }).then(incident => {
                res.status(200).json(incident);
            });
        } else {
            res.status(404).json({
                status: 404,
                text: `Incident with id: ${req.params.id} not found.`
            });
        }
    });
}


/*
 return IncidentHistory.create({
                name: req.body.name,
                incidentId: null,
                type: req.body.type,
                revision: 1,
                description: req.body.description,
                cost: req.body.cost,
                classification: req.body.classification,
                resolution: req.body.resolution,
                cafReference: req.body.cafReference
            }, { transaction: t })
                .then(history => {
                    history.setIncident({
                        userId: req.body.userId,
                        trackerId: req.body.trackerId,
                        lastHistoryId: history.id
                    }, { transaction: t })
                        .then(incident => {
                            history.incidentId = incident.id;
                            history.save().then(_ => { });
                        })
                        .catch(err => {
                            if (err) {
                                console.error('An error occurred:', err);
                            }
                        });
                    // Incident.create({
                    //     userId: req.body.userId,
                    //     trackerId: req.body.trackerId,
                    //     lastHistoryId: history.id
                    // }, { transaction: t })
                    //     .then(incident => {
                    //         history.incidentId = incident.id;
                    //         history.save({ transaction: t }).then(_ => {
                    //             res.status(200).json({
                    //                 status: 200,
                    //                 text: `Successfully created incident with id: ${incident.id}.`
                    //             });
                    //         });
                    //     })
                    //     .catch(err => {
                    //         if (err) {
                    //             console.error('Encountered an error creating a new incident:', err);
                    //         }
                    //     });
                })
                .catch(err => {
                    if (err) {
                        console.error('Encountered an error creating a new incidenthistory:', err);
                    }
                });
*/