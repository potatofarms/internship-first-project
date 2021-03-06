// Imports
import * as express from 'express';
import { Sequelize } from 'sequelize';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../../middleware'
import { models } from '../../models/index'
import { isNumber } from 'util';

// Local Constants
const { User, Incident } = models;
const auth = new AuthMiddleware();

export default (app: express.Express): void => {
    const BASE = '/api/users';

    // add user routes
    app.get(BASE, auth.verifyToken, (req: express.Request, res: express.Response) => {

        User.findAll({
            include: [
                {
                    model: Incident,
                    as: 'createdincidents'
                },
                {
                    model: Incident,
                    as: 'trackedincidents'
                }
            ],
            attributes: {
                exclude: [
                    'password',
                    'createdAt',
                    'updatedAt',
                ]
            }
        })
            .then(data => {
                res.status(200).json(data);
            });

    });

    app.get(BASE + '/trackers', auth.verifyToken, (req: express.Request, res: express.Response) => {
        User.findAll({
            where: {
                role: 'tracker'
            },
            attributes: {
                exclude: [
                    'password',
                    'createdAt',
                    'updatedAt',
                ]
            }
        })
            .then(data => {
                res.status(200).json(data);
            })
    });

    // GET /users/:id/createdincidents
    app.get(BASE + '/:id/createdincidents', auth.verifyToken, (req: express.Request, res: express.Response) => {
        if (req.params.id && isNumber(+req.params.id)) {
            User.findOne({
                where: {
                    id: req.params.id
                }
            }).then(user => {
                user.getCreatedincidents({
                    attributes: {
                        exclude: ['userId', 'trackerId', 'lastHistoryId']
                    }
                }).then(incidents => {
                    res.json(incidents);
                });
            });
        } else {
            res.json({
                status: 404,
                auth: true,
                text: `Incident with id: ${req.params.id} not found.`
            });
        }
    });

    // GET /users/:id/trackedincidents
    app.get(BASE + '/:id/trackedincidents', auth.verifyToken, (req: express.Request, res: express.Response) => {
        if (req.params.id && isNumber(+req.params.id)) {
            User.findOne({
                where: {
                    id: req.params.id
                }
            }).then(user => {
                user.getTrackedincidents({
                    attributes: {
                        exclude: ['userId', 'trackerId', 'lastHistoryId']
                    }
                }).then(incidents => {
                    res.json(incidents);
                });
            });
        } else {
            res.json({
                status: 404,
                auth: true,
                text: `Incident with id: ${req.params.id} not found.`
            });
        }
    });

    app.post(BASE + '/authenticate', (req: express.Request, res: express.Response) => {

        User.findOne({
            where: {
                email: req.body.email
            }
        }).then(user => {

            if (user) {
                // Check that the password given in the request matches the decrypted version
                // in the database.
                let pass_equal = bcrypt.compare(req.body.password, user.password).then(same => {
                    if (same) {
                        // Generate a JSON web token using jwt library.
                        let token = auth.generateToken(user);

                        res.json({
                            status: 200,
                            text: "Authenticated.",
                            auth: true,
                            user: {
                                id: user.id,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                role: user.role
                            },
                            token: token
                        });
                    } else {
                        res.json({
                            status: 401,
                            auth: false,
                            text: 'Passwords do not match.'
                        });
                    }
                });
            } else {
                // A user with that email does not exist in the DB.
                res.json({
                    status: 404,
                    text: 'User not found'
                });
            }
        });

    });

};