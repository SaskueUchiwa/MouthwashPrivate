import express from "express";
import { useMiddleware } from "../util/useMiddleware";

export default [
    useMiddleware(express.json()),
    useMiddleware((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Content-Type, Client-ID, Authorization");
        if (req.method === "OPTIONS") {
            return res.status(200).end();
        }
        next()
    })
];