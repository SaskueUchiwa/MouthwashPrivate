import * as mediator from "mouthwash-mediator";
import { BaseRoute } from "../../../routes/BaseRoute";
import { Unauthorized } from "../../../errors";
import { InternalController } from "../../../controllers";

export class SessionsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/internal/users/:user_id/sessions/:ip")
    @mediator.Middleware(InternalController.validateInternalAccess)
    async getUserSession(transaction: mediator.Transaction<{ user_id: string; ip: string; }>) {
        const { user_id, ip } = transaction.getParams();
        const session = await this.server.sessionsController.getConnectionSession(user_id, ip);
        if (session === undefined) throw new Unauthorized();
        
        transaction.respondJson(session);
    }
}