import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../BaseRoute";

export class BundlesRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/bundles")
    async getAllAvailableBundles(transaction: mediator.Transaction<{}>) {
        const available = await this.server.cosmeticsController.getAllAvailableBundles();
        transaction.respondJson(available);
    }
}